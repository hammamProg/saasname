# Private page (Supabase)

Build authenticated routes like a dashboard or account area — adapted from the [ShipFast private page tutorial](https://shipfa.st/docs/tutorials/private-page).

FastShip uses **Supabase Auth** instead of NextAuth + MongoDB. User data comes from `auth.users` and `public.profiles`.

For protected **API** routes, see [API call](./API_CALL.md).

---

## How it works

Two layers protect `/dashboard` and all subpages:

```
Request to /dashboard/*
        ↓
proxy.ts (edge)          → refresh session; redirect if no user (+ ?next=)
        ↓
app/dashboard/layout.tsx → requireUser(); shared shell
        ↓
app/dashboard/page.tsx   → load profile from Supabase; render private data
```

| Layer | File | Role |
|-------|------|------|
| Edge | `proxy.ts` + `libs/supabase/proxy.ts` | Session refresh; redirect to `config.auth.loginUrl` |
| Layout | `app/dashboard/layout.tsx` | Auth gate for every page under `/dashboard/*` |
| Page | `app/dashboard/page.tsx` | Server component with private user data |

Unauthenticated users are sent to `/auth/signin?next=/dashboard/...` and return after login.

---

## Dashboard layout

ShipFast uses `layout.js` in `/dashboard` so **all subpages** are private without repeating auth checks:

```typescript
// app/dashboard/layout.tsx
import { requireUser } from "@/libs/supabase/require-user";

export default async function DashboardLayout({ children }) {
  await requireUser();
  return <div>{/* header + {children} */}</div>;
}
```

Add routes as siblings — e.g. `app/dashboard/account/page.tsx` is automatically protected.

---

## Dashboard page (server component)

Loads the signed-in user and profile from Supabase (replaces ShipFast's `User.findById`):

```typescript
import { createClient } from "@/libs/supabase/server";
import { requireUser } from "@/libs/supabase/require-user";

export default async function DashboardPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <>
      <h1>User Dashboard</h1>
      <p>Welcome {user.user_metadata?.full_name ?? "there"} 👋</p>
      <p>Your email is {profile?.email ?? user.email}</p>
    </>
  );
}
```

Run `supabase/migrations/003_profiles.sql` if you haven't — see [API call](./API_CALL.md).

---

## Protect more routes

### Option A — nested layout (recommended)

Create a folder with its own `layout.tsx` that calls `requireUser()`:

```
app/settings/layout.tsx   → requireUser()
app/settings/page.tsx
app/settings/billing/page.tsx
```

### Option B — proxy matcher

Add paths to `proxy.ts`:

```typescript
export const config = {
  matcher: ["/dashboard/:path*", "/settings/:path*", "/auth/callback"],
};
```

Edge redirect preserves `?next=` for sign-in. Still add a layout or page-level `requireUser()` as defense in depth.

Login and callback URLs live in `config.ts`:

```typescript
auth: {
  loginUrl: "/auth/signin",
  callbackUrl: "/dashboard",
},
```

---

## Files

| File | Purpose |
|------|---------|
| `proxy.ts` | Matcher for protected paths |
| `libs/supabase/proxy.ts` | Session refresh + redirect logic |
| `libs/supabase/require-user.ts` | `requireUser()` for layouts/pages |
| `app/dashboard/layout.tsx` | Private layout + header |
| `app/dashboard/page.tsx` | Example dashboard with profile data |
| `app/dashboard/account/page.tsx` | Example protected subpage |

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Redirect loop | Check Supabase env vars; confirm callback URLs in dashboard |
| Dashboard loads but email missing | Run `003_profiles.sql`; sign out and back in |
| Subpage is public | Must live under a layout that calls `requireUser()`, or add to `proxy` matcher |
| Lands on `/dashboard` instead of subpage after login | Proxy sets `?next=` — ensure sign-in passes `next` to OAuth callback |

---

## What's next

- [API call](./API_CALL.md) — protected `/api/user` from the client
- Paddle checkout (coming soon)
