# SaaSNa.me

Find a SaaS name that is actually free to use. Describe an idea, get candidate
names, and check each one against domain registries, the US trademark register,
the App Store, Google Play, social handles, and web search — one credit per name.

**Stack:** Next.js 16 · Tailwind CSS · Supabase · Resend · Paddle · DeepSeek

---

## Quick start

```bash
git clone https://github.com/YOUR_ORG/fastship.git my-app
cd my-app
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

**Node.js 18.17+** required.

---

## Documentation

Read the guides in order:

| Guide | Description |
|-------|-------------|
| [Get started](./docs/GETTING_STARTED.md) | Clone, install, env vars, project structure |
| [Ship in 5 minutes](./docs/SHIP_IN_5_MINUTES.md) | Customize landing page + waitlist form |
| [Database](./docs/DATABASE.md) | Save waitlist emails with Supabase |
| [Emails (Resend)](./docs/EMAILS.md) | Waitlist welcome + notification emails |
| [Static page](./docs/STATIC_PAGE.md) | SEO marketing pages |
| [SEO](./docs/SEO.md) | Metadata, sitemap, structured data |
| [Auth (Supabase)](./docs/AUTH.md) | Supabase Google Auth + magic links |
| [API call](./docs/API_CALL.md) | Protected API routes + profiles |
| [Private page](./docs/PRIVATE_PAGE.md) | Dashboard layout + protected routes |
| [Subscriptions (Paddle)](./docs/SUBSCRIPTIONS.md) | Checkout, webhooks, local testing |

Full index: [docs/README.md](./docs/README.md)

**For AI agents:** [docs/AGENT_REFERENCE.md](./docs/AGENT_REFERENCE.md) — project context without reading the whole repo.

---

## Waitlist emails

The landing page includes a `ButtonLead` form (Hero, Pricing, CTA) that posts to `/api/lead`.

- **Without Supabase:** emails are logged to the server console (works out of the box for local dev).
- **With Supabase:** emails are saved to a `leads` table — see [Database guide](./docs/DATABASE.md).
- **With Resend:** subscribers get a welcome email and you get a notification — see [Emails guide](./docs/EMAILS.md).

Inspired by [ShipFast's database setup](https://shipfa.st/docs/features/database) and [ShipFast emails](https://shipfa.st/docs/features/emails).

---

## Project structure

```
/app              → Pages and API routes
/components       → Marketing UI (Hero, Pricing, FAQ, etc.)
/libs             → Supabase (client, server, admin), Resend, SEO
/emails           → React email templates
/config.ts        → App name, pricing, links
/supabase         → SQL migrations
/docs             → Documentation
```

---

## Deploy

Deploy to [Vercel](https://vercel.com) and add the same env vars from `.env.local` in your project settings.

---

## License

Private boilerplate — customize and ship.
# fastship
