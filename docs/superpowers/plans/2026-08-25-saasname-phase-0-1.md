# SaaSNa.me Phase 0–1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve the two unverified external-API assumptions, then customize this ShipNow clone into a branded SaaSNa.me shell where a user signs up, receives free credits, and can buy more.

**Architecture:** Next.js 16 App Router on Vercel, Supabase Postgres with row-level security, Paddle for one-time credit-pack purchases. Credits live in an append-only ledger; balance is `SUM(delta)`, never a stored counter. Spending is a single atomic Postgres function guarded by an advisory lock, so two concurrent searches cannot overdraw.

**Tech Stack:** Next.js 16.2.9, React 19.2.4, Tailwind CSS v4, `@supabase/ssr` 0.12, `@paddle/paddle-node-sdk` 3.8, Vitest (added by Task 1), DeepSeek (`deepseek-v4-flash`) from Phase 2 onward.

## Global Constraints

- **Next.js 16 uses `proxy.ts`, not `middleware.ts`.** Never create `middleware.ts`.
- **Read `node_modules/next/dist/docs/` before writing Next-specific code.** This version has breaking changes from training data.
- **No JSX in `.ts` files** under `libs/` — use `.tsx` if a helper returns JSX.
- **Path alias:** `@/*` maps to the project root.
- **Immutability:** the credit ledger is append-only. Never `UPDATE` or `DELETE` a ledger row. Refunds and corrections are new rows.
- **`unknown` is never rendered as `clear`.** This invariant is established here and enforced from Phase 3 onward.
- **Migrations are sequentially numbered.** The last existing migration is `013_project_supabase_auth_schema.sql`; new ones start at `014`.
- **Brand palette (exact values, extracted from the logo):** ink `#021B42`, violet `#622EF8`, indigo `#3C3FEB`, blue `#008DF7`, cyan `#00BDFC`, clear `#02DF97`, contested `#DF8D01`, blocked `#DF0110`.
- **DeepSeek model names:** `deepseek-v4-flash` and `deepseek-v4-pro`. The aliases `deepseek-chat` and `deepseek-reasoner` were retired 2026-07-24 and now error.
- **Assumed defaults** (override before starting if you disagree): RDAP-only for v1 domains (no Domainr key), **5** free credits granted on signup.

## File Structure

| File | Responsibility |
|---|---|
| `vitest.config.ts` | Test runner config, `@/` alias |
| `docs/spikes/2026-08-25-external-apis.md` | Recorded findings from all three Phase 0 spikes |
| `scripts/spikes/uspto-trademark.ts` | Throwaway probe script — USPTO reachability |
| `scripts/spikes/google-play.ts` | Throwaway probe script — Play via Firecrawl |
| `scripts/spikes/socials.ts` | Throwaway probe script — handle checks |
| `config.ts` | App identity, brand, credit-pack definitions |
| `app/globals.css` | CSS custom properties + Tailwind v4 `@theme` tokens |
| `supabase/migrations/014_credits.sql` | Ledger table, RLS, balance + spend + grant functions |
| `supabase/migrations/014_credits_verify.sql` | Runnable assertions proving the SQL behaves |
| `libs/credits/balance.ts` | Read a user's balance |
| `libs/credits/spend.ts` | Atomic debit, typed `InsufficientCreditsError` |
| `libs/credits/errors.ts` | Credit error types |
| `libs/credits/packs.ts` | Pure mapping: Paddle price ID → credit quantity |
| `libs/credits/grant.ts` | Server-side credit grant (used by the webhook) |
| `app/api/webhooks/paddle/route.ts` | Extended to grant credits on `TransactionCompleted` |
| `components/CreditBalance.tsx` | Dashboard balance display |
| `components/CreditPacks.tsx` | Pack cards with Paddle checkout buttons |
| `app/dashboard/credits/page.tsx` | Buy-credits page |

---

## Task 1: Test infrastructure

Nothing in this repo is tested and there is no runner. Every later task depends on this.

**Files:**
- Create: `vitest.config.ts`
- Create: `libs/credits/packs.test.ts` (placeholder proving the runner works, replaced in Task 10)
- Modify: `package.json` (scripts + devDependencies)

**Interfaces:**
- Consumes: nothing
- Produces: `npm test` (single run), `npm run test:watch`. Tests are co-located as `*.test.ts` beside the code they cover.

- [x] **Step 1: Install Vitest**

Run: `npm install -D vitest@^3 @vitest/coverage-v8@^3 tsx`

- [x] **Step 2: Create the config**

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    exclude: ["node_modules/**", ".next/**"],
    coverage: { provider: "v8", reporter: ["text", "html"] },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, ".") },
  },
});
```

- [x] **Step 3: Add npm scripts**

In `package.json`, add to `"scripts"`:

```json
"test": "vitest run",
"test:watch": "vitest",
"test:coverage": "vitest run --coverage"
```

- [x] **Step 4: Write a test that proves the alias resolves**

Create `libs/credits/packs.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import config from "@/config";

describe("test harness", () => {
  it("resolves the @/ alias", () => {
    expect(typeof config.appName).toBe("string");
  });
});
```

- [x] **Step 5: Run the tests**

Run: `npm test`
Expected: PASS, 1 test.

- [x] **Step 6: Commit**

Stage `vitest.config.ts`, `package.json`, `package-lock.json`, `libs/credits/packs.test.ts` and commit with message: `test: add Vitest test infrastructure`

---

## Task 2: Spike — USPTO trademark search

**This is research, not TDD.** The deliverable is a documented answer, not shipped code. The spec flags this as the single largest unverified assumption: the legacy USPTO Developer Hub was decommissioned 2026-06-05, and no trademark *search* endpoint was confirmed to exist on the replacement Open Data Portal.

**Files:**
- Create: `scripts/spikes/uspto-trademark.ts`
- Create: `docs/spikes/2026-08-25-external-apis.md`

**Interfaces:**
- Consumes: nothing
- Produces: a decision recorded in `docs/spikes/2026-08-25-external-apis.md` under a `## USPTO` heading, stating one of: `ODP_SEARCH_WORKS`, `TMSEARCH_FALLBACK_REQUIRED`, or `NOT_VIABLE_FOR_V1`.

- [x] **Step 1: Register for an ODP API key**

Go to `https://data.uspto.gov/apis`, sign in with a USPTO.gov account, and generate an API key. Add to `.env.local`:

```
USPTO_API_KEY=your_key_here
```

- [x] **Step 2: Write the probe script**

Create `scripts/spikes/uspto-trademark.ts`:

```ts
/** Throwaway spike. Delete once findings are recorded. */
const KEY = process.env.USPTO_API_KEY;

const CANDIDATES = [
  "https://api.uspto.gov/api/v1/trademark/applications/search",
  "https://api.uspto.gov/api/v1/trademarks/search",
];

async function probe(url: string) {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "X-API-KEY": KEY ?? "", "Content-Type": "application/json" },
      body: JSON.stringify({ q: "slack", pagination: { offset: 0, limit: 5 } }),
    });
    const text = await res.text();
    console.log(`${res.status} ${url}`);
    console.log(text.slice(0, 500));
  } catch (err) {
    console.log(`ERROR ${url}:`, (err as Error).message);
  }
}

for (const url of CANDIDATES) await probe(url);
```

- [x] **Step 3: Run it**

Run: `npx tsx scripts/spikes/uspto-trademark.ts`
Expected: one of the URLs returns 200 with JSON containing trademark records, or all return 404/403.

- [x] **Step 4: If both fail, probe the public search backend**

Open `https://tmsearch.uspto.gov` in a browser with the Network tab recording, search for a term, and note the XHR request the page makes — URL, method, headers, and body. Reproduce that request with `curl`. Record whether it works without authentication.

- [x] **Step 5: Record the finding**

Create `docs/spikes/2026-08-25-external-apis.md`:

```markdown
# External API spikes — 2026-08-25

## USPTO

**Verdict:** <ODP_SEARCH_WORKS | TMSEARCH_FALLBACK_REQUIRED | NOT_VIABLE_FOR_V1>

**Endpoint that works:** <full URL, or "none">
**Auth:** <header name and how the key is obtained, or "none">
**Rate limit observed:** <requests/min, or "unknown">
**Sample response shape:** <the 3-5 fields the scoring rollup needs: mark text, status, class, owner, filing date>

**If NOT_VIABLE_FOR_V1:** trademark moves out of v1 entirely and the spec's
"trademark is a hard blocker" rule is dropped. Flag this to the product owner
before Phase 5 begins.
```

- [x] **Step 6: Commit**

Stage the script and the spike doc, commit with message: `spike: probe USPTO trademark search availability`

---

## Task 3: Spike — Google Play via Firecrawl

**Files:**
- Create: `scripts/spikes/google-play.ts`
- Modify: `docs/spikes/2026-08-25-external-apis.md`

**Interfaces:**
- Consumes: `docs/spikes/2026-08-25-external-apis.md` from Task 2
- Produces: a `## Google Play` section stating verdict `WORKS` or `BLOCKED`, plus the exact selectors or JSON path yielding: app title, developer, rating average, rating count, install band, last-updated date.

- [x] **Step 1: Confirm the Firecrawl key**

Check `.env.local` for `FIRECRAWL_API_KEY`. If absent, obtain one from `https://firecrawl.dev` and add it.

- [x] **Step 2: Write the probe script**

Create `scripts/spikes/google-play.ts`:

```ts
/** Throwaway spike. Delete once findings are recorded. */
const KEY = process.env.FIRECRAWL_API_KEY;
const TERM = "slack";

const res = await fetch("https://api.firecrawl.dev/v2/scrape", {
  method: "POST",
  headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
  body: JSON.stringify({
    url: `https://play.google.com/store/search?q=${encodeURIComponent(TERM)}&c=apps`,
    formats: ["markdown"],
  }),
});

console.log(res.status);
const json = await res.json();
console.log(JSON.stringify(json).slice(0, 3000));
```

- [x] **Step 3: Run it**

Run: `npx tsx scripts/spikes/google-play.ts`
Expected: 200, with markdown containing app titles and developer names for the search term.

- [x] **Step 4: Probe a single app detail page**

Change the `url` in the script to `https://play.google.com/store/apps/details?id=com.Slack` and re-run. Confirm the response contains a rating average, a rating count, an install band, and an updated-on date. These are the signals the scoring rollup needs — a search page alone is not sufficient.

- [x] **Step 5: Record the finding**

Append to `docs/spikes/2026-08-25-external-apis.md`:

```markdown
## Google Play

**Verdict:** <WORKS | BLOCKED>
**Search URL pattern:** https://play.google.com/store/search?q={term}&c=apps
**Detail URL pattern:** https://play.google.com/store/apps/details?id={packageId}
**Firecrawl credits per check:** <observed count>
**Signals extractable:** rating average <yes/no>, rating count <yes/no>,
install band <yes/no>, last updated <yes/no>, developer <yes/no>

**Extraction notes:** <how each signal appears in the markdown — the exact
surrounding text or heading the parser should key off>
```

- [x] **Step 6: Commit**

Stage the script and the spike doc, commit with message: `spike: probe Google Play scraping via Firecrawl`

---

## Task 4: Spike — social handle probes

The spec calls these the most fragile component in the system. This spike establishes which platforms are viable so Phase 5 does not discover it the hard way.

**Files:**
- Create: `scripts/spikes/socials.ts`
- Modify: `docs/spikes/2026-08-25-external-apis.md`

**Interfaces:**
- Consumes: `docs/spikes/2026-08-25-external-apis.md` from Task 3
- Produces: a `## Socials` section with a per-platform verdict table. Any platform marked `DROP` is excluded from the v1 probe set.

- [x] **Step 1: Write the probe script**

Create `scripts/spikes/socials.ts`:

```ts
/** Throwaway spike. Delete once findings are recorded. */
const HANDLE_TAKEN = "slack";
const HANDLE_FREE = "zzqxwvunlikelyhandle99";

const PLATFORMS = [
  { id: "github", url: (h: string) => `https://github.com/${h}` },
  { id: "x", url: (h: string) => `https://x.com/${h}` },
  { id: "instagram", url: (h: string) => `https://www.instagram.com/${h}/` },
  { id: "tiktok", url: (h: string) => `https://www.tiktok.com/@${h}` },
  { id: "linkedin", url: (h: string) => `https://www.linkedin.com/company/${h}` },
];

for (const p of PLATFORMS) {
  for (const handle of [HANDLE_TAKEN, HANDLE_FREE]) {
    try {
      const res = await fetch(p.url(handle), {
        method: "GET",
        redirect: "manual",
        headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)" },
      });
      console.log(`${p.id.padEnd(10)} ${handle.padEnd(24)} ${res.status}`);
    } catch (err) {
      console.log(`${p.id.padEnd(10)} ${handle.padEnd(24)} ERROR ${(err as Error).message}`);
    }
  }
}
```

- [x] **Step 2: Run it**

Run: `npx tsx scripts/spikes/socials.ts`

Expected: a viable platform returns a clearly different status for the taken handle (200) than the free one (404). A platform returning 200 for both, or 403/429 for both, is unusable by direct fetch.

- [x] **Step 3: Retry blocked platforms through Firecrawl**

For each platform where direct fetch failed to distinguish, retry via the Firecrawl scrape endpoint using the pattern from Task 3 Step 2. Record whether Firecrawl distinguishes taken from free.

- [x] **Step 4: Record the finding**

Append to `docs/spikes/2026-08-25-external-apis.md`:

```markdown
## Socials

| Platform | Direct fetch distinguishes? | Via Firecrawl? | v1 verdict |
|---|---|---|---|
| GitHub | | | <INCLUDE/DROP> |
| X | | | |
| Instagram | | | |
| TikTok | | | |
| LinkedIn | | | |

**Platforms included in v1:** <list>
**Platforms dropped:** <list, with the reason>
```

- [x] **Step 5: Commit**

Stage the script and the spike doc, commit with message: `spike: probe social handle availability checks`

---

## Task 5: Rebrand identity and design tokens

**Files:**
- Modify: `config.ts:1-20`
- Modify: `app/globals.css:1-45`
- Modify: `package.json` (`"name"` field)

**Interfaces:**
- Consumes: nothing
- Produces: `config.appName === "SaaSNa.me"`, `config.domainName === "saasna.me"`. CSS variables `--verdict-clear`, `--verdict-contested`, `--verdict-blocked`, `--verdict-unknown` and Tailwind utilities `text-verdict-clear`, `bg-verdict-clear` (and the same for the other three).

- [x] **Step 1: Rename the package**

In `package.json`, change `"name": "fastship"` to `"name": "saasname"`.

- [x] **Step 2: Update app identity in `config.ts`**

Replace the first block of `config.ts` (through the `colors` object) with:

```ts
const config = {
  appName: "SaaSNa.me",
  appDescription:
    "Find a SaaS name that is actually free to use — checked across app stores, web search, social handles, trademarks, and domains.",
  domainName: "saasna.me",
  productionUrl: "https://saasna.me",
  supportEmail: "support@saasna.me",
  brand: {
    logo: "/brand/saasname-logo.png",
    logoAlt: "SaaSNa.me",
  },
  colors: {
    theme: "light",
    ink: "#021B42",
    violet: "#622EF8",
    indigo: "#3C3FEB",
    blue: "#008DF7",
    cyan: "#00BDFC",
    main: "#008DF7",
    accent: "#00BDFC",
  },
```

- [x] **Step 3: Copy the logo into place**

Run:

```
mkdir -p public/brand
cp "/Users/hammamkhaled/Downloads/ChatGPT Image Aug 25, 2026 at 06_22_59 PM.png" public/brand/saasname-logo.png
```

- [x] **Step 4: Replace the design tokens**

In `app/globals.css`, replace the `:root` block and the `@theme inline` block with:

```css
:root {
  --brand-ink: #021B42;
  --brand-violet: #622EF8;
  --brand-indigo: #3C3FEB;
  --brand-blue: #008DF7;
  --brand-cyan: #00BDFC;

  --verdict-clear: #02DF97;
  --verdict-contested: #DF8D01;
  --verdict-blocked: #DF0110;
  --verdict-unknown: #94A3B8;

  --background: #F7F9FC;
  --foreground: #021B42;
  --muted: #55627A;
  --border: rgba(2, 27, 66, 0.12);
  --card: #ffffff;
  --primary: #008DF7;
  --primary-hover: #0072C9;
  --primary-soft: rgba(0, 189, 252, 0.16);
  --accent: #00BDFC;
  --accent-soft: rgba(98, 46, 248, 0.12);
  --accent-warm: #622EF8;
  --surface: #EDF4FD;
  --surface-dark: #021B42;

  --brand-gradient: linear-gradient(135deg, #622EF8 0%, #3C3FEB 38%, #008DF7 72%, #00BDFC 100%);
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-muted: var(--muted);
  --color-border: var(--border);
  --color-card: var(--card);
  --color-primary: var(--primary);
  --color-primary-hover: var(--primary-hover);
  --color-primary-soft: var(--primary-soft);
  --color-accent: var(--accent);
  --color-accent-soft: var(--accent-soft);
  --color-accent-warm: var(--accent-warm);
  --color-surface: var(--surface);
  --color-surface-dark: var(--surface-dark);
  --color-brand-ink: #021B42;
  --color-brand-violet: #622EF8;
  --color-brand-indigo: #3C3FEB;
  --color-brand-blue: #008DF7;
  --color-brand-cyan: #00BDFC;
  --color-verdict-clear: var(--verdict-clear);
  --color-verdict-contested: var(--verdict-contested);
  --color-verdict-blocked: var(--verdict-blocked);
  --color-verdict-unknown: var(--verdict-unknown);
  --font-sans: var(--font-inter);
}
```

- [x] **Step 5: Update the selection colour**

Further down `app/globals.css`, replace the `::selection` rule with:

```css
::selection {
  background: rgba(0, 189, 252, 0.35);
  color: var(--foreground);
}
```

- [x] **Step 6: Find remaining ShipNow references**

Run: `grep -rn "ShipNow\|shipnow\|FastShip\|fastship" --include="*.ts" --include="*.tsx" --include="*.css" app components libs config.ts`

Update every user-visible string to SaaSNa.me. Leave `libs/shipnow-project-session.ts` alone — Task 6 deletes it.

- [x] **Step 7: Verify the build and the tokens**

Run: `npm run build`
Expected: build succeeds.

Run: `npm run dev`, open the site, and confirm in DevTools that `getComputedStyle(document.documentElement).getPropertyValue('--verdict-clear')` returns ` #02DF97`.

- [x] **Step 8: Commit**

Stage `config.ts`, `app/globals.css`, `package.json`, `public/brand`, commit with message: `feat: rebrand to SaaSNa.me with logo-derived palette`

---

## Task 6: Remove the ShipNow provisioning surface

This clone carries a whole product SaaSNa.me does not need: a wizard that provisions GitHub repos, Supabase projects, Resend domains, and Paddle plans for *other* people's SaaS apps. It is roughly 30 files of dead weight that will confuse every later task.

**Files:**
- Delete: `app/api/projects/`, `libs/composio*.ts`, `libs/project*.ts`, `libs/setup-step*.ts`, `libs/reset-*.ts`, `libs/nango.ts`, `libs/paddle-provision.ts`, `libs/paddle-setup-plans.ts`, `libs/paddle-plans.ts`, `libs/paddle-webhook-url.ts`, `libs/repo-setup-commands.ts`, `libs/resend-domain.ts`, `libs/shipnow-project-session.ts`, `libs/supabase-auth-schema*.ts`, `libs/supabase-setup-auth-*.ts`, `libs/user-integrations.ts`, `libs/google-oauth-*.ts`, `libs/dashboard-data-cache.ts`
- Delete: `supabase/migrations/005_projects.sql` through `013_project_supabase_auth_schema.sql`
- Modify: `components/dashboard/DashboardOverview.tsx`, `components/dashboard/AppSidebar.tsx`, `app/dashboard/page.tsx`
- Modify: `package.json` (drop `@nangohq/frontend`, `@nangohq/node`)

**Interfaces:**
- Consumes: nothing
- Produces: a dashboard that renders for a signed-in user with no project concept. `npm run build` passes with zero unresolved imports.

- [x] **Step 1: Delete the API surface**

Run: `git rm -r app/api/projects`

- [x] **Step 2: Delete the provisioning libs**

Run:

```
git rm libs/composio*.ts libs/project-*.ts libs/projects.ts libs/setup-step*.ts \
       libs/reset-*.ts libs/nango.ts libs/paddle-provision.ts libs/paddle-setup-plans.ts \
       libs/paddle-plans.ts libs/paddle-webhook-url.ts libs/repo-setup-commands.ts \
       libs/resend-domain.ts libs/shipnow-project-session.ts libs/supabase-auth-schema*.ts \
       libs/supabase-setup-auth-*.ts libs/user-integrations.ts libs/google-oauth-*.ts \
       libs/dashboard-data-cache.ts
```

- [x] **Step 3: Delete the obsolete migrations**

These describe tables SaaSNa.me does not use. They stay in git history.

```
git rm supabase/migrations/005_projects.sql supabase/migrations/006_project_github.sql \
       supabase/migrations/007_project_supabase.sql supabase/migrations/008_user_integrations.sql \
       supabase/migrations/009_project_resend.sql supabase/migrations/010_project_paddle.sql \
       supabase/migrations/011_project_image.sql supabase/migrations/012_project_paddle_plans.sql \
       supabase/migrations/013_project_supabase_auth_schema.sql
```

Note: the tables still exist in the live Supabase database. Dropping them is a separate manual decision — do not write a destructive migration without the owner's explicit say-so.

- [x] **Step 4: Find every broken import**

Run: `npm run build`

The build will fail with a list of unresolved imports. Work through them: delete the component or code path that consumed the removed lib. Do not stub anything out — if a dashboard panel existed only to show project setup progress, delete the panel.

- [x] **Step 5: Reduce the dashboard to a shell**

Replace the body of `components/dashboard/DashboardOverview.tsx` so it renders only a greeting and an empty state:

```tsx
export function DashboardOverview({ displayName }: { displayName: string }) {
  return (
    <section className="space-y-2">
      <h1 className="section-heading text-3xl font-extrabold md:text-4xl">
        Hi, {displayName}
      </h1>
      <p className="text-muted">
        Start by describing your idea, or check a name you already have in mind.
      </p>
    </section>
  );
}
```

Update `app/dashboard/page.tsx` to pass only `displayName` and remove any project-related data fetching.

- [x] **Step 6: Drop unused dependencies**

Run: `npm uninstall @nangohq/frontend @nangohq/node`

- [x] **Step 7: Verify**

Run: `npm run build`
Expected: build succeeds with no unresolved imports.

Run: `npm test`
Expected: PASS (the Task 1 test still runs).

- [x] **Step 8: Commit**

Stage all changes, commit with message: `refactor: strip ShipNow project-provisioning surface`

---

## Task 7: Fix the auth redirect configuration

Sign-in currently lands on `http://localhost:3000`, which is a *different project's* dev server, producing a 431 and a white screen. The cause is environment and Supabase dashboard configuration, not application code.

**Files:**
- Modify: `.env.local`
- Modify: `docs/AUTH.md`

**Interfaces:**
- Consumes: nothing
- Produces: a working end-to-end sign-in on a single, documented port. Later tasks assume `requireUser()` returns a real user.

- [ ] **Step 1: Choose one port and free it**

SaaSNa.me uses port **3000**. Find whatever else holds it:

Run: `lsof -nP -iTCP:3000 -sTCP:LISTEN`

Stop the listed process, or move that other project to a different port. Do not work around this by running SaaSNa.me on 3002 — every piece of auth configuration below assumes one canonical origin.

- [ ] **Step 2: Confirm the env values match**

In `.env.local`, both must read:

```
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXTAUTH_URL=http://localhost:3000
```

- [ ] **Step 3: Fix the Supabase URL configuration**

Supabase dashboard → Authentication → URL Configuration:

- Site URL: `http://localhost:3000`
- Redirect URLs: add both `http://localhost:3000/auth/callback` and `http://localhost:3000/auth/callback?**`

The wildcard entry is required — without it the `?next=` and `?token_hash=` parameters are stripped.

- [ ] **Step 4: Switch magic links to the token_hash flow**

Supabase dashboard → Authentication → Email Templates → Magic Link. Set the link to:

```html
<a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=email">Log in</a>
```

This avoids PKCE entirely. `app/auth/callback/route.ts:56` already handles `token_hash` via `verifyOtp`, which needs no browser-stored code verifier and therefore works from any email client or device.

- [ ] **Step 5: Configure custom SMTP**

The built-in Supabase email sender is capped at roughly 2 messages per hour, which you will hit immediately during development. Supabase dashboard → Project Settings → Authentication → SMTP Settings:

- Host `smtp.resend.com`, port `465`, username `resend`
- Password: your `RESEND_API_KEY` value
- Sender: an address on a domain verified in Resend

Then Authentication → Rate Limits → raise emails per hour. This control is locked until custom SMTP is enabled.

- [ ] **Step 6: Clear the poisoned cookie jar**

Cookies are not isolated by port, so every project run on localhost has been contributing to one shared jar — this is what produced the 431. In the browser, delete all cookies for `localhost` and for any LAN IP used during development.

- [ ] **Step 7: Verify both sign-in paths end to end**

Run: `npm run dev`

1. Sign in with a magic link. Confirm the email arrives, the link lands on `localhost:3000/auth/callback`, and you reach `/dashboard`.
2. Sign out, then sign in with Google. Confirm you reach `/dashboard`.
3. In the console on `/dashboard`, run `document.cookie.length`. Expected: under 2000. A number near 16000 means stale cookies remain — repeat Step 6.

- [ ] **Step 8: Document it**

In `docs/AUTH.md`, update the "URL configuration" table to state port 3000 explicitly, and add a troubleshooting row:

```markdown
| 431 Request Header Fields Too Large | Cookies are shared across localhost ports. Clear all localhost cookies; ensure only one dev server uses port 3000. |
```

- [ ] **Step 9: Commit**

Stage `docs/AUTH.md`, commit with message: `docs: pin auth to port 3000 and document the token_hash flow`

---

## Task 8: Credit ledger schema

**Files:**
- Create: `supabase/migrations/014_credits.sql`
- Create: `supabase/migrations/014_credits_verify.sql`

**Interfaces:**
- Consumes: `public.profiles` (from `003_profiles.sql`)
- Produces: table `public.credit_ledger`; functions `public.credit_balance(uuid) → integer`, `public.spend_credits(uuid, integer, text, uuid) → integer`, `public.grant_credits(uuid, integer, text) → integer`. `spend_credits` raises `INSUFFICIENT_CREDITS` when the balance is too low.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/014_credits.sql`:

```sql
-- Append-only credit ledger. Balance is always SUM(delta) — never a stored counter.

create table if not exists public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  delta integer not null check (delta <> 0),
  reason text not null check (char_length(trim(reason)) >= 1),
  search_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists credit_ledger_user_idx
  on public.credit_ledger (user_id, created_at desc);

alter table public.credit_ledger enable row level security;

-- Users may read their own ledger. Nobody may write it except the service role
-- and the SECURITY DEFINER functions below.
create policy "Users can read own ledger"
  on public.credit_ledger for select
  using (auth.uid() = user_id);

-- Enforce append-only at the database level.
create or replace function public.reject_ledger_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'credit_ledger is append-only';
end;
$$;

drop trigger if exists credit_ledger_no_update on public.credit_ledger;
create trigger credit_ledger_no_update
  before update or delete on public.credit_ledger
  for each row execute function public.reject_ledger_mutation();

create or replace function public.credit_balance(p_user_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(delta), 0)::integer
  from public.credit_ledger
  where user_id = p_user_id;
$$;

-- Atomic debit. The advisory lock serialises concurrent spends for one user so
-- two simultaneous searches cannot both pass the balance check and overdraw.
create or replace function public.spend_credits(
  p_user_id uuid,
  p_amount integer,
  p_reason text,
  p_search_id uuid default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance integer;
begin
  if p_amount <= 0 then
    raise exception 'AMOUNT_MUST_BE_POSITIVE';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_user_id::text));

  select coalesce(sum(delta), 0) into v_balance
  from public.credit_ledger
  where user_id = p_user_id;

  if v_balance < p_amount then
    raise exception 'INSUFFICIENT_CREDITS';
  end if;

  insert into public.credit_ledger (user_id, delta, reason, search_id)
  values (p_user_id, -p_amount, p_reason, p_search_id);

  return v_balance - p_amount;
end;
$$;

create or replace function public.grant_credits(
  p_user_id uuid,
  p_amount integer,
  p_reason text
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_amount <= 0 then
    raise exception 'AMOUNT_MUST_BE_POSITIVE';
  end if;

  insert into public.credit_ledger (user_id, delta, reason)
  values (p_user_id, p_amount, p_reason);

  return public.credit_balance(p_user_id);
end;
$$;

-- Grant signup credits when a profile row is created.
create or replace function public.grant_signup_credits()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.grant_credits(new.id, 5, 'signup_grant');
  return new;
end;
$$;

drop trigger if exists grant_signup_credits on public.profiles;
create trigger grant_signup_credits
  after insert on public.profiles
  for each row execute function public.grant_signup_credits();
```

- [ ] **Step 2: Write the verification script**

SQL functions cannot be covered by Vitest. This script is their test — it asserts behaviour and raises if anything is wrong.

Create `supabase/migrations/014_credits_verify.sql`:

```sql
-- Run manually after 014_credits.sql. Rolls back; leaves no data behind.
begin;

do $$
declare
  v_user uuid;
  v_balance integer;
begin
  select id into v_user from auth.users limit 1;
  if v_user is null then
    raise exception 'No users exist — sign up once before running this script';
  end if;

  -- grant increases balance
  v_balance := public.grant_credits(v_user, 10, 'test_grant');
  if v_balance < 10 then
    raise exception 'FAIL: grant did not increase balance (got %)', v_balance;
  end if;
  raise notice 'PASS: grant increased balance to %', v_balance;

  -- spend decreases balance
  v_balance := public.spend_credits(v_user, 3, 'test_spend');
  raise notice 'PASS: balance after spend = %', v_balance;

  -- overdraw is rejected
  begin
    perform public.spend_credits(v_user, 999999, 'test_overdraw');
    raise exception 'FAIL: overdraw was allowed';
  exception when others then
    if sqlerrm <> 'INSUFFICIENT_CREDITS' then raise; end if;
    raise notice 'PASS: overdraw rejected';
  end;

  -- zero and negative amounts are rejected
  begin
    perform public.spend_credits(v_user, 0, 'test_zero');
    raise exception 'FAIL: zero spend was allowed';
  exception when others then
    if sqlerrm <> 'AMOUNT_MUST_BE_POSITIVE' then raise; end if;
    raise notice 'PASS: zero spend rejected';
  end;

  -- ledger is append-only
  begin
    update public.credit_ledger set delta = 100 where user_id = v_user;
    raise exception 'FAIL: ledger update was allowed';
  exception when others then
    if sqlerrm <> 'credit_ledger is append-only' then raise; end if;
    raise notice 'PASS: ledger update rejected';
  end;
end $$;

rollback;
```

- [ ] **Step 3: Apply the migration**

Paste the contents of `014_credits.sql` into the Supabase dashboard SQL editor and run it.
Expected: success, no errors.

- [ ] **Step 4: Run the verification script**

Paste `014_credits_verify.sql` into the SQL editor and run it.
Expected: five `PASS:` notices and no `FAIL:` exception.

- [ ] **Step 5: Commit**

Stage both migration files, commit with message: `feat: add append-only credit ledger with atomic spend`

---

## Task 9: Credit server library

**Files:**
- Create: `libs/credits/balance.ts`
- Create: `libs/credits/spend.ts`
- Create: `libs/credits/errors.ts`
- Create: `libs/credits/spend.test.ts`

**Interfaces:**
- Consumes: `public.credit_balance`, `public.spend_credits` from Task 8; `createClient` from `@/libs/supabase/server`; `createSupabaseAdmin` from `@/libs/supabase`
- Produces:
  - `getCreditBalance(userId: string): Promise<number>`
  - `spendCredits(args: { userId: string; amount: number; reason: string; searchId?: string }): Promise<number>` — returns the new balance
  - `class InsufficientCreditsError extends Error` with `name === "InsufficientCreditsError"`

- [ ] **Step 1: Write the failing test**

Create `libs/credits/spend.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import { spendCredits } from "@/libs/credits/spend";
import { InsufficientCreditsError } from "@/libs/credits/errors";

declare global {
  // eslint-disable-next-line no-var
  var __fakeAdmin: { rpc: ReturnType<typeof vi.fn> };
}

function fakeAdmin(response: { data: unknown; error: { message: string } | null }) {
  return { rpc: vi.fn().mockResolvedValue(response) };
}

vi.mock("@/libs/supabase", () => ({
  createSupabaseAdmin: () => globalThis.__fakeAdmin,
}));

describe("spendCredits", () => {
  it("returns the new balance on success", async () => {
    globalThis.__fakeAdmin = fakeAdmin({ data: 7, error: null });

    const balance = await spendCredits({
      userId: "user-1",
      amount: 3,
      reason: "search",
    });

    expect(balance).toBe(7);
  });

  it("throws InsufficientCreditsError when the balance is too low", async () => {
    globalThis.__fakeAdmin = fakeAdmin({
      data: null,
      error: { message: "INSUFFICIENT_CREDITS" },
    });

    await expect(
      spendCredits({ userId: "user-1", amount: 999, reason: "search" })
    ).rejects.toBeInstanceOf(InsufficientCreditsError);
  });

  it("rejects a non-positive amount without calling the database", async () => {
    const admin = fakeAdmin({ data: null, error: null });
    globalThis.__fakeAdmin = admin;

    await expect(
      spendCredits({ userId: "user-1", amount: 0, reason: "search" })
    ).rejects.toThrow("amount must be positive");

    expect(admin.rpc).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- libs/credits/spend.test.ts`
Expected: FAIL — cannot resolve `@/libs/credits/spend`.

- [ ] **Step 3: Write the error type**

Create `libs/credits/errors.ts`:

```ts
export class InsufficientCreditsError extends Error {
  constructor(message = "Not enough credits") {
    super(message);
    this.name = "InsufficientCreditsError";
  }
}
```

- [ ] **Step 4: Write the implementation**

Create `libs/credits/spend.ts`:

```ts
import { createSupabaseAdmin } from "@/libs/supabase";
import { InsufficientCreditsError } from "@/libs/credits/errors";

type SpendArgs = {
  userId: string;
  amount: number;
  reason: string;
  searchId?: string;
};

/** Debits credits atomically. Returns the new balance. */
export async function spendCredits({
  userId,
  amount,
  reason,
  searchId,
}: SpendArgs): Promise<number> {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error("amount must be positive");
  }

  const admin = createSupabaseAdmin();

  if (!admin) {
    throw new Error("Supabase admin client unavailable — check SUPABASE_SERVICE_ROLE_KEY");
  }

  const { data, error } = await admin.rpc("spend_credits", {
    p_user_id: userId,
    p_amount: amount,
    p_reason: reason,
    p_search_id: searchId ?? null,
  });

  if (error) {
    if (error.message.includes("INSUFFICIENT_CREDITS")) {
      throw new InsufficientCreditsError();
    }
    throw new Error(`Failed to spend credits: ${error.message}`);
  }

  return data as number;
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test -- libs/credits/spend.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 6: Write the balance reader**

Create `libs/credits/balance.ts`:

```ts
import { cache } from "react";
import { createClient } from "@/libs/supabase/server";

/** Reads a user's credit balance. Returns 0 on error rather than throwing —
 *  a failed read must never be mistaken for a successful purchase. */
export const getCreditBalance = cache(async function getCreditBalance(
  userId: string
): Promise<number> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("credit_balance", { p_user_id: userId });

  if (error) {
    console.error("[credits] Failed to read balance:", error.message);
    return 0;
  }

  return (data as number) ?? 0;
});
```

- [ ] **Step 7: Run the full suite**

Run: `npm test`
Expected: PASS.

- [ ] **Step 8: Commit**

Stage `libs/credits`, commit with message: `feat: add credit balance and atomic spend helpers`

---

## Task 10: Credit pack definitions

**Files:**
- Modify: `config.ts` (add a `credits` block)
- Rewrite: `libs/credits/packs.test.ts` (replacing the Task 1 placeholder)
- Create: `libs/credits/packs.ts`

**Interfaces:**
- Consumes: `config` from `@/config`
- Produces:
  - `type CreditPack = { id: string; name: string; credits: number; priceId: string; priceLabel: string }`
  - `getCreditPacks(): CreditPack[]`
  - `creditsForPriceId(priceId: string): number | null` — returns `null` for an unknown price ID

- [ ] **Step 1: Add pack definitions to `config.ts`**

Inside the `config` object, after the `auth` block, add:

```ts
  credits: {
    signupGrant: 5,
    perCandidate: 1,
    packs: [
      {
        id: "starter",
        name: "Starter",
        credits: 25,
        priceId: process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_CREDITS_25 ?? "",
        priceLabel: "$9",
      },
      {
        id: "builder",
        name: "Builder",
        credits: 100,
        priceId: process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_CREDITS_100 ?? "",
        priceLabel: "$29",
      },
    ],
  },
```

Add the two variables to `.env.local` with the Paddle price IDs for the one-time products created in the Paddle dashboard.

- [ ] **Step 2: Write the failing test**

Replace the entire contents of `libs/credits/packs.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { getCreditPacks, creditsForPriceId } from "@/libs/credits/packs";

describe("getCreditPacks", () => {
  it("returns only packs that have a configured price ID", () => {
    const packs = getCreditPacks();
    expect(packs.every((p) => p.priceId.length > 0)).toBe(true);
  });

  it("never returns a pack with a non-positive credit count", () => {
    expect(getCreditPacks().every((p) => p.credits > 0)).toBe(true);
  });
});

describe("creditsForPriceId", () => {
  it("returns null for an unknown price ID", () => {
    expect(creditsForPriceId("pri_does_not_exist")).toBeNull();
  });

  it("returns null for an empty price ID", () => {
    expect(creditsForPriceId("")).toBeNull();
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm test -- libs/credits/packs.test.ts`
Expected: FAIL — cannot resolve `@/libs/credits/packs`.

- [ ] **Step 4: Write the implementation**

Create `libs/credits/packs.ts`:

```ts
import config from "@/config";

export type CreditPack = {
  id: string;
  name: string;
  credits: number;
  priceId: string;
  priceLabel: string;
};

/** Packs with a configured Paddle price ID. An unconfigured pack is hidden
 *  rather than rendered as a broken checkout button. */
export function getCreditPacks(): CreditPack[] {
  return config.credits.packs.filter((pack) => pack.priceId.trim().length > 0);
}

/** Maps a Paddle price ID to its credit quantity.
 *  Returns null for anything unrecognised — the webhook must not guess. */
export function creditsForPriceId(priceId: string): number | null {
  if (!priceId.trim()) {
    return null;
  }

  const pack = config.credits.packs.find((p) => p.priceId === priceId);
  return pack ? pack.credits : null;
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test -- libs/credits/packs.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 6: Commit**

Stage `config.ts`, `libs/credits/packs.ts`, `libs/credits/packs.test.ts`, commit with message: `feat: define credit packs and price-ID mapping`

---

## Task 11: Grant credits on purchase

**Files:**
- Create: `libs/credits/grant.ts`
- Create: `libs/credits/grant.test.ts`
- Modify: `app/api/webhooks/paddle/route.ts` (the `TransactionCompleted` case)

**Interfaces:**
- Consumes: `creditsForPriceId` (Task 10), `public.grant_credits` (Task 8), `getUserIdFromCustomData` from `@/libs/paddle/server`
- Produces: `grantCreditsForTransaction(transaction: { id: string; customData: unknown; items: Array<{ price?: { id?: string } | null }> }): Promise<number>` — returns credits granted, `0` when the transaction contains no recognised credit pack

- [ ] **Step 1: Write the failing test**

Create `libs/credits/grant.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { grantCreditsForTransaction } from "@/libs/credits/grant";

const rpc = vi.fn();

vi.mock("@/libs/supabase", () => ({
  createSupabaseAdmin: () => ({ rpc }),
}));

vi.mock("@/libs/paddle/server", () => ({
  getUserIdFromCustomData: (data: unknown) =>
    (data as { userId?: string })?.userId ?? null,
}));

vi.mock("@/libs/credits/packs", () => ({
  creditsForPriceId: (id: string) => (id === "pri_known" ? 25 : null),
}));

beforeEach(() => {
  rpc.mockReset();
  rpc.mockResolvedValue({ data: 30, error: null });
});

describe("grantCreditsForTransaction", () => {
  it("grants the pack's credits for a recognised price ID", async () => {
    const granted = await grantCreditsForTransaction({
      id: "txn_1",
      customData: { userId: "user-1" },
      items: [{ price: { id: "pri_known" } }],
    });

    expect(granted).toBe(25);
    expect(rpc).toHaveBeenCalledWith("grant_credits", {
      p_user_id: "user-1",
      p_amount: 25,
      p_reason: "purchase:txn_1",
    });
  });

  it("grants nothing for an unrecognised price ID", async () => {
    const granted = await grantCreditsForTransaction({
      id: "txn_2",
      customData: { userId: "user-1" },
      items: [{ price: { id: "pri_subscription" } }],
    });

    expect(granted).toBe(0);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("grants nothing when the transaction has no user", async () => {
    const granted = await grantCreditsForTransaction({
      id: "txn_3",
      customData: {},
      items: [{ price: { id: "pri_known" } }],
    });

    expect(granted).toBe(0);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("sums credits across multiple pack line items", async () => {
    const granted = await grantCreditsForTransaction({
      id: "txn_4",
      customData: { userId: "user-1" },
      items: [{ price: { id: "pri_known" } }, { price: { id: "pri_known" } }],
    });

    expect(granted).toBe(50);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- libs/credits/grant.test.ts`
Expected: FAIL — cannot resolve `@/libs/credits/grant`.

- [ ] **Step 3: Write the implementation**

Create `libs/credits/grant.ts`:

```ts
import { createSupabaseAdmin } from "@/libs/supabase";
import { getUserIdFromCustomData } from "@/libs/paddle/server";
import { creditsForPriceId } from "@/libs/credits/packs";

type TransactionLike = {
  id: string;
  customData: unknown;
  items: Array<{ price?: { id?: string } | null }>;
};

/** Grants credits for a completed Paddle transaction.
 *  Returns the number of credits granted; 0 when the transaction contains no
 *  recognised credit pack (a subscription payment, for example). */
export async function grantCreditsForTransaction(
  transaction: TransactionLike
): Promise<number> {
  const userId = getUserIdFromCustomData(transaction.customData);

  if (!userId) {
    console.error("[credits] Transaction has no userId:", transaction.id);
    return 0;
  }

  const total = transaction.items.reduce((sum, item) => {
    const credits = creditsForPriceId(item.price?.id ?? "");
    return credits ? sum + credits : sum;
  }, 0);

  if (total === 0) {
    return 0;
  }

  const admin = createSupabaseAdmin();

  if (!admin) {
    throw new Error("Supabase admin client unavailable — check SUPABASE_SERVICE_ROLE_KEY");
  }

  const { error } = await admin.rpc("grant_credits", {
    p_user_id: userId,
    p_amount: total,
    p_reason: `purchase:${transaction.id}`,
  });

  if (error) {
    throw new Error(`Failed to grant credits: ${error.message}`);
  }

  return total;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- libs/credits/grant.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Wire it into the webhook**

In `app/api/webhooks/paddle/route.ts`, add the import:

```ts
import { grantCreditsForTransaction } from "@/libs/credits/grant";
```

Replace the `TransactionCompleted` case:

```ts
      case EventName.TransactionCompleted: {
        const transaction = event.data as Transaction;
        const granted = await grantCreditsForTransaction(
          transaction as unknown as {
            id: string;
            customData: unknown;
            items: Array<{ price?: { id?: string } | null }>;
          }
        );

        if (granted > 0) {
          console.info("[paddle/webhook] Granted credits:", granted);
          break;
        }

        await syncFromTransaction(transaction);
        break;
      }
```

A transaction is either a credit-pack purchase or a subscription payment, never both. Granting credits and syncing subscription access for the same transaction would be wrong.

- [ ] **Step 6: Verify the build and suite**

Run: `npm run build`
Expected: succeeds.

Run: `npm test`
Expected: PASS.

- [ ] **Step 7: Commit**

Stage `libs/credits/grant.ts`, `libs/credits/grant.test.ts`, `app/api/webhooks/paddle/route.ts`, commit with message: `feat: grant credits on completed Paddle transactions`

---

## Task 12: Display the credit balance

**Files:**
- Create: `components/CreditBalance.tsx`
- Modify: `app/dashboard/page.tsx`

**Interfaces:**
- Consumes: `getCreditBalance` (Task 9), the `--verdict-*` tokens (Task 5)
- Produces: a server component `<CreditBalance userId={string} />`

- [ ] **Step 1: Write the component**

Create `components/CreditBalance.tsx`:

```tsx
import Link from "next/link";
import { getCreditBalance } from "@/libs/credits/balance";

export default async function CreditBalance({ userId }: { userId: string }) {
  const balance = await getCreditBalance(userId);
  const isEmpty = balance === 0;

  return (
    <div className="card flex items-center justify-between gap-4 p-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wider text-muted">
          Credits
        </p>
        <p
          className={`text-3xl font-extrabold ${
            isEmpty ? "text-verdict-blocked" : "text-foreground"
          }`}
        >
          {balance}
        </p>
      </div>

      <Link
        href="/dashboard/credits"
        className="btn-primary rounded-xl px-4 py-2 text-sm font-bold"
      >
        {isEmpty ? "Buy credits" : "Top up"}
      </Link>
    </div>
  );
}
```

- [ ] **Step 2: Render it on the dashboard**

In `app/dashboard/page.tsx`, add the import:

```tsx
import CreditBalance from "@/components/CreditBalance";
```

and render it beneath `DashboardOverview`:

```tsx
<CreditBalance userId={user.id} />
```

- [ ] **Step 3: Verify in the browser**

Run: `npm run dev`, sign in, open `/dashboard`.
Expected: the balance reads **5** for a newly created account — the signup grant from Task 8 Step 1.

If it reads 0, the account predates the trigger. Grant manually in the SQL editor:

```sql
select public.grant_credits('<your-user-id>', 5, 'manual_backfill');
```

- [ ] **Step 4: Verify a purchase end to end**

With the Paddle sandbox configured and the webhook reachable (use a tunnel for local testing), buy the Starter pack. Confirm the balance increases by 25 and that `credit_ledger` contains a row with reason `purchase:txn_…`.

- [ ] **Step 5: Commit**

Stage `components/CreditBalance.tsx`, `app/dashboard/page.tsx`, commit with message: `feat: show credit balance on the dashboard`

---

## Task 13: Buy-credits page

Task 12's balance card links to `/dashboard/credits`. This task creates it.

**Files:**
- Create: `components/CreditPacks.tsx`
- Create: `app/dashboard/credits/page.tsx`

**Interfaces:**
- Consumes: `getCreditPacks` (Task 10), `ButtonCheckout` from `@/components/ButtonCheckout`, `getCreditBalance` (Task 9)
- Produces: route `/dashboard/credits`

- [ ] **Step 1: Write the packs grid**

`ButtonCheckout` already handles Paddle initialisation, the signed-out redirect, and `customData`, and it accepts a `priceId`. Reuse it rather than reimplementing checkout.

Create `components/CreditPacks.tsx`:

```tsx
import ButtonCheckout from "@/components/ButtonCheckout";
import { getCreditPacks } from "@/libs/credits/packs";

export default function CreditPacks() {
  const packs = getCreditPacks();

  if (packs.length === 0) {
    return (
      <div className="card p-6 text-sm text-muted">
        No credit packs are configured. Add NEXT_PUBLIC_PADDLE_PRICE_ID_CREDITS_25
        and NEXT_PUBLIC_PADDLE_PRICE_ID_CREDITS_100 to .env.local.
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {packs.map((pack) => (
        <div key={pack.id} className="card flex flex-col gap-4 p-6">
          <div>
            <h2 className="text-lg font-bold">{pack.name}</h2>
            <p className="mt-1 text-3xl font-extrabold">{pack.priceLabel}</p>
            <p className="text-sm text-muted">{pack.credits} credits</p>
          </div>

          <ButtonCheckout
            priceId={pack.priceId}
            label={`Buy ${pack.credits} credits`}
            source="dashboard"
            extraStyle="w-full justify-center rounded-xl"
          />
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Write the page**

Create `app/dashboard/credits/page.tsx`:

```tsx
import { requireUser } from "@/libs/supabase/require-user";
import { getCreditBalance } from "@/libs/credits/balance";
import { getSEOTags } from "@/libs/seo";
import CreditPacks from "@/components/CreditPacks";

export const dynamic = "force-dynamic";

export const metadata = getSEOTags({
  title: "Credits",
  description: "Buy search credits.",
  canonicalUrlRelative: "/dashboard/credits",
});

export default async function CreditsPage() {
  const user = await requireUser();
  const balance = await getCreditBalance(user.id);

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="section-heading text-3xl font-extrabold md:text-4xl">
          Credits
        </h1>
        <p className="text-muted">
          You have <strong className="text-foreground">{balance}</strong>{" "}
          {balance === 1 ? "credit" : "credits"}. One credit validates one name
          across every platform.
        </p>
      </div>

      <CreditPacks />
    </div>
  );
}
```

- [ ] **Step 3: Verify**

Run: `npm run build`
Expected: succeeds.

Run: `npm run dev`, sign in, click "Top up" on the dashboard balance card.
Expected: `/dashboard/credits` renders both packs, and clicking one opens the Paddle sandbox checkout overlay. If the packs grid shows the "not configured" message, the price-ID env vars from Task 10 Step 1 are missing.

- [ ] **Step 4: Commit**

Stage `components/CreditPacks.tsx`, `app/dashboard/credits/page.tsx`, commit with message: `feat: add buy-credits page`

---

## Done criteria

Phase 0–1 is complete when:

1. `docs/spikes/2026-08-25-external-apis.md` records a verdict for USPTO, Google Play, and each social platform.
2. `npm run build` and `npm test` both pass.
3. A new user can sign up via magic link **and** Google, lands on `/dashboard`, and sees a balance of 5.
4. A sandbox credit-pack purchase from `/dashboard/credits` increases the balance and writes a ledger row.
5. No ShipNow provisioning code remains in `app/` or `libs/`.
6. No link in the dashboard points at a route that does not exist.

## What Phase 2 needs from this

Phase 2 (idea → candidates via DeepSeek) begins by adding `DEEPSEEK_API_KEY` and a `libs/llm/provider.ts` interface. It consumes `spendCredits` and `config.credits.perCandidate` from this phase, and nothing else.
