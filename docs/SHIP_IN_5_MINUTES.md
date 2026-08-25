# Ship in 5 minutes

Let's get your startup in front of customers in 5 minutes.

We build a landing page and wire up forms to collect waitlist emails (optional).

> Based on the [ShipFast Ship in 5 minutes tutorial](https://shipfa.st/docs/tutorials/ship-in-5-minutes).

---

## Prerequisites

Complete [Get started](./GETTING_STARTED.md) first:

```bash
git clone https://github.com/YOUR_ORG/fastship.git [YOUR_APP_NAME]
cd [YOUR_APP_NAME]
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## 1. Landing page is ready

The home page at `app/page.tsx` already includes the full marketing layout:

- Header
- Hero (with waitlist form)
- Problem
- Features accordion
- Pricing (with waitlist form)
- FAQ
- CTA (with waitlist form)
- Footer

No changes needed to get a beautiful landing page running.

---

## 2. Customize your copy

Edit the components in `/components` to match your product:

| Component | What to change |
|-----------|----------------|
| `Hero.tsx` | Headline, subtext, social proof |
| `Problem.tsx` | Pain points your product solves |
| `FeaturesAccordion.tsx` | Feature list |
| `Pricing.tsx` | Plans and prices (also edit `config.ts`) |
| `FAQ.tsx` | Common questions |
| `CTA.tsx` | Final call to action |
| `Header.tsx` / `Footer.tsx` | Logo, nav links |

Also review `config.ts` — it controls app name, description, domain, pricing plans, and links used across the site.

---

## 3. Waitlist email capture (optional)

The `ButtonLead` component collects emails and sends them to `/api/lead`.

It appears in three places by default:

- **Hero** — main call to action
- **Pricing** — under each plan
- **CTA** — bottom of the page

To collect emails in a database, follow the [Database guide](./DATABASE.md):

1. Create a Supabase project
2. Add env vars to `.env.local`
3. Run the SQL migration for the `leads` table

Until the database is configured, submitted emails are logged to the server console so you can still test the form locally.

---

## 4. Deploy

Deploy to [Vercel](https://vercel.com) (recommended for Next.js):

1. Push your repo to GitHub
2. Import the project in Vercel
3. Add the same env vars from `.env.local` in the Vercel dashboard
4. Deploy

After deploy, configure Paddle webhooks and Resend DNS when you're ready for payments and email (guides coming soon).

---

## Checklist

- [ ] Clone repo and run `npm install`
- [ ] Copy `.env.example` → `.env.local`
- [ ] Customize copy in `/components` and `config.ts`
- [ ] (Optional) Set up Supabase for waitlist — [Database guide](./DATABASE.md)
- [ ] Deploy to Vercel with env vars
- [ ] Point your domain

---

## What's next

- [Database](./DATABASE.md) — persist waitlist emails
- [Static page](./STATIC_PAGE.md) — build SEO pages beyond the homepage
- [SEO](./SEO.md) — sitemap and Google Search Console
- [Get started](./GETTING_STARTED.md) — full project overview
