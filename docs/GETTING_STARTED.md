# Get started

Hey maker, welcome to **FastShip**.

This guide covers the boilerplate overview and how to run the app locally. Once you're done here, follow [Ship in 5 minutes](./SHIP_IN_5_MINUTES.md) to customize your landing page, then [Database](./DATABASE.md) if you want to collect waitlist emails.

> You're browsing the **App Router** documentation (`/app`).

**Documentation index:** [docs/README.md](./README.md)

---

## Start a local server

### 1. Clone and install

In your terminal, run these commands one by one:

```bash
git clone https://github.com/YOUR_ORG/fastship.git [YOUR_APP_NAME]
cd [YOUR_APP_NAME]
npm install
git remote remove origin   # optional — detach from the template repo
npm run dev
```

**Node.js 18.17+** is required. Run `node -v` to check your version.

> Always run `npm install` after cloning. If you see `next.config.ts is not supported`, your `node_modules` is out of date — reinstall with `npm install`.

### 2. Set up environment variables

```bash
cp .env.example .env.local
```

See `.env.example` for all keys. You only need Supabase env vars to start collecting waitlist emails; other keys can wait until you wire up auth, payments, and email.

### 3. Connect Supabase (for waitlist / database)

1. Go to the [Supabase dashboard](https://supabase.com/dashboard) and create a new project.
2. Open **Project Settings → API**.
3. Paste these three values into `.env.local`:

| Variable | Where to find it |
|----------|------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `anon` / public key |
| `SUPABASE_SERVICE_ROLE_KEY` | `service_role` key (server-only — never expose to the client) |

4. Run the waitlist migration — see [Database](./DATABASE.md).
5. Enable Google Auth in Supabase — see [Auth](./AUTH.md).

### 4. Open the app

Visit [http://localhost:3000](http://localhost:3000).

You may see console warnings until auth and Resend are configured — that's expected at this stage. The landing page and waitlist form work without them.

---

## Next.js project structure

```
/app              → Pages (1 folder + page.tsx = 1 route)
/app/api          → API routes (1 file = 1 endpoint)
/components       → React components (UI, layout, marketing)
/libs             → Helpers (Supabase, auth, Resend, etc.)
/config.ts        → App configuration — read this file carefully
/public           → Static assets
/supabase         → SQL migrations
/docs             → Documentation
```

### `config.ts`

This is the backbone of the app. It centralizes branding, pricing, feature flags, and links used across pages and emails. Each key is documented inline — review it before customizing your product.

### `.env.local`

Never commit this file. Use `.env.example` as the template for required keys.

```env
# Site URL (SEO, sitemap, canonical links)
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Supabase (required for auth + waitlist)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Google OAuth → configure in Supabase Dashboard (Authentication → Providers → Google)
# Redirect URL: http://localhost:3000/auth/callback

# Resend (waitlist emails only — not used for auth)
RESEND_API_KEY=
```

Keys for Resend are covered in the [Emails guide](./EMAILS.md).

---

## Clone and ship fast (workflow)

Use this boilerplate as a **template**, not a fork you maintain forever.

### For a new SaaS idea

```bash
# 1. Clone the template
git clone https://github.com/YOUR_ORG/fastship.git my-new-saas
cd my-new-saas

# 2. Detach from template history (optional but recommended)
rm -rf .git
git init
git add .
git commit -m "Initial commit from FastShip"

# 3. Install & configure
npm install
cp .env.example .env.local
# → fill in Supabase (see Database guide)

# 4. Customize
# → edit config.ts (name, domain, pricing, plans)
# → swap copy and assets in /app and /components

# 5. Run locally
npm run dev

# 6. Deploy (Vercel recommended for Next.js)
# → add the same env vars in your hosting dashboard
# → point your domain
# → configure Resend DNS (see Emails guide)
```

### What to customize first

| Priority | File / area | Why |
|----------|-------------|-----|
| 1 | `config.ts` | App name, URL, pricing, support email |
| 2 | `.env.local` | Supabase + secrets for your project |
| 3 | `/components` | Hero, features, pricing copy |
| 4 | `/components` | Logo, colors (Tailwind theme) |
| 5 | Supabase | Waitlist table — [Database guide](./DATABASE.md) |
| 6 | Resend dashboard | Domain DNS (SPF, DKIM) — [Emails guide](./EMAILS.md) |

### What to leave alone

- `/libs` helpers — extend, don't rewrite
- `/app/api/lead` — configured via env vars + Supabase migration
- Auth session flow — Supabase Google Auth ([Auth guide](./AUTH.md))

---

## What's next

Follow these guides in order:

1. [Ship in 5 minutes](./SHIP_IN_5_MINUTES.md) — landing page + waitlist form
2. [Database](./DATABASE.md) — save waitlist emails with Supabase
3. [Emails (Resend)](./EMAILS.md) — welcome emails + notifications
4. [Static page](./STATIC_PAGE.md) — SEO marketing pages + `/landing` example
5. [SEO](./SEO.md) — metadata, sitemap, Google indexing
6. [Auth (Supabase)](./AUTH.md) — Supabase Google Auth + magic links
7. [API call](./API_CALL.md) — protected `/api/user` + profiles
8. [Private page](./PRIVATE_PAGE.md) — dashboard layout + protected routes

Coming soon:

- [ ] Privacy policy with GPT
