# Emails (Resend)

Send transactional emails — waitlist confirmations, magic login links, receipts, and more.

FastShip uses **Resend** only (no Mailgun). Inspired by [ShipFast Emails docs](https://shipfa.st/docs/features/emails).

---

## Setup

### 1. Create a Resend account

Sign up at [resend.com](https://resend.com).

### 2. Verify your domain (production)

1. In Resend, open **Domains → Add Domain**.
2. Use a subdomain such as `resend.yourdomain.com` (recommended).
3. Add the DNS records Resend provides (SPF, DKIM, etc.).
4. Click **Verify DNS Records** — propagation can take a few minutes.

For local development you can skip domain verification and use Resend's test sender (`onboarding@resend.dev`). Emails can only be sent to your own verified address in that mode.

### 3. Create an API key

1. Open **API Keys → Create API Key**.
2. Copy the key immediately — Resend shows it only once.
3. Add it to `.env.local`:

```env
RESEND_API_KEY=re_xxxxxxxx
```

### 4. Set your sender address (production)

Once your domain is verified, set the `from` address in `.env.local`:

```env
RESEND_FROM_EMAIL=FastShip <noreply@yourdomain.com>
```

If unset, `config.ts` falls back to `FastShip <onboarding@resend.dev>` for testing.

### 5. Restart the dev server

```bash
npm run dev
```

---

## Sending emails

There are two patterns (same as ShipFast):

| Method | Use case |
|--------|----------|
| **SMTP** | Magic login links via NextAuth (coming soon) |
| **Resend API** | All other emails via `sendEmail()` in `libs/resend.ts` |

### `sendEmail()` helper

```typescript
import { sendEmail } from "@/libs/resend";

await sendEmail({
  to: "user@example.com",
  subject: "Welcome!",
  react: MyEmailTemplate({ name: "Jane" }),
  replyTo: "support@yourdomain.com", // optional — defaults to config.resend.supportEmail
});
```

You can pass `html`, `text`, or `react` for the body. Replies go to `config.resend.supportEmail` by default.

---

## Waitlist emails (built-in)

When someone joins the waitlist via `ButtonLead`, `/api/lead` automatically sends:

1. **Welcome email** → the subscriber (`emails/WaitlistWelcomeEmail.tsx`)
2. **Notification email** → your support inbox (`emails/WaitlistNotificationEmail.tsx`)

Helpers live in `libs/waitlist-emails.ts`. Email failures are logged but do not block the API response — the lead is still saved.

If `RESEND_API_KEY` is missing, emails are skipped and a message is logged to the console (same graceful pattern as Supabase).

---

## Receiving replies

Resend does **not** receive inbound email yet.

Set `config.resend.supportEmail` to an inbox you actually read (Gmail, Google Workspace, etc.). The `sendEmail()` helper sets it as `replyTo` so user replies land in your support inbox.

Update it in `config.ts`:

```typescript
resend: {
  fromNoReply: process.env.RESEND_FROM_EMAIL ?? `FastShip <onboarding@resend.dev>`,
  supportEmail: "you@yourdomain.com",
},
```

---

## Checklist to avoid the spam folder

- [ ] Verify your domain in Resend (SPF + DKIM records)
- [ ] Use a real `from` address on your verified domain — not `onboarding@resend.dev` in production
- [ ] Set `supportEmail` to a real inbox and use it as `replyTo`
- [ ] Avoid spam trigger words in subject lines
- [ ] Send a test to [delivered@resend.dev](mailto:delivered@resend.dev) before going live
- [ ] Warm up your domain — start with low volume, then scale

---

## How it works

```
User submits ButtonLead form
        ↓
POST /api/lead
        ↓
Save to Supabase (if configured)
        ↓
libs/waitlist-emails.ts
        ↓
libs/resend.ts  →  Resend API
        ↓
Welcome email to user + notification to support
```

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Emails skipped in console | Add `RESEND_API_KEY` to `.env.local` and restart |
| `403` / domain not verified | Verify domain in Resend or use `onboarding@resend.dev` for dev |
| Can only send to yourself in dev | Expected with test sender — verify domain for production |
| User saved but no email | Check server logs for `[email] Resend error` |
| Works locally, fails in production | Add `RESEND_API_KEY` and `RESEND_FROM_EMAIL` in Vercel/hosting env vars |

---

## What's next

- [Database](./DATABASE.md) — waitlist storage with Supabase
- [Get started](./GETTING_STARTED.md) — full setup workflow
- NextAuth guide (coming soon) — magic links via Resend SMTP
