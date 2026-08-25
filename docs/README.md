# FastShip Documentation

Hey maker, welcome to **FastShip** — a Next.js boilerplate to ship your startup fast.

Follow the guides in order. Each step builds on the previous one.

---

## Get started

| # | Guide | What you'll do |
|---|-------|----------------|
| 1 | [Get started](./GETTING_STARTED.md) | Clone, install, env vars, run locally |
| 2 | [Ship in 5 minutes](./SHIP_IN_5_MINUTES.md) | Landing page + waitlist form |
| 3 | [Database](./DATABASE.md) | Save waitlist emails with Supabase |
| 4 | [Emails (Resend)](./EMAILS.md) | Transactional email + waitlist notifications |
| 5 | [Components](./COMPONENTS.md) | Full ShipFast component library + showcase |
| 6 | [Static page](./STATIC_PAGE.md) | SEO pages + example `/landing` route |
| 7 | [SEO](./SEO.md) | Metadata, sitemap, structured data |
| 8 | [Auth (Supabase)](./AUTH.md) | Supabase Google Auth + magic links |
| 9 | [API call](./API_CALL.md) | Protected API routes + profiles |
| 10 | [Private page](./PRIVATE_PAGE.md) | Dashboard layout + protected routes |
| 11 | [Subscriptions (Paddle)](./SUBSCRIPTIONS.md) | Checkout, webhooks, local testing |
| — | [Agent reference](./AGENT_REFERENCE.md) | **For AI agents** — read this instead of scanning the repo |

---

## Features (coming soon)

- [x] Supabase Auth — Google + magic links
- [x] Supabase profiles — protected `/api/user` + RLS
- [x] Private pages — `/dashboard` layout + proxy
- [x] Paddle — subscriptions + webhooks + customer portal
- [ ] Privacy policy generator (GPT)
- [x] Resend — transactional email + waitlist notifications
- [x] SEO — `getSEOTags`, sitemap, robots.txt

---

## Project structure

```
/app              → Pages (1 folder + page.tsx = 1 route)
/app/api          → API routes (1 file = 1 endpoint)
/components       → React components (UI, layout, marketing)
/libs             → Helpers (Supabase, auth, Resend, etc.)
/emails           → React email templates
/config.ts        → App configuration — read this file carefully
/public           → Static assets
/supabase         → SQL migrations for your database
/docs             → You are here
```

---

## Inspired by

This documentation follows the same workflow as [ShipFast](https://shipfa.st/docs) — clone, configure, customize, deploy. FastShip uses **Supabase** instead of MongoDB.
