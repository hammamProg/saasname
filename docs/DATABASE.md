# Database

Collect waitlist emails from your landing page and store them in Supabase.

The `ButtonLead` component (used in Hero, Pricing, and CTA) posts to `/api/lead`, which saves emails to a `leads` table.

> ShipFast uses MongoDB for this. FastShip uses **Supabase** — same idea, different database. See [ShipFast Database docs](https://shipfa.st/docs/features/database) for the original reference.

---

## Setup

### 1. Create a Supabase project

1. Go to the [Supabase dashboard](https://supabase.com/dashboard) and create a new project.
2. Wait for the database to finish provisioning.

### 2. Add environment variables

If you haven't already, copy the env template:

```bash
cp .env.example .env.local
```

Open **Project Settings → API** in Supabase and paste these into `.env.local`:

| Variable | Where to find it |
|----------|------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `anon` / public key |
| `SUPABASE_SERVICE_ROLE_KEY` | `service_role` key (server-only — never expose to the client) |

The waitlist API uses the **service role key** on the server so leads are written securely without public insert policies.

### 3. Create the `leads` table

In Supabase, open **SQL Editor → New query**, paste the migration from `supabase/migrations/001_leads.sql`, and click **Run**:

```sql
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  created_at timestamptz not null default now()
);

create index if not exists leads_created_at_idx on public.leads (created_at desc);

alter table public.leads enable row level security;
```

This creates a table with a unique email constraint (no duplicates) and enables RLS. The API route uses the service role key, which bypasses RLS — no public policies are needed.

### 4. User profiles (protected API)

For the [API call guide](./API_CALL.md), run `supabase/migrations/003_profiles.sql` in the SQL Editor.

For Paddle subscriptions, also run `supabase/migrations/004_subscriptions.sql` — see [Subscriptions guide](./SUBSCRIPTIONS.md).

### 5. Auth (Supabase)

Google + magic links via Supabase Auth — see [Auth guide](./AUTH.md).

### 6. Restart the dev server

```bash
npm run dev
```

Submit an email through the landing page form. The lead should appear in **Table Editor → leads** in Supabase.

---

## How it works

```
User fills ButtonLead form
        ↓
POST /api/lead  { email }
        ↓
libs/supabase.ts  (service role client)
        ↓
INSERT into public.leads
```

### Without Supabase configured

If env vars are missing, the API still returns success and logs the email to the server console. This lets you run the landing page locally before setting up a database.

Once Supabase is configured, emails are persisted automatically — no code changes needed.

---

## View your waitlist

In the Supabase dashboard:

1. Open **Table Editor**
2. Select the **leads** table
3. Sort by `created_at` descending to see newest signups first

You can also export leads as CSV from the Table Editor, or query them in the SQL Editor:

```sql
select email, created_at from public.leads order by created_at desc;
```

---

## Optional: email notifications

When someone joins the waitlist, FastShip sends a welcome email to the subscriber and a notification to your support inbox. See [Emails (Resend)](./EMAILS.md) for setup.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Emails logged to console but not saved | Add Supabase env vars to `.env.local` and restart the dev server |
| `Failed to save email` | Confirm the `leads` table exists (run the migration SQL) |
| `This email is already on the waitlist` | Expected — duplicate emails are rejected by the unique constraint |
| Works locally, fails in production | Add the same Supabase env vars in your hosting dashboard (e.g. Vercel) |

---

## What's next

- [Ship in 5 minutes](./SHIP_IN_5_MINUTES.md) — customize the landing page
- [Get started](./GETTING_STARTED.md) — full clone-and-ship workflow
