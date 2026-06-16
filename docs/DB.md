# Invoice Generator — Database Schema (Supabase / Postgres)

> This document defines the Postgres schema for the Invoice Generator, including
> tables, types, constraints, indexes, Row-Level Security (RLS), Storage
> policies, triggers, and the per-user invoice-numbering approach. It implements
> the decisions in `PRD.md` and `Tech.md`.
>
> **Conventions** (Supabase / Postgres best practices):
> - Lowercase `snake_case` identifiers.
> - Every table has a primary key.
> - Foreign keys are indexed.
> - Money stored as `numeric(14, 2)`; rates as `numeric(6, 3)`.
> - `created_at` / `updated_at` are `timestamptz`, defaulting to `now()`.
> - RLS enabled on every application table; access scoped to `auth.uid()`.

---

## 1. Overview

| Table | Purpose | Owner column |
| --- | --- | --- |
| `profiles` | 1:1 with `auth.users`; sender details, Stripe Connect state, per-user invoice counter | `id` (= `auth.users.id`) |
| `clients` | Freelancer's clients | `user_id` |
| `invoices` | Invoice header, snapshots, totals, Stripe + PDF + send metadata | `user_id` |
| `invoice_items` | Line items belonging to an invoice | via `invoices.user_id` |

Enums: `invoice_status` (`paid`, `not_paid`), `invoice_unit_type` (`hours`,
`flat`).

**Money & currency:** currency is stored **per invoice** in `invoices.currency`
(ISO 4217 code). There are **no mixed-currency invoices**; line items inherit the
invoice's currency. Amounts use `numeric(14, 2)`.

---

## 2. Extensions & Enums

```sql
-- UUID generation (Supabase provides gen_random_uuid via pgcrypto)
create extension if not exists pgcrypto;

-- Invoice status: only paid / not paid (no draft)
create type public.invoice_status as enum ('paid', 'not_paid');

-- Line-item unit type: display/label only (math is always quantity * price)
create type public.invoice_unit_type as enum ('hours', 'flat');
```

---

## 3. Tables

### 3.1 `profiles`

One row per authenticated user. `id` is both the primary key and a foreign key
to `auth.users.id`. All sender fields are nullable (optional). Holds Stripe
Connect state and the **per-user sequential invoice counter** (`invoice_seq`).

```sql
create table public.profiles (
  id                 uuid        primary key references auth.users (id) on delete cascade,

  -- Sender / "From" details (all optional)
  full_name          text,
  company_name       text,
  email              text,
  address            text,
  vat_id             text,
  website            text,

  -- Stripe Connect (Express) state
  stripe_account_id  text,
  charges_enabled    boolean     not null default false,

  -- Per-user sequential invoice counter (atomic source for invoice numbers)
  invoice_seq        integer     not null default 0,

  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),

  constraint profiles_invoice_seq_nonneg check (invoice_seq >= 0)
);
```

### 3.2 `clients`

Clients owned by a user. All descriptive fields are nullable.

```sql
create table public.clients (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references auth.users (id) on delete cascade,

  -- All optional
  full_name    text,
  company_name text,
  email        text,
  address      text,
  vat_id       text,

  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
```

### 3.3 `invoices`

Invoice header. Stores **frozen snapshots** of sender and client details as
JSONB so historical invoices never change when the profile/client is edited or a
client is deleted. `client_id` is a nullable FK with **`ON DELETE SET NULL`**
(clients may be deleted; the snapshot is kept).

```sql
create table public.invoices (
  id                        uuid           primary key default gen_random_uuid(),
  user_id                   uuid           not null references auth.users (id) on delete cascade,

  -- Per-user, year-prefixed sequential number, e.g. INV-2026-0001
  invoice_number            text           not null,

  -- Optional link to the live client; snapshot is the source of truth on the invoice
  client_id                 uuid           references public.clients (id) on delete set null,

  -- Frozen copies taken at creation time
  sender_snapshot           jsonb          not null,
  client_snapshot           jsonb          not null,

  invoice_date              date           not null default current_date,
  due_date                  date           not null default (current_date + interval '14 days'),

  -- ISO 4217 currency code; exactly one currency per invoice
  currency                  text           not null,

  status                    public.invoice_status not null default 'not_paid',

  -- Computed money totals (server is source of truth)
  subtotal                  numeric(14, 2) not null default 0,
  tax                       numeric(14, 2) not null default 0,
  total                     numeric(14, 2) not null default 0,

  -- Free-text footer
  comments                  text,

  -- Stripe (per-invoice payment)
  stripe_checkout_session_id text,
  stripe_payment_link_url    text,
  stripe_payment_status      text,

  -- PDF in private Storage bucket
  pdf_path                  text,          -- logical path / object key
  pdf_storage_path          text,          -- fully-qualified storage path (bucket/key)

  -- Send / resend tracking
  last_sent_at              timestamptz,

  created_at                timestamptz    not null default now(),
  updated_at                timestamptz    not null default now(),

  -- Invoice numbers are unique per user
  constraint invoices_user_number_uniq unique (user_id, invoice_number),

  -- Currency is a fixed shortlist; exactly one per invoice
  constraint invoices_currency_allowed
    check (currency in ('EUR', 'USD', 'GBP', 'CHF', 'CAD', 'AUD', 'JPY')),

  -- Money sanity
  constraint invoices_amounts_nonneg
    check (subtotal >= 0 and tax >= 0 and total >= 0),

  -- Due date should not precede the invoice date
  constraint invoices_due_after_invoice
    check (due_date >= invoice_date)
);
```

**Snapshot JSONB shape** (informational):

```jsonc
// sender_snapshot
{ "full_name": "...", "company_name": "...", "email": "...",
  "address": "...", "vat_id": "...", "website": "..." }

// client_snapshot
{ "full_name": "...", "company_name": "...", "email": "...",
  "address": "...", "vat_id": "..." }
```

### 3.4 `invoice_items`

Line items, deleted with their parent invoice (`ON DELETE CASCADE`). Unit type is
label-only; math is always `quantity * unit_price`. VAT is a free numeric
percentage per line. Line totals are **derived** and stored as **generated
columns** to keep them consistent with the inputs.

```sql
create table public.invoice_items (
  id            uuid           primary key default gen_random_uuid(),
  invoice_id    uuid           not null references public.invoices (id) on delete cascade,

  description   text           not null default '',
  quantity      numeric(14, 3) not null default 0,
  unit_type     public.invoice_unit_type not null default 'flat',  -- display label only
  unit_price    numeric(14, 2) not null default 0,
  vat_rate      numeric(6, 3)  not null default 0,                 -- percent, e.g. 20.000

  -- Derived line totals (tax-exclusive: VAT added on top)
  line_subtotal numeric(14, 2) generated always as
                  (round(quantity * unit_price, 2)) stored,
  line_tax      numeric(14, 2) generated always as
                  (round(quantity * unit_price * vat_rate / 100, 2)) stored,
  line_total    numeric(14, 2) generated always as
                  (round(quantity * unit_price, 2)
                   + round(quantity * unit_price * vat_rate / 100, 2)) stored,

  position      integer        not null default 0,  -- ordering within the invoice

  created_at    timestamptz    not null default now(),

  constraint invoice_items_quantity_nonneg  check (quantity >= 0),
  constraint invoice_items_unit_price_nonneg check (unit_price >= 0),
  constraint invoice_items_vat_rate_range    check (vat_rate >= 0 and vat_rate <= 100)
);
```

> **Invoice totals** (`invoices.subtotal/tax/total`) are computed server-side
> from the items and persisted on the invoice header (so list views and PDFs
> read a single authoritative number). They equal `Σ line_subtotal`,
> `Σ line_tax`, and `subtotal + tax` respectively.

---

## 4. Indexes

Foreign keys and common query paths are indexed.

```sql
-- Clients
create index clients_user_id_idx        on public.clients (user_id);

-- Invoices: ownership + frequent filters/sorts
create index invoices_user_status_idx   on public.invoices (user_id, status);
create index invoices_user_created_idx  on public.invoices (user_id, created_at desc);
create index invoices_client_id_idx     on public.invoices (client_id);

-- Invoice items: FK lookup + ordering
create index invoice_items_invoice_id_idx on public.invoice_items (invoice_id);
create index invoice_items_invoice_pos_idx on public.invoice_items (invoice_id, position);
```

---

## 5. Per-User Sequential Invoice Numbering

**Requirement:** per-user, sequential, year-prefixed (`INV-2026-0001`),
generated **atomically**, never entered by the user.

**Approach:** keep a counter column **`invoice_seq` on `profiles`** (rather than a
global Postgres sequence, which is shared across all users and would leak gaps /
not reset per user). A `SECURITY DEFINER` function increments it atomically using
`UPDATE ... RETURNING`, which takes a row lock on that user's profile so
concurrent inserts are serialized and **gap-free per user**. The year prefix is
taken from the provided invoice date (defaults to the current year).

> Trade-off note: a strictly monotonic, gap-free per-user counter is simple and
> matches the spec. If a future requirement allows per-year reset of the numeric
> part, store `(year, seq)` instead and reset `seq` when the year changes; the
> spec here keeps a single ever-increasing per-user counter, zero-padded to 4.

```sql
create or replace function public.next_invoice_number(p_year integer default null)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seq  integer;
  v_year integer := coalesce(p_year, extract(year from current_date)::integer);
begin
  -- Atomic increment under the caller's profile row lock
  update public.profiles
     set invoice_seq = invoice_seq + 1,
         updated_at  = now()
   where id = auth.uid()
  returning invoice_seq into v_seq;

  if v_seq is null then
    raise exception 'No profile found for current user';
  end if;

  return 'INV-' || v_year::text || '-' || lpad(v_seq::text, 4, '0');
end;
$$;

revoke all on function public.next_invoice_number(integer) from public;
grant execute on function public.next_invoice_number(integer) to authenticated;
```

Usage (in a server action / RPC, inside the invoice-creation transaction):

```sql
-- v_number := select public.next_invoice_number(extract(year from :invoice_date)::int);
-- insert into public.invoices (..., invoice_number) values (..., v_number);
```

---

## 6. Triggers

### 6.1 Auto-create a profile on new auth user

```sql
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- This function should only ever run via the auth trigger above, never as an
-- RPC. Revoke execute from client/API roles so it cannot be called directly.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
```

### 6.2 `updated_at` maintenance

```sql
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger clients_set_updated_at
  before update on public.clients
  for each row execute function public.set_updated_at();

create trigger invoices_set_updated_at
  before update on public.invoices
  for each row execute function public.set_updated_at();
```

> **Hardening note:** `set search_path = public` pins the function's schema
> resolution so it cannot be hijacked by a mutable `search_path` (Supabase
> advisor `function_search_path_mutable`). This keeps it consistent with the
> other functions in this doc.

---

## 7. Row-Level Security (RLS)

Enable RLS on every application table and scope all access to the authenticated
user. `profiles` is keyed by `id = auth.uid()`; `clients` and `invoices` by
`user_id = auth.uid()`; `invoice_items` are reached through their parent
invoice's ownership.

> **RLS performance note (`auth_rls_initplan`):** all policies call the auth
> function as `(select auth.uid())` rather than a bare `auth.uid()`. Wrapping it
> in a scalar subquery lets Postgres evaluate it **once per query** (as an
> InitPlan) instead of **once per row**, which is the Supabase-recommended
> pattern and avoids a large performance hit on big tables. See
> [Call functions with `select`](https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select).

```sql
alter table public.profiles      enable row level security;
alter table public.clients       enable row level security;
alter table public.invoices      enable row level security;
alter table public.invoice_items enable row level security;
```

### 7.1 `profiles`

```sql
create policy profiles_select_own on public.profiles
  for select using (id = (select auth.uid()));

create policy profiles_insert_own on public.profiles
  for insert with check (id = (select auth.uid()));

create policy profiles_update_own on public.profiles
  for update using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- No delete policy: profiles are removed via auth.users cascade.
```

### 7.2 `clients`

```sql
create policy clients_select_own on public.clients
  for select using (user_id = (select auth.uid()));

create policy clients_insert_own on public.clients
  for insert with check (user_id = (select auth.uid()));

create policy clients_update_own on public.clients
  for update using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy clients_delete_own on public.clients
  for delete using (user_id = (select auth.uid()));
```

### 7.3 `invoices`

```sql
create policy invoices_select_own on public.invoices
  for select using (user_id = (select auth.uid()));

create policy invoices_insert_own on public.invoices
  for insert with check (user_id = (select auth.uid()));

create policy invoices_update_own on public.invoices
  for update using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy invoices_delete_own on public.invoices
  for delete using (user_id = (select auth.uid()));
```

> **Lifecycle note (enforced in application / optional trigger):** invoices may
> be **edited or deleted only while `status = 'not_paid'`**; paid invoices are
> locked. This can be additionally guarded with a `before update`/`before delete`
> trigger that raises when `old.status = 'paid'`.

### 7.4 `invoice_items` (ownership via parent invoice)

```sql
create policy invoice_items_select_own on public.invoice_items
  for select using (
    exists (
      select 1 from public.invoices i
      where i.id = invoice_items.invoice_id
        and i.user_id = (select auth.uid())
    )
  );

create policy invoice_items_insert_own on public.invoice_items
  for insert with check (
    exists (
      select 1 from public.invoices i
      where i.id = invoice_items.invoice_id
        and i.user_id = (select auth.uid())
    )
  );

create policy invoice_items_update_own on public.invoice_items
  for update using (
    exists (
      select 1 from public.invoices i
      where i.id = invoice_items.invoice_id
        and i.user_id = (select auth.uid())
    )
  ) with check (
    exists (
      select 1 from public.invoices i
      where i.id = invoice_items.invoice_id
        and i.user_id = (select auth.uid())
    )
  );

create policy invoice_items_delete_own on public.invoice_items
  for delete using (
    exists (
      select 1 from public.invoices i
      where i.id = invoice_items.invoice_id
        and i.user_id = (select auth.uid())
    )
  );
```

---

## 8. Storage: Private PDF Bucket Policies

PDFs live in a **private** bucket (e.g. `invoices`). Objects are keyed under the
owner's user id (e.g. `"<auth.uid()>/<invoice_id>.pdf"`), so the first path
segment identifies the owner. Clients receive files only via **short-lived signed
URLs**; emails attach bytes directly.

```sql
-- Create a private bucket (public = false)
insert into storage.buckets (id, name, public)
values ('invoices', 'invoices', false)
on conflict (id) do nothing;

-- Owner-only access: first folder of the object name must equal auth.uid()
create policy invoices_storage_select_own on storage.objects
  for select using (
    bucket_id = 'invoices'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy invoices_storage_insert_own on storage.objects
  for insert with check (
    bucket_id = 'invoices'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy invoices_storage_update_own on storage.objects
  for update using (
    bucket_id = 'invoices'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  ) with check (
    bucket_id = 'invoices'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy invoices_storage_delete_own on storage.objects
  for delete using (
    bucket_id = 'invoices'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
```

> As with the table policies above, the storage policies call
> `(select auth.uid())` so the auth function is evaluated once per query rather
> than per row (`auth_rls_initplan`).

> The webhook/server uses the **service-role key** for trusted operations and is
> not subject to these RLS policies; keep that key server-only.

---

## 9. Entity Relationships

```
auth.users 1───1 profiles            (profiles.id = auth.users.id)
auth.users 1───* clients             (clients.user_id)
auth.users 1───* invoices            (invoices.user_id)
clients    1───* invoices            (invoices.client_id, ON DELETE SET NULL)
invoices   1───* invoice_items       (invoice_items.invoice_id, ON DELETE CASCADE)
```

- Deleting a **client** keeps its invoices (FK set null; `client_snapshot`
  retained).
- Deleting an **invoice** (only allowed while `not_paid`) cascades to its
  `invoice_items`; the application also removes the PDF object and deactivates
  the Stripe link.
- Deleting an **auth user** cascades to `profiles`, `clients`, and `invoices`.

---

## 10. Summary

- **Money:** `numeric(14, 2)`; **rates/quantities:** `numeric(6, 3)` /
  `numeric(14, 3)`; rounded to 2 decimals.
- **Currency** is stored per invoice and constrained to a fixed shortlist; no
  mixed-currency invoices.
- **Snapshots** (`sender_snapshot`, `client_snapshot`) guarantee historical
  invoices never change.
- **Numbering** is per-user, year-prefixed, atomic via
  `next_invoice_number()` backed by `profiles.invoice_seq`.
- **RLS** on all tables + **private Storage** policies enforce per-user data
  ownership (`auth.uid()`).
- **Triggers** auto-create a profile on signup and maintain `updated_at`.
- **Indexes** cover all foreign keys and common list filters/sorts.

---

## 11. Advisor Refinements & Live-DB Divergence

This doc has been updated to fold in the hardening recommendations surfaced by
Supabase's database advisors after the initial migration:

1. **`auth_rls_initplan`** — all RLS table policies (section 7) and storage
   policies (section 8) call `(select auth.uid())` instead of a bare
   `auth.uid()`.
2. **`function_search_path_mutable`** — `set_updated_at()` (section 6.2) now sets
   `search_path = public`, matching the other functions.
3. **`security_definer_function_executable`** — `handle_new_user()` (section 6.1)
   has its execute privilege revoked from `public`, `anon`, and `authenticated`
   so it can only run via the auth trigger.

> **⚠️ Live-DB divergence:** the live Supabase project was applied with the
> **original (pre-refinement)** SQL from the prior version of this doc. The
> refinements above are reflected **in this document only** — they have **not**
> yet been applied to the live database. A follow-up migration is needed to sync
> the live schema with this doc.
