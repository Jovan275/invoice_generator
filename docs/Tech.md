# Invoice Generator — Architecture & Technical Implementation

> This document describes **how** the Invoice Generator is implemented: the
> stack, the services, and how the pieces fit together. For product scope see
> `PRD.md`; for the database schema see `DB.md`.

---

## 0. Important: Non-Standard Next.js

This project pins **Next.js `16.2.9`**. Per the repository rule (`AGENTS.md`),
this is **not the Next.js found in most training data** — APIs, conventions, and
file structure may differ, and there may be breaking changes.

**Before implementing any Next.js-specific feature** (route handlers, server
actions, `cookies()`/`headers()`, caching, middleware, `params`/`searchParams`
shapes, metadata, etc.), **read the relevant guide in
`node_modules/next/dist/docs/`** and heed any deprecation notices. Do not assume
behavior from older Next.js versions.

---

## 1. High-Level Architecture

```
┌───────────────────────────────────────────────────────────────┐
│                     Next.js 16 (App Router)                     │
│                                                                 │
│  Server Components ──┐                                          │
│  Client Components   │   UI: shadcn/ui + Tailwind CSS v4        │
│  Server Actions  ────┼──► mutations (profile, clients,          │
│  Route Handlers  ────┤      invoices, send/resend)              │
│  Middleware (session)│                                          │
└───────┬──────────────┴───────────┬───────────────┬─────────────┘
        │                          │               │
        ▼                          ▼               ▼
┌───────────────┐        ┌──────────────────┐  ┌───────────────┐
│   Supabase    │        │  Stripe Connect  │  │    Resend     │
│  Auth         │        │  (Express)       │  │  (email)      │
│  Postgres+RLS │        │  Onboarding,     │  │  send + BCC   │
│  Storage (PDF)│◄──────►│  Checkout, webhk │  │  + reply-to   │
└───────────────┘        └──────────────────┘  └───────────────┘
                                  ▲
                                  │ webhooks (payment, account.updated)
                          ┌───────┴────────┐
                          │ Next.js route  │
                          │ handler (portable)
                          └────────────────┘
        ▲
        │  @react-pdf/renderer (server-side PDF generation)
        └─────────────────────────────────────────────────────
```

**Responsibilities:**

- **Next.js App Router (frontend + backend)** — renders all pages, hosts
  **Server Actions** for mutations and **Route Handlers** for webhooks and other
  endpoints. Middleware refreshes the Supabase auth session on each request.
- **Supabase** — Authentication (email + password), Postgres database (with
  Row-Level Security), and private Storage for PDFs.
- **Stripe Connect (Express)** — payment onboarding per user, direct charges on
  the connected account, per-invoice Checkout Sessions, and webhooks.
- **Resend** — transactional email (send invoice + resend) from a verified
  domain, with the PDF attached.
- **@react-pdf/renderer** — server-side PDF generation for each invoice.

---

## 2. Current State of the Codebase

This reflects an actual reading of the repository.

### 2.1 Already installed / scaffolded

**Runtime dependencies** (`package.json`):

| Package | Version | Purpose |
| --- | --- | --- |
| `next` | `16.2.9` | App Router framework (non-standard — read local docs) |
| `react` / `react-dom` | `19.2.4` | React runtime |
| `@supabase/ssr` | `^0.12.0` | Supabase SSR cookie/session helpers |
| `@supabase/supabase-js` | `^2.108.1` | Supabase client SDK |
| `resend` | `^6.12.4` | Email sending SDK |
| `radix-ui` | `^1.5.0` | Headless UI primitives (shadcn base) |
| `@remixicon/react` | `^4.9.0` | Icon library (configured in `components.json`) |
| `class-variance-authority` | `^0.7.1` | Variant styling helper |
| `clsx` | `^2.1.1` | Conditional class names |
| `tailwind-merge` | `^3.6.0` | Tailwind class merging |
| `tw-animate-css` | `^1.4.0` | Tailwind animation utilities |

**Dev dependencies:**

| Package | Version | Purpose |
| --- | --- | --- |
| `tailwindcss` | `^4` | Tailwind CSS v4 |
| `@tailwindcss/postcss` | `^4` | Tailwind v4 PostCSS plugin |
| `shadcn` | `^4.11.0` | shadcn/ui CLI |
| `eslint` / `eslint-config-next` | `^9` / `16.2.9` | Linting |
| `typescript` | `^5` | TypeScript |
| `@types/node` / `@types/react` / `@types/react-dom` | `^20` / `^19` / `^19` | Types |

**Scaffolded code & config:**

- **Supabase helpers** under `utils/supabase/`:
  - `client.ts` — `createBrowserClient` (browser).
  - `server.ts` — `createServerClient` bound to `cookies()` (Server Components /
    Actions).
  - `middleware.ts` — `createServerClient` wired to request/response cookies and
    calls `supabase.auth.getUser()` to refresh the session.
  - These read `NEXT_PUBLIC_SUPABASE_URL` and
    `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- **Root middleware** (`middleware.ts`) delegates to the Supabase middleware
  helper, with a matcher excluding static assets.
- **Resend helpers** under `utils/resend/`:
  - `client.ts` — lazily constructed `Resend` client (server-only).
  - `email.ts` — `sendEmail()` supporting `to`, `subject`, `html`, `from`, `cc`,
    `replyTo`, and `attachments`; reads `RESEND_API_KEY` and `RESEND_FROM_EMAIL`
    (falls back to `onboarding@resend.dev`).
  - `index.ts` — barrel exports.
- **UI**: `lib/utils.ts` (`cn()` helper), `components.json` configured for
  shadcn (style `radix-vega`, base color `olive`, icon library `remixicon`,
  aliases for `@/components`, `@/components/ui`, `@/lib`, `@/hooks`). Only
  **one** UI component exists so far: `components/ui/button.tsx`.
- **App shell**: `app/layout.tsx` (fonts + base layout) and `app/page.tsx`.
- **TypeScript**: `tsconfig.json` with `@/*` path alias and `strict` mode.

**Placeholder to remove:** `app/page.tsx` currently queries a **`todos`** table
— this is leftover scaffold and must be replaced by the real landing/auth-entry
and dashboard flow. The `todos` table is **not** part of the real schema.

### 2.2 To be added (required by the spec, not yet installed)

| Need | Suggested package(s) | Notes |
| --- | --- | --- |
| Stripe server SDK | `stripe` | Connect onboarding, Checkout Sessions, webhooks |
| Stripe browser SDK | `@stripe/stripe-js` | Client-side redirect to Checkout/onboarding (as needed) |
| PDF generation | `@react-pdf/renderer` | Server-side invoice PDFs |
| Schema validation | `zod` | Validate form input / server-action payloads |
| Form handling | `react-hook-form` + `@hookform/resolvers` | shadcn form pattern with zod resolver |
| shadcn components | (via `shadcn` CLI / MCP) | `input`, `form`, `select`, `table`, `dialog`, `card`, etc. — only `button` exists |

> When adding UI primitives, use the shadcn MCP to check availability and pull
> the latest, and respect the existing `components.json` preset (style
> `radix-vega`, base color `olive`, remixicon). Prefer existing
> `@/components/ui/*` before creating custom UI.

---

## 3. Implementation by Concern

### 3.1 Authentication (Supabase Auth)
- **Email + password**, **no email confirmation**, plus **forgot-password
  reset** — all via Supabase Auth.
- Use the existing helpers:
  - Browser flows (sign up / sign in / reset) via `utils/supabase/client.ts`.
  - Server reads/mutations via `utils/supabase/server.ts` (bound to `cookies()`).
- **Session handling**: the root `middleware.ts` already calls the Supabase
  middleware helper, which refreshes the session on every matched request. Keep
  protected routes guarded by checking `supabase.auth.getUser()` server-side and
  redirecting unauthenticated users to `/login`.
- **Forgot password**: trigger `resetPasswordForEmail` with a redirect to an
  in-app "set new password" page that calls `updateUser`.

### 3.2 Profile & Sender Details
- One `profiles` row per auth user (auto-created by a DB trigger — see `DB.md`).
- CRUD via Server Actions writing to `profiles` (RLS scoped to `auth.uid()`).
- On invoice creation, profile fields are **copied (snapshotted)** into the
  invoice's `sender_snapshot` JSONB.

### 3.3 Client Management
- `clients` rows owned by the user (`user_id = auth.uid()`), all fields nullable.
- Full CRUD via Server Actions. Client list uses a shadcn `table`; add/edit via a
  form (`react-hook-form` + `zod`).
- Deleting a client is allowed; invoices keep their `client_snapshot` and their
  `client_id` FK is set to `NULL` (`ON DELETE SET NULL`).

### 3.4 Invoice Creation & Atomic Per-User Numbering
- **Numbering** is **per-user, sequential, year-prefixed** (`INV-2026-0001`).
- Generated **atomically** using a per-user counter on `profiles`
  (`invoice_seq`), incremented inside a Postgres function (e.g.
  `next_invoice_number()`) that does an atomic `UPDATE ... RETURNING` under the
  user's row lock, then formats `INV-<year>-<zero-padded seq>`. See `DB.md` for
  the function and rationale (avoids gaps from client races).
- The invoice + its line items are inserted in one transaction (RPC / server
  action). On creation, `sender_snapshot` and `client_snapshot` are frozen.
- Defaults: `invoice_date = today`, `due_date = today + 14 days`. Status starts
  at **`not_paid`** (no draft state).

### 3.5 Tax & Total Calculations
- Per line: `line_amount = quantity * unit_price` (unit type is a **label
  only**).
- Per line VAT: `line_vat = line_amount * vat_rate / 100` (tax-exclusive).
- `subtotal = Σ line_amount`, `tax = Σ line_vat`, `total = subtotal + tax`.
- All money rounded to **2 decimals**; numbers/dates formatted by the locale
  appropriate to the selected currency (e.g. `Intl.NumberFormat`).
- Compute on the server when persisting (source of truth) and mirror in the UI
  for live preview.

### 3.6 PDF Generation & Private Storage
- Generated **server-side** with **`@react-pdf/renderer`** in a Server Action /
  Route Handler, using a **fixed layout** (no logo/branding).
- **Regenerated on every edit** so the stored PDF always matches the invoice.
- Stored in a **private Supabase Storage bucket** (e.g. `invoices`) with RLS, at
  a path keyed by user and invoice (e.g. `<user_id>/<invoice_id>.pdf`).
- Access via **short-lived signed URLs** (`createSignedUrl`). The "Send" email
  attaches the PDF **bytes directly** (not just a link).
- On hard-delete of a not-paid invoice, the PDF object is removed from Storage.

### 3.7 Stripe Connect (Express) — Payments
- **Onboarding**: each user gets a connected account
  (`stripe.accounts.create({ type: "express" })`), stored as
  `profiles.stripe_account_id`. Onboarding uses an **Account Link**
  (Stripe-hosted flow). Sending/collecting is blocked until
  `profiles.charges_enabled = true`.
- **Charge model**: **direct charges on the connected account**, **no platform
  fee** (use the `Stripe-Account` header / `stripeAccount` option for the
  connected account; no `application_fee_amount`). Payouts go to the user's bank.
- **Per-invoice payment**: a **Checkout Session** for the exact `total` +
  `currency` of the invoice; store `stripe_checkout_session_id` and the payment
  URL on the invoice.
- **Link regeneration / deactivation rules**:
  - Editing a **not-paid** invoice in a way that **changes the total**
    invalidates the old link/session and generates a new one.
  - **Manually marking paid** deactivates/expires the Stripe link.
  - **Hard-deleting** a not-paid invoice deactivates its link.
- **Webhooks** (see 3.9): on successful payment, flip invoice status to `paid`
  (no extra confirmation email). Also handle `account.updated` to keep
  `charges_enabled` / onboarding state in sync.

### 3.8 Email (Resend) — Send & Resend
- Use the existing `sendEmail()` helper.
- **From**: a verified app domain (`RESEND_FROM_EMAIL`).
- **To**: the client's email (from the invoice/client snapshot).
- **Reply-To**: the user's profile email.
- **BCC**: the sending user (via `cc`/bcc option) so they retain a copy.
  > Note: the current `sendEmail()` exposes `cc`/`replyTo`; add a `bcc` field to
  > `SendEmailParams` to BCC the sending user as specified.
- **Body**: a short message + the Stripe payment link. **PDF attached** as bytes.
- **Resend-on-edit confirmation**: track `last_sent_at` on the invoice. When an
  **already-sent** invoice is edited and saved, show a **"Resend to client?"**
  confirmation (shadcn `dialog`); **never auto-resend** without confirmation.

### 3.9 Webhook Handling (Portable Route Handler)
- Implemented as a **Next.js Route Handler** (e.g.
  `app/api/stripe/webhook/route.ts`) that:
  - Reads the **raw request body** and verifies the **Stripe signature** with
    `STRIPE_WEBHOOK_SECRET`.
  - Handles `checkout.session.completed` (and/or `payment_intent.succeeded`) →
    mark the matching invoice `paid`, deactivate its link.
  - Handles `account.updated` → update `profiles.charges_enabled` /
    onboarding state.
  - Performs DB writes using the **service-role** Supabase client (webhooks have
    no user session — RLS is bypassed via service role; keep this key
    server-only).
- Built to be **portable** (works on Vercel or self-host). See **§5**.

---

## 4. Security: RLS & Storage Policies

- **Row-Level Security** is enabled on **all** application tables. Every policy
  scopes access to `user_id = auth.uid()` (and `profiles.id = auth.uid()`), so a
  user can only read/write their own rows. `invoice_items` are reached via their
  parent invoice's ownership. See `DB.md` for exact policies.
- **Storage**: the PDF bucket is **private**. Bucket policies restrict
  `select`/`insert`/`update`/`delete` to objects under the user's own prefix
  (e.g. first path segment = `auth.uid()`). Clients receive files only via
  **short-lived signed URLs**, and emails attach bytes directly.
- The **service-role key** is used only in trusted server contexts (webhooks)
  and must never be exposed to the browser.

---

## 5. Open Item: Hosting & Webhook Delivery

**Hosting is not yet decided.** The Stripe webhook is therefore built as a
**portable Next.js route handler** so it can run on **Vercel** or a
**self-hosted** Node server without code changes.

- **Local development**: use the **Stripe CLI** (`stripe listen --forward-to
  localhost:3000/api/stripe/webhook`) to forward events and obtain a local
  webhook signing secret.
- Decide hosting before launch; revisit any platform-specific concerns (raw body
  parsing, function timeouts, region) once chosen.

---

## 6. Suggested Folder Structure

```
app/
  (auth)/
    login/page.tsx
    register/page.tsx
    forgot-password/page.tsx
    reset-password/page.tsx
  (app)/
    dashboard/page.tsx
    invoices/
      page.tsx                 # previous invoices (paginated list)
      new/page.tsx             # create invoice
      [id]/page.tsx            # invoice details / preview
      [id]/edit/page.tsx       # edit invoice
    clients/
      page.tsx                 # clients list
      new/page.tsx
      [id]/edit/page.tsx
    settings/
      profile/page.tsx         # sender details + Stripe onboarding
  api/
    stripe/
      webhook/route.ts         # portable webhook handler
      onboarding/route.ts      # create account link / refresh
  layout.tsx
  page.tsx                     # landing / auth entry (replace todos placeholder)

components/
  ui/                          # shadcn primitives (button exists; add more)
  invoices/                    # invoice form, line-item rows, totals, status badge
  clients/
  pdf/                         # @react-pdf/renderer document + styles

lib/
  utils.ts                     # cn() (exists)
  money.ts                     # currency list, formatting, rounding
  invoice.ts                   # totals calculation helpers

utils/
  supabase/                    # client/server/middleware (exist)
  resend/                      # client/email/index (exist)
  stripe/                      # stripe client + Connect helpers (to add)

server/  (or app/**/actions.ts)
  actions for profile, clients, invoices, send/resend

docs/
  PRD.md  Tech.md  DB.md
```

---

## 7. Environment Variables

| Variable | Scope | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | public | Supabase project URL (used by existing helpers) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | public | Supabase anon/publishable key (used by existing helpers) |
| `SUPABASE_SERVICE_ROLE_KEY` | server | Service-role key for webhook DB writes (bypasses RLS; never expose) |
| `STRIPE_SECRET_KEY` | server | Stripe API calls (accounts, sessions) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | public | Stripe.js on the client |
| `STRIPE_WEBHOOK_SECRET` | server | Verify incoming webhook signatures |
| `STRIPE_CONNECT_CLIENT_ID` | server | Stripe Connect (Express) client id |
| `RESEND_API_KEY` | server | Resend authentication (used by existing helper) |
| `RESEND_FROM_EMAIL` | server | Verified sender address (used by existing helper) |
| `NEXT_PUBLIC_APP_URL` | public | App base URL for redirects, links, onboarding return/refresh URLs |

> Keep a `.env.example` documenting these. Public (`NEXT_PUBLIC_*`) values are
> exposed to the browser; everything else must remain server-only.

---

## 8. Suggested Build Milestone Order

1. **Foundations**: replace the `todos` placeholder; add `zod`,
   `react-hook-form`, and core shadcn components; set up `.env.example`.
2. **Auth**: register / login / logout / forgot-password + protected-route
   guards (lean on existing middleware session refresh).
3. **Database**: apply the schema from `DB.md` (tables, enums, RLS, triggers,
   indexes, numbering function, profile auto-create trigger).
4. **Profile / sender details**: CRUD + settings page.
5. **Clients**: CRUD + list/forms.
6. **Invoices (core)**: create/edit/list/delete with atomic numbering,
   snapshots, totals, lifecycle (not-paid → paid, lock on paid, hard delete).
7. **PDF**: `@react-pdf/renderer` document + private Storage bucket + signed
   URLs + regenerate-on-edit.
8. **Stripe Connect**: onboarding (Account Links) + `charges_enabled` gating +
   per-invoice Checkout Sessions + link regeneration/deactivation rules.
9. **Webhooks**: portable route handler for payment + `account.updated`; wire up
   Stripe CLI locally.
10. **Email**: send + resend (BCC sender, reply-to user, PDF attached) +
    resend-on-edit confirmation.
11. **Dashboard**: summary stats, recent invoices, quick actions.
12. **Polish**: responsive checks, validation, error handling, decide hosting.

---

## 9. Reminder

This is a **non-standard Next.js (`16.2.9`)**. Always consult
`node_modules/next/dist/docs/` for the correct, version-specific APIs and
conventions **before** writing route handlers, server actions, middleware, or
caching logic.
