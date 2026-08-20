# Security Checklist

## Authentication & routing

- [x] Middleware redirects unauthenticated users away from app routes (`/dashboard`, `/clients`, `/invoices`, `/settings`)
- [x] Middleware redirects authenticated users away from auth routes (`/login`, `/register`, etc.)
- [x] Server actions retain `getUser()` / ownership checks
- [x] Auth callback sanitizes `next` redirect (blocks `//` open redirects)

## Email (Resend)

- [x] XSS sanitization on HTML body (`sanitizeHtmlEmail`)
- [x] CRLF stripping on email headers (`sanitizeHeaderValue`)
- [x] Zod CRLF validation on profile/client names and recipient email
- [x] Rate limit on `sendInvoice`: 20 sends/hour per user (Upstash Redis)
- [x] Fail closed if `UPSTASH_REDIS_REST_*` env vars are missing

## Database

- [x] RLS enabled on all application tables with ownership policies
- [x] Server actions scope updates/deletes with `.eq("user_id", user.id)` where applicable
- [x] `SECURITY DEFINER` RPC functions restricted (`handle_new_user`, `next_invoice_number`)
- [x] `set_updated_at` search_path pinned

## API routes

- [x] Stripe webhook verifies signature
- [x] No other public mutation endpoints

## Required environment variables

| Variable | Purpose |
| --- | --- |
| `UPSTASH_REDIS_REST_URL` | Rate limiting for invoice email sends |
| `UPSTASH_REDIS_REST_TOKEN` | Rate limiting for invoice email sends |
| `SEND_INVOICE_RATE_LIMIT` | Optional override (default: 20/hour) |

## HTTP security headers (production)

Applied via `next.config.ts` when `NODE_ENV === 'production'`. HSTS is handled by Vercel and is not set in the app config.

| Header | Value | Purpose |
| --- | --- | --- |
| `Content-Security-Policy` | `default-src 'self'`; `script-src 'self' 'unsafe-inline' 'unsafe-eval'`; `style-src 'self' 'unsafe-inline'`; `img-src 'self' data: blob:`; `font-src 'self'`; `connect-src 'self' https://{supabaseHost} wss://{supabaseHost}`; `frame-ancestors 'self'`; `base-uri 'self'`; `form-action 'self'` | Restricts resource loading and connections. Supabase host is derived from `NEXT_PUBLIC_SUPABASE_URL` (fallback: `*.supabase.co`). `unsafe-inline` / `unsafe-eval` are required for Next.js and Tailwind in this minimal CSP. |
| `X-Frame-Options` | `SAMEORIGIN` | Prevents the app from being embedded in third-party iframes (clickjacking). |
| `X-Content-Type-Options` | `nosniff` | Stops browsers from MIME-sniffing responses away from the declared `Content-Type`. |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Sends full referrer on same-origin requests; origin only on cross-origin HTTPS; omits referrer on downgrade. |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=()` | Disables browser features the invoice app does not use. |

Headers are not applied in local development (`next dev`) so hot reload and dev tooling are unaffected.

## Manual / dashboard items

- [ ] Enable Supabase leaked-password protection in Auth settings
