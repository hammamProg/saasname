# User authentication (Supabase)

Google OAuth and **magic links** via **Supabase Auth** — Supabase sends magic link emails; FastShip only triggers `signInWithOtp`.

After login, users land on `config.auth.callbackUrl` (default: `/dashboard`).

---

## Architecture

```
Sign in page (/auth/signin)
  ├─ Google → signInWithOAuth({ provider: "google" })
  └─ Email  → signInWithOtp({ email }) → Supabase sends magic link email
         ↓
   /auth/callback → verifyOtp(token_hash) or exchangeCodeForSession(code)
         ↓
   /dashboard (protected by proxy + getUser())
```

---

## Setup

### 1. Supabase env vars

| Variable | Where to find it |
|----------|------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Same page → anon public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Same page (waitlist API only — not used for auth) |

### 2. URL configuration

**Authentication → URL Configuration:**

| Setting | Local value |
|---------|-------------|
| Site URL | `http://localhost:3000` |
| Redirect URLs | `http://localhost:3000/auth/callback` |
| | `http://localhost:3000/auth/callback?**` |

The wildcard allows `?next=/dashboard` and `?token_hash=...` query params.

### 3. Google provider

1. **Authentication → Providers → Google** → Enable
2. Add Client ID + Secret from Google Cloud Console
3. Google redirect URI: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`

### 4. Magic links (Supabase Email)

1. **Authentication → Providers → Email** → Enable
2. **Authentication → Email Templates → Magic Link** — set the link to:

```html
<a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=email">Log in</a>
```

This passes `token_hash` to `/auth/callback` so sign-in works from any email app (avoids PKCE errors).

3. Optional: **Email Templates → SMTP Settings** — connect Resend or another SMTP for production deliverability (configured in Supabase, not in FastShip code).

4. Supabase free tier rate-limits auth emails (~2/hour). Use custom SMTP for production.

### 5. Test

```bash
npm run dev
```

1. [http://localhost:3000/auth/signin](http://localhost:3000/auth/signin)
2. Enter email → Supabase sends the magic link
3. Click link → `/dashboard`

---

## Usage

### Magic link (Supabase)

```tsx
const supabase = createClient();
await supabase.auth.signInWithOtp({
  email: "user@example.com",
  options: {
    emailRedirectTo: getAuthCallbackUrl("/dashboard"),
    shouldCreateUser: true,
  },
});
```

### Google

```tsx
await supabase.auth.signInWithOAuth({
  provider: "google",
  options: { redirectTo: getAuthCallbackUrl("/dashboard") },
});
```

---

## Files

| File | Purpose |
|------|---------|
| `components/AuthSignInForm.tsx` | Google + magic link UI |
| `app/auth/callback/route.ts` | Verify `token_hash` / exchange OAuth `code` |
| `libs/supabase/auth-redirect.ts` | Callback URL helper |

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| PKCE / code verifier error | Update Magic Link email template with `token_hash` (step 4 above) |
| Magic link not received | Check Supabase Auth logs; enable Email provider; check spam |
| Link opens but no session | Add redirect URLs with `?**` wildcard |
| Google `redirect_uri_mismatch` | Use Supabase callback URI in Google Console |

---

## What's next

- [Emails (Resend)](./EMAILS.md) — waitlist only (separate from Supabase auth emails)
- [Database](./DATABASE.md) — optional `profiles` table
