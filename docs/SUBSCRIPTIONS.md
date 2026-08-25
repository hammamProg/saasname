# Subscriptions (Paddle)

Paddle overlay checkout on the pricing page, webhooks to Supabase, and a paywall via `profiles.has_access`.

---

## Flow

1. User signs in and opens **`/#pricing`**
2. `ButtonCheckout` opens Paddle overlay with `customData.user_id`
3. User pays → Paddle redirects to `/dashboard?checkout=success`
4. Paddle sends webhook → `/api/webhooks/paddle` sets `has_access = true`
5. Dashboard polls `GET /api/access` until access is active → redirects to `/dashboard/premium`

Checkout is **not** on the dashboard — only status and post-payment confirmation.

---

## Prerequisites

- Supabase Auth — [Auth guide](./AUTH.md)
- Run `supabase/migrations/003_profiles.sql` and **`004_subscriptions.sql`**
- [Paddle sandbox account](https://sandbox-login.paddle.com/signup)
- **`SUPABASE_SERVICE_ROLE_KEY`** in `.env.local` (webhooks update profiles via service role)

---

## 1. Paddle sandbox setup

### Products & prices

1. Open [Paddle sandbox dashboard](https://sandbox-vendors.paddle.com/)
2. **Catalog → Products → Add product**
3. Add a **recurring monthly** price for each plan
4. Copy each **Price ID** (`pri_...`)

### Credentials

**Developer tools → Authentication:**

| Env var | Where to get it |
|---------|-----------------|
| `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN` | Client-side token |
| `PADDLE_API_KEY` | API key (server) |
| `PADDLE_WEBHOOK_SECRET` | Notification destination secret (step 3) |
| `NEXT_PUBLIC_PADDLE_ENV` | `sandbox` |

Add to `.env.local`:

```bash
NEXT_PUBLIC_PADDLE_ENV=sandbox
NEXT_PUBLIC_PADDLE_CLIENT_TOKEN=live_...
PADDLE_API_KEY=pdl_sdbx_apikey_...
PADDLE_WEBHOOK_SECRET=...
NEXT_PUBLIC_PADDLE_PRICE_ID_STARTER=pri_...
NEXT_PUBLIC_PADDLE_PRICE_ID_PRO=pri_...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Restart `npm run dev` after changing env vars.

### Checkout settings

**Checkout → Checkout settings:**

- **Default payment link:** `http://localhost:3000` (must match where you run the app)

### Webhook destination

**Developer tools → Notifications → New destination**

Subscribe to:

- `subscription.created`
- `subscription.activated`
- `subscription.updated`
- `subscription.canceled`
- `subscription.past_due`
- `subscription.paused`
- `subscription.resumed`
- `subscription.trialing`
- `transaction.completed`

Copy the destination **secret** → `PADDLE_WEBHOOK_SECRET`

---

## 2. Test locally

Paddle cannot POST webhooks to `localhost` directly. Use a tunnel.

### Option A — ngrok (recommended)

```bash
# Terminal 1 — app
npm run dev

# Terminal 2 — tunnel to Next.js
ngrok http 3000
```

Copy the HTTPS URL (e.g. `https://abc123.ngrok-free.app`).

1. In Paddle sandbox, set webhook destination URL to:
   ```
   https://abc123.ngrok-free.app/api/webhooks/paddle
   ```
2. Set **Default payment link** to the same ngrok URL (or keep `http://localhost:3000` for checkout UI — both often work in sandbox; if checkout fails, use the ngrok URL)
3. Optionally set `NEXT_PUBLIC_SITE_URL` to the ngrok URL so the post-payment redirect works through the tunnel

### Option B — Hookdeck

1. Create a [Hookdeck](https://hookdeck.com/) connection pointing to `http://localhost:3000/api/webhooks/paddle`
2. Use the Hookdeck public URL as the Paddle notification destination

### Test checkout

1. Sign in at `/auth/signin`
2. Go to **`http://localhost:3000/#pricing`**
3. Click **Subscribe to Starter**
4. Pay with sandbox card:
   - **Number:** `4242 4242 4242 4242`
   - **Expiry:** any future date
   - **CVC:** `100`
5. After payment, you land on `/dashboard?checkout=success`
6. Within a few seconds, access activates and you redirect to `/dashboard/premium`

### Verify webhook

- Terminal running `npm run dev` should log: `[paddle/webhook] Received: subscription.activated`
- Supabase **Table Editor → profiles** → your user row → `has_access = true`

### Reset and re-test

Run `scripts/reset-subscriptions.sql` in Supabase SQL Editor (set your email in the `WHERE` clause).

---

## Paywall

```typescript
import { requireAccess } from "@/libs/access";
await requireAccess(); // redirects to /dashboard if !has_access
```

---

## Manage billing

**Account menu → Billing** calls `POST /api/paddle/portal` and opens Paddle’s customer portal.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Checkout error / blank overlay | Default payment link matches your domain; client token is sandbox; price IDs from sandbox catalog |
| Stuck on “Confirming subscription…” | Webhook tunnel running; `PADDLE_WEBHOOK_SECRET` correct; `SUPABASE_SERVICE_ROLE_KEY` set; check dev server logs |
| Billing → pricing page | No subscription yet — subscribe from `/#pricing` first |
| `has_access` stays false | Webhook never reached your app — confirm ngrok URL and Paddle destination |

---

## Code map

| File | Purpose |
|------|---------|
| `components/ButtonCheckout.tsx` | Paddle overlay checkout |
| `components/Pricing.tsx` | Pricing cards |
| `components/DashboardAccess.tsx` | Status + post-checkout polling |
| `app/api/webhooks/paddle/route.ts` | Webhook handler |
| `app/api/access/route.ts` | Poll access after checkout |
| `app/api/paddle/portal/route.ts` | Customer portal |
| `libs/paddle/*` | Paddle client + server helpers |
| `libs/access.ts` | `getProfileAccess()`, `requireAccess()` |

---

## Related

- [Paddle — Overlay checkout](https://developer.paddle.com/build/checkout/build-overlay-checkout)
- [Paddle — Webhooks](https://developer.paddle.com/webhooks/overview)
- [Paddle — Custom data](https://developer.paddle.com/build/transactions/custom-data)
