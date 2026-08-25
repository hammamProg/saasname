# API call (Supabase)

Protected API routes with **Supabase Auth** — adapted from the [ShipFast API call tutorial](https://shipfa.st/docs/tutorials/api-call).

Supabase session cookies authenticate requests. The API reads the user with `getUser()` and reads/writes `public.profiles` with RLS.

---

## Architecture

```
Browser (signed in)
  → apiClient.post("/user", { email })     // libs/api.ts → /api/user
         ↓
  app/api/user/route.ts
    → getAuthUser()                        // Supabase session from cookies
    → supabase.from("profiles").upsert()   // RLS: auth.uid() = id
         ↓
  Supabase Postgres
```

On **401**, `apiClient` redirects to `/auth/signin`.

---

## Setup

### 1. Run the profiles migration

In Supabase **SQL Editor**, run `supabase/migrations/003_profiles.sql`.

Creates:

- `public.profiles` — linked to `auth.users`
- RLS policies (users read/write own row)
- Trigger to auto-create a profile on sign-up

### 2. Sign in

Protected API routes require an active Supabase session (Google or magic link). See [Auth](./AUTH.md).

---

## Frontend: `libs/api.ts`

ShipFast uses axios; FastShip uses **fetch** with the same ergonomics:

```typescript
import apiClient from "@/libs/api";

const { data } = await apiClient.post("/user", { email: "new@gmail.com" });
```

Features:

- Base path `/api` — `apiClient.post("/user")` → `POST /api/user`
- **401** → redirect to `config.auth.loginUrl`
- Throws `ApiError` with message + status

Example UI: `components/UserProfileForm.tsx` on `/user-profile`.

---

## Backend: protected route

```typescript
import { getAuthUser, unauthorizedResponse } from "@/libs/supabase/auth-api";
import { createClient } from "@/libs/supabase/server";

export async function POST(request: Request) {
  const user = await getAuthUser();
  if (!user) return unauthorizedResponse();

  const supabase = await createClient(); // user-scoped — RLS applies
  // ...
}
```

Full example: `app/api/user/route.ts`

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/user` | Required | Read current user's profile |
| POST | `/api/user` | Required | Upsert profile email |

---

## Add your own protected API

1. Create `app/api/your-route/route.ts`
2. Call `getAuthUser()` — return `unauthorizedResponse()` if null
3. Use `createClient()` from `@/libs/supabase/server` for RLS-scoped queries
4. Call from the client with `apiClient.get/post(...)`

Use `createSupabaseAdmin()` only when you must bypass RLS (e.g. waitlist in `/api/lead`).

---

## Files

| File | Purpose |
|------|---------|
| `libs/api.ts` | Client API helper (401 redirect) |
| `libs/supabase/auth-api.ts` | `getAuthUser()` for route handlers |
| `app/api/user/route.ts` | Example protected endpoint |
| `components/UserProfileForm.tsx` | Example client usage |
| `app/user-profile/page.tsx` | Example protected page |
| `supabase/migrations/003_profiles.sql` | Profiles table + RLS |

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| 401 Not signed in | Sign in first; session cookie must be present |
| 500 on save | Run `003_profiles.sql`; check Supabase logs |
| RLS error | Use `createClient()` (user session), not service role |
| Redirect loop | Check `config.auth.loginUrl` and auth callback URLs |

---

## What's next

- [Private page](./PRIVATE_PAGE.md) — protect dashboard routes with a layout
- Paddle checkout (coming soon)
