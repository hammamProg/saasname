# FastShip — Agent Reference

**Read this file first** before exploring the codebase. It summarizes architecture, conventions, and current state so you don't need a full repo scan.

Inspired by [ShipFast](https://shipfa.st/docs). FastShip swaps MongoDB → **Supabase**, Mailgun → **Resend**, Stripe → **Paddle** (planned).

---

## Stack

| Layer | Technology | Notes |
|-------|------------|-------|
| Framework | Next.js **16.2.9** (App Router) | `proxy.ts` not `middleware.ts` |
| UI | React **19.2.4** | Server + client components |
| Styling | Tailwind CSS **v4** | `@import "tailwindcss"` in `app/globals.css` |
| Database | **Supabase** (Postgres) | Service role key for server writes |
| Auth | **NextAuth.js 4** + **@auth/supabase-adapter** | Google OAuth + Resend magic links |
| Email | **Resend** | Transactional + waitlist + magic links |
| Payments | **Paddle** | **Not implemented** — env vars stubbed, `config.stripe` holds plan UI data |

---

## Critical Next.js 16 rules

1. **`proxy.ts`, not `middleware.ts`** — Next.js 16 renamed the file convention. FastShip uses `proxy.ts` at the project root (re-exports `next-auth/middleware`). Do not create `middleware.ts`.
2. **Read `node_modules/next/dist/docs/` before coding** — this Next.js version has breaking API changes. Check deprecation notices; do not rely on training data.
3. **No JSX in `.ts` libs** — files under `libs/` that return JSX must use `.tsx` (e.g. `libs/seo-schema.tsx`). Pure helpers stay in `.ts`.
4. **Avoid `next-auth/providers/email`** — it pulls in **nodemailer** as a peer dependency. FastShip uses a custom Resend-backed email provider in `libs/auth.ts` instead.
5. **Path alias** — `@/*` maps to project root (`tsconfig.json`).

---

## Directory map

```
fastship/
├── app/                          # App Router pages + API routes
│   ├── api/
│   │   ├── auth/[...nextauth]/   # NextAuth handler
│   │   └── lead/                 # Waitlist POST endpoint
│   ├── blog/                     # Blog index + [slug] posts
│   ├── components/               # Component showcase page
│   ├── dashboard/                # Protected dashboard (auth required)
│   ├── landing/                  # Example static marketing page
│   ├── privacy-policy/
│   ├── tos/
│   ├── globals.css               # Tailwind v4 + theme tokens
│   ├── layout.tsx                # Root layout + SessionProvider
│   ├── page.tsx                  # Default landing page
│   ├── robots.ts
│   └── sitemap.ts
├── components/                   # Marketing + auth UI (27 components)
├── emails/                       # React email templates (waitlist)
├── libs/                         # Server helpers (Supabase, auth, Resend, SEO)
├── public/                       # Static assets + docs/component previews
├── supabase/migrations/          # SQL migrations (001 leads, 002 next_auth)
├── types/                        # next-auth.d.ts session extensions
├── docs/                         # Human + agent documentation
├── config.ts                     # App config (name, pricing, auth URLs, links)
├── proxy.ts                      # Route protection (Next.js 16 proxy)
├── next.config.ts
├── package.json
└── .env.example                  # Required env var template
```

---

## Routes

| Route | File | Type | Auth | Description |
|-------|------|------|------|-------------|
| `/` | `app/page.tsx` | Page | Public | Default landing (Header → Hero → … → Footer) |
| `/landing` | `app/landing/page.tsx` | Page | Public | Example static SEO marketing page |
| `/blog` | `app/blog/page.tsx` | Page | Public | Blog index |
| `/blog/supabase-waitlist-setup` | `app/blog/[slug]/page.tsx` | Page | Public | Blog post (dynamic) |
| `/blog/resend-transactional-emails` | `app/blog/[slug]/page.tsx` | Page | Public | Blog post (dynamic) |
| `/components` | `app/components/page.tsx` | Page | Public | Live component showcase |
| `/dashboard` | `app/dashboard/page.tsx` | Page | **Protected** | Private dashboard; redirects if unauthenticated |
| `/tos` | `app/tos/page.tsx` | Page | Public | Terms of service |
| `/privacy-policy` | `app/privacy-policy/page.tsx` | Page | Public | Privacy policy |
| `/sitemap.xml` | `app/sitemap.ts` | Metadata | Public | Auto-generated sitemap |
| `/robots.txt` | `app/robots.ts` | Metadata | Public | Robots rules |
| `/api/auth/*` | `app/api/auth/[...nextauth]/route.ts` | API | — | NextAuth (sign-in, callbacks, session) |
| `/api/lead` | `app/api/lead/route.ts` | API POST | Public | Waitlist email capture |

**Protected by `proxy.ts`:** `/dashboard/:path*` only.

---

## Environment variables

From `.env.example`:

| Variable | Required for | Client-safe | Notes |
|----------|--------------|-------------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | DB, auth adapter | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Future client reads | Yes | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | `/api/lead`, NextAuth adapter | **No** | Server-only; bypasses RLS |
| `NEXT_PUBLIC_SITE_URL` | SEO, sitemap, canonical | Yes | Default `http://localhost:3000` |
| `NEXTAUTH_URL` | Auth | No | Must match app URL |
| `NEXTAUTH_SECRET` | Auth | No | 15+ char random string |
| `GOOGLE_CLIENT_ID` | Google OAuth | No | Optional provider |
| `GOOGLE_CLIENT_SECRET` | Google OAuth | No | Optional provider |
| `RESEND_API_KEY` | Email + magic links | No | Optional provider |
| `RESEND_FROM_EMAIL` | Email sender | No | e.g. `FastShip <noreply@yourdomain.com>` |
| `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN` | Paddle checkout | Yes | **Not wired up yet** |
| `PADDLE_API_KEY` | Paddle API | No | **Not wired up yet** |
| `PADDLE_WEBHOOK_SECRET` | Paddle webhooks | No | **Not wired up yet** |
| `NEXT_PUBLIC_PADDLE_PRICE_ID_CREDITS_25` | Starter credit pack | Yes | Paddle price ID, 25 credits |
| `NEXT_PUBLIC_PADDLE_PRICE_ID_CREDITS_100` | Builder credit pack | Yes | Paddle price ID, 100 credits |
| `DEEPSEEK_API_KEY` | Name generation (`/api/generate`) | **No** | Server-only. Absent → the route returns `503` |

Minimum to run locally: none (landing works). For waitlist DB: Supabase trio. For auth: Supabase + NextAuth + at least one provider.

---

## config.ts key fields

| Key | Purpose |
|-----|---------|
| `appName` | Brand name (`"FastShip"`) |
| `appDescription` | Default SEO description |
| `domainName` | Production domain (`fastship.app`) |
| `supportEmail` | Support inbox |
| `colors.theme` | `"light"` |
| `colors.main` | Primary brand color (`#570df8`) |
| `auth.loginUrl` | Sign-in redirect target (`/api/auth/signin`) |
| `auth.callbackUrl` | Post-login destination (`/dashboard`) |
| `resend.fromNoReply` | Sender — `RESEND_FROM_EMAIL` or Resend dev default |
| `resend.supportEmail` | Reply-to / notification recipient |
| `stripe.plans` | Pricing UI data (legacy key name; Paddle planned) |
| `links.twitter`, `links.github`, `links.support`, `links.terms`, `links.privacy` | Footer + nav links |

Always read `config.ts` before changing copy, pricing, or auth URLs.

---

## Auth architecture

NextAuth at `/api/auth/[...nextauth]` uses the Supabase Postgres adapter (`next_auth` schema). Providers are conditional on env vars: Google OAuth when `GOOGLE_CLIENT_*` are set; magic links via a custom Resend provider when `RESEND_API_KEY` is set (not `next-auth/providers/email` — avoids nodemailer).

Sessions flow through `SessionProvider` in `components/Providers.tsx`. `/dashboard` is protected by `proxy.ts` (matcher `/dashboard/:path*`) plus server-side `getServerSession(authOptions)` in the page. Without Supabase adapter env vars, auth falls back to JWT sessions.

Key files: `libs/auth.ts`, `app/api/auth/[...nextauth]/route.ts`, `proxy.ts`, `types/next-auth.d.ts`. Helper: `isAuthConfigured()`. Full setup: [AUTH.md](./AUTH.md).

---

## Database migrations

### `001_leads.sql`

| Item | Detail |
|------|--------|
| Table | `public.leads` — `id` (uuid), `email` (unique), `created_at` |
| Index | `leads_created_at_idx` |
| RLS | Enabled, **no public policies** — API uses `service_role` |
| Used by | `POST /api/lead` via `createSupabaseAdmin()` |

### `002_next_auth.sql`

| Item | Detail |
|------|--------|
| Schema | `next_auth` |
| Tables | `users`, `sessions`, `accounts`, `verification_tokens` |
| Function | `next_auth.uid()` for JWT claim lookup |
| Used by | `@auth/supabase-adapter` in `libs/auth.ts` |
| Prerequisite | Run after `001_leads.sql` |
| Post-migration | Add `next_auth` to **Exposed schemas** in Supabase dashboard |

---

## Key libs API signatures

### `libs/supabase.ts`

```typescript
createSupabaseAdmin(): SupabaseClient | null
// null if NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing
```

### `libs/resend.ts`

```typescript
sendEmail(params: {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  react?: ReactNode;
  replyTo?: string;
}): Promise<{ success: true; id: string } | { success: false; error: string }>

isResendConfigured(): boolean
```

### `libs/waitlist-emails.ts`

```typescript
sendWaitlistWelcomeEmail(email: string): Promise<SendEmailResult>
sendWaitlistNotificationEmail(email: string): Promise<SendEmailResult>
```

### `libs/auth.ts`

```typescript
export const authOptions: NextAuthOptions
isAuthConfigured(): boolean
```

### `libs/seo.ts`

```typescript
export const siteUrl: string

getSEOTags(params?: {
  title?: string;
  description?: string;
  keywords?: string[];
  canonicalUrlRelative?: string;
  openGraph?: Metadata["openGraph"];
}): Metadata
```

### `libs/seo-schema.tsx`

```typescript
renderSchemaTags(): JSX.Element
```

---

## Components

| Component | File | Role |
|-----------|------|------|
| Header | `Header.tsx` | Landing nav |
| HeaderAuth | `HeaderAuth.tsx` | Nav with sign-in / account menu |
| Hero | `Hero.tsx` | Above-the-fold + waitlist CTA |
| Problem | `Problem.tsx` | Pain points section |
| WithWithout | `WithWithout.tsx` | Before/after comparison |
| FeaturesListicle | `FeaturesListicle.tsx` | Feature list layout |
| FeaturesAccordion | `FeaturesAccordion.tsx` | Accordion features |
| FeaturesGrid | `FeaturesGrid.tsx` | Grid features |
| CTA | `CTA.tsx` | Call-to-action block |
| Pricing | `Pricing.tsx` | Pricing cards + waitlist |
| FAQ | `FAQ.tsx` | FAQ accordion |
| Footer | `Footer.tsx` | Site footer |
| ButtonLead | `ButtonLead.tsx` | Waitlist form → `/api/lead` |
| ButtonCheckout | `ButtonCheckout.tsx` | Checkout CTA (Paddle stub) |
| ButtonSignin | `ButtonSignin.tsx` | NextAuth sign-in |
| ButtonAccount | `ButtonAccount.tsx` | User menu + logout |
| ButtonGradient | `ButtonGradient.tsx` | Gradient button variant |
| ButtonPopover | `ButtonPopover.tsx` | Popover button |
| BetterIcon | `BetterIcon.tsx` | Icon wrapper |
| Tabs | `Tabs.tsx` | Tabbed content |
| Modal | `Modal.tsx` | Modal dialog |
| Rating | `Rating.tsx` | Star rating utility |
| TestimonialSmall | `TestimonialSmall.tsx` | Small testimonial |
| TestimonialSingle | `TestimonialSingle.tsx` | Single testimonial |
| TestimonialTriple | `TestimonialTriple.tsx` | Three testimonials |
| TestimonialGrid | `TestimonialGrid.tsx` | Testimonial grid |
| BlogPreview | `BlogPreview.tsx` | Blog card preview |
| Providers | `Providers.tsx` | `SessionProvider` wrapper |

Default landing stack (`app/page.tsx`): Header → Hero → Problem → FeaturesAccordion → TestimonialTriple → Pricing → FAQ → CTA → Footer. Showcase: `/components`.

---

## ShipFast tutorial progress

| ShipFast feature | FastShip status | Doc |
|------------------|-----------------|-----|
| Get started / clone | Done | [GETTING_STARTED.md](./GETTING_STARTED.md) |
| Ship in 5 minutes (landing) | Done | [SHIP_IN_5_MINUTES.md](./SHIP_IN_5_MINUTES.md) |
| Database / waitlist | Done | [DATABASE.md](./DATABASE.md) |
| Emails (Resend) | Done | [EMAILS.md](./EMAILS.md) |
| Components library | Done | [COMPONENTS.md](./COMPONENTS.md) |
| Static SEO pages | Done | [STATIC_PAGE.md](./STATIC_PAGE.md) |
| SEO (metadata, sitemap) | Done | [SEO.md](./SEO.md) |
| User auth (NextAuth) | Done | [AUTH.md](./AUTH.md) |
| Paddle payments | **Not started** | — |
| Private pages (beyond dashboard) | Partial | `/dashboard` only |
| Supabase user profiles / RLS | **Not started** | — |

---

## Coding conventions

- **Config first** — branding, URLs, pricing, and auth paths live in `config.ts`; avoid hardcoding.
- **Extend `/libs`, don't rewrite** — Supabase, Resend, auth, and SEO helpers are shared entry points.
- **Server vs client** — `"use client"` only where needed (forms, session hooks, modals). Pages default to Server Components.
- **Imports** — use `@/` path alias (e.g. `@/config`, `@/libs/resend`).
- **Tailwind v4** — theme tokens in `app/globals.css` (`@theme inline`); utility classes like `btn-primary`, `card`, `section-heading`.
- **Emails** — React templates in `/emails`; send via `sendEmail()` or waitlist helpers.
- **API routes** — validate input, return JSON errors with appropriate status codes (see `/api/lead`).
- **No secrets in client** — service role, NextAuth secret, Resend/Paddle keys are server-only.
- **Docs** — update relevant guide in `/docs` when adding features; keep this file in sync for agents.

---

## Commands

| Command | Purpose |
|---------|---------|
| `npm install` | Install dependencies (Node 18.17+) |
| `npm run dev` | Start dev server at `http://localhost:3000` |
| `npm run build` | Production build + TypeScript check |
| `npm run start` | Serve production build |
| `npm run lint` | ESLint |
| `cp .env.example .env.local` | Create local env file |

Migrations: paste SQL from `supabase/migrations/` into Supabase SQL Editor (no CLI required).

---

## Known gotchas

| Gotcha | Mitigation |
|--------|------------|
| `middleware.ts` is deprecated in Next.js 16 | Use `proxy.ts` at project root |
| `next-auth/providers/email` needs nodemailer | Use custom Resend provider in `libs/auth.ts` |
| JSX in `.ts` files fails typecheck | Rename to `.tsx` (e.g. `seo-schema.tsx`) |
| No providers on sign-in page | Set Google and/or Resend env vars |
| Adapter errors | Run `002_next_auth.sql`; expose `next_auth` schema |
| Waitlist without Supabase | Still works — emails sent/logged, no DB insert |
| Duplicate waitlist email | API returns 409 |
| `config.stripe` naming | Legacy ShipFast key; Paddle not wired — UI only |
| Proxy matcher too broad | Can block static assets; keep matcher specific |
| Auth redirect loop | Set `NEXTAUTH_SECRET` and `NEXTAUTH_URL` |

---

## Doc index

| Guide | Path |
|-------|------|
| Index | [README.md](./README.md) |
| Get started | [GETTING_STARTED.md](./GETTING_STARTED.md) |
| Ship in 5 minutes | [SHIP_IN_5_MINUTES.md](./SHIP_IN_5_MINUTES.md) |
| Database | [DATABASE.md](./DATABASE.md) |
| Emails | [EMAILS.md](./EMAILS.md) |
| Components | [COMPONENTS.md](./COMPONENTS.md) |
| Static pages | [STATIC_PAGE.md](./STATIC_PAGE.md) |
| SEO | [SEO.md](./SEO.md) |
| Auth | [AUTH.md](./AUTH.md) |
| Agent reference | [AGENT_REFERENCE.md](./AGENT_REFERENCE.md) |

---

## Quick task routing

| Task | Start here |
|------|------------|
| Change branding / pricing / links | `config.ts` |
| Edit landing page layout | `app/page.tsx` + `/components` |
| Add waitlist / lead capture | `ButtonLead.tsx`, `/api/lead`, `001_leads.sql` |
| Send or template emails | `libs/resend.ts`, `/emails`, [EMAILS.md](./EMAILS.md) |
| Add auth provider or session logic | `libs/auth.ts`, [AUTH.md](./AUTH.md) |
| Protect a new route | Extend `proxy.ts` matcher + `getServerSession` in page |
| SEO / metadata / sitemap | `libs/seo.ts`, `app/sitemap.ts`, [SEO.md](./SEO.md) |
| New marketing page | Copy `app/landing/page.tsx` pattern, [STATIC_PAGE.md](./STATIC_PAGE.md) |
| Database schema change | New file in `supabase/migrations/` |
| Payments (Paddle) | **Not implemented** — env vars only |
| Component reference | `/components` page, [COMPONENTS.md](./COMPONENTS.md) |

---

*Last updated: auth + proxy migration. Build green.*
