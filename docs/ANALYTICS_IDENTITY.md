# Identity, sessions, attribution and goals

Persistent visitor identity, session tracking, traffic-source attribution and
custom conversion goals, layered on top of the existing analytics product.

**This is a second, independent pipeline.** The original cookieless pageview
pipeline (`public/js/s.js`'s legacy beacon → `/api/webstats/event` →
`webstats_events` → `webstats_visit_hourly`/`webstats_dim_hourly` → the
Overview tab) is untouched and keeps working exactly as it did. Everything
below is new, additive, and lives in its own tables and its own endpoint.

No new environment variables. Both pipelines share the existing Supabase
project and `SUPABASE_SERVICE_ROLE_KEY` / `NEXT_PUBLIC_SITE_URL` config.

## Why two pipelines

The original product's positioning is cookieless: no cookies, no
localStorage, nothing written to a visitor's device, and therefore no
consent banner. That's a real constraint that makes true persistent
cross-session identity impossible — a daily-rotating salted hash can't
survive more than a day, by design.

This feature requires real identity: `identify()` linking anonymous browsing
to a signed-up user, first-touch attribution that survives weeks, goal
completions with a durable attribution snapshot. That needs a real
first-party cookie and is a different privacy trade-off — a site that turns
this on is no longer "no cookie banner needed" and should disclose that to
its own visitors accordingly (see **Cookies & privacy** below).

## Data model

| Table | Purpose |
|---|---|
| `webstats_visitors` | One row per `(site_id, visitor_id)`. First-touch (immutable), last-touch, last-non-direct attribution snapshots. |
| `webstats_sessions` | One row per `(site_id, session_id)`. Source captured once, at session start, never updated after. |
| `webstats_identity_events` | Page/track/identify event log for this pipeline — the "events and page views" table. Idempotent on `(site_id, event_id)`. |
| `webstats_identity_links` | Append-only audit of which `visitor_id`s a `user_id` has used. Never used to rewrite history — see **Identity resolution**. |
| `webstats_goals` | Configured goals: key, name, type, dedupe rule. Managed from the dashboard (`/dashboard/sites/[id]/goals`). |
| `webstats_goal_completions` | One row per completion, idempotent per the goal's dedupe rule, carrying an immutable attribution snapshot. |

`webstats_sites` gained two columns: `write_key` (server-side `identify()`
auth, see below) and `ignored_referrer_domains` (per-site list of hostnames
to treat as internal — SSO providers, a checkout flow on another domain).

All new tables use the same RLS pattern as the rest of `webstats_*`: an
owner reads through a join back to `webstats_sites.owner_id = auth.uid()`.
Writes go through the service-role client from the ingest endpoints only,
same trust model as `webstats_events`.

Migrations: `036_webstats_identity_attribution.sql`, `037_webstats_identity_events.sql`
(corrects 036 — see its header for why the event log isn't on
`webstats_events`), and `038_webstats_identity_links_index_fix.sql`
(corrects 036's partial unique index on `webstats_identity_links`, which
Postgres cannot use as a plain `ON CONFLICT` arbiter — every `identify()`
link write failed silently until this fix; caught by live end-to-end
testing against the real database, not by the mocked unit suite).

## Attribution rules

Implemented in `libs/webstats/attribution.ts` (pure, unit-tested in
`attribution.test.ts`).

**Source-detection priority**, evaluated once per session, first match wins:

1. Explicit UTM parameters (`utm_source`/`utm_medium`/`utm_campaign`/
   `utm_term`/`utm_content`)
2. Alt tracking parameters (`ref`, `source`, `via`)
3. Advertising click identifiers (`gclid`, `gbraid`, `wbraid`, `fbclid`,
   `msclkid`, `ttclid`)
4. External referrer hostname
5. Direct

**Channel classification** (`classifyChannel`) is a second pass over the
result: Organic Search, Paid Search, Organic Social, Paid Social, Email,
Referral, Affiliate, Display, Direct, or Unknown. A click id always wins
over what the source name alone would suggest — a `gclid` click through a
misleading `utm_source` still lands in Paid Search.

**Internal navigation** never creates a new source: a referrer matching the
site's own domain (bare, `www.` stripped) or one of its configured
`ignored_referrer_domains` is treated as absent, same as no referrer at all.

**Attribution views**, each stored and queryable independently:

- **First-touch** (`webstats_visitors.first_touch`) — written once, on the
  visitor's first-ever session, never updated again.
- **Session source** (`webstats_sessions.*`) — one snapshot per session,
  captured at session start, immutable after.
- **Last-touch** (`webstats_visitors.last_touch`) — overwritten by every new
  session, including Direct ones.
- **Last non-direct** (`webstats_visitors.last_non_direct`) — overwritten
  only when the new session's channel is not Direct. A later direct visit
  can never erase it.
- **Goal/conversion attribution** (`webstats_goal_completions.attribution`)
  — a full snapshot (first-touch, session source, last-touch, last
  non-direct, landing page, visitor/session/user ids) taken at the moment of
  completion. A visitor's later sessions never change what a past
  conversion says brought them in.

Write logic for all of this lives in `libs/webstats/collect.ts`.

## Identity resolution

`identify(userId)` links the current anonymous `visitor_id` to an external
user id. What it does **not** do:

- It does not replace or delete the visitor_id — the cookie is unchanged.
- It does not rewrite any already-written `webstats_identity_events` or
  `webstats_sessions` row. Every row is stamped with whatever `user_id` the
  client had *at write time*, permanently.
- "Associating earlier anonymous activity with the identified user" happens
  at **query time**, by joining through `webstats_identity_links` on
  `visitor_id` (see `libs/webstats/journey.ts`), not by mutating history.

`webstats_identity_links` is append-only: each `identify()` call for a new
`(visitor_id, user_id)` pair inserts a row; a repeat call for the same pair
is a no-op (there's a unique index on the pair). One `user_id` can
have many linked `visitor_id`s (multiple browsers/devices) by design.

**`reset()`** clears the identified user *and* rotates the visitor cookie
and session. On a shared device, that's the point: whoever uses the browser
next must not silently continue attaching to the identity the previous,
now-logged-out person was using. This is the same choice most identity-aware
SDKs make (e.g. Mixpanel's `reset()`) and is what keeps two people on one
browser from being merged into one visitor.

**Server-side identify** — `POST /api/webstats/identify`, for linking from a
backend (e.g. a signup webhook) without going through the browser SDK:

```bash
curl -X POST https://www.saasna.me/api/webstats/identify \
  -H "Authorization: Bearer <write_key>" \
  -H "Content-Type: application/json" \
  -d '{"site_id": "...", "visitor_id": "...", "user_id": "user_456"}'
```

`write_key` is `webstats_sites.write_key` — **not** the public site id.
It's not currently surfaced in the dashboard UI; read it directly from the
database until that's added (see **Known limitations**).

## SDK (`public/js/s.js`)

Same install tag as before:

```html
<script defer data-site="SITE_ID" src="https://www.saasna.me/js/s.js"></script>
```

Public API:

```javascript
analytics.getVisitorId();
analytics.getSessionId();

analytics.page();                              // usually automatic
analytics.track("button_clicked", { button: "start_free_trial" });
analytics.goal("signup", { plan: "free" });
analytics.identify("customer-user-id", { plan: "free" });
analytics.reset();
analytics.setConsent(true);
```

- `window.saasname('name', data)` (no dot) is the **original**, unrelated
  custom-event call — it still posts to the legacy `/event` endpoint and
  still feeds the existing dashboard's bounce-rate calculation. It is not
  the same thing as `.track()`.
- `window.saasname.page/track/goal/identify/reset/setConsent/getVisitorId/getSessionId`
  is the new pipeline.
- A page view is captured automatically on load and on every SPA navigation
  (patched `pushState`/`replaceState`, `popstate`, `hashchange`, bfcache
  restore) — calling `.page()` by hand is only needed for a navigation style
  the tracker doesn't already detect.
- Transport: `navigator.sendBeacon()` first, `fetch(..., { keepalive: true })`
  as a fallback. Every failure — network, 4xx/5xx, storage blocked — is
  swallowed; the tracker never throws into the host page.

### Pre-load call queueing

Calls made before the script has loaded are only captured if you predefine
a queueing stub ahead of the script tag:

```html
<script>
  window.saasname = window.saasname || function () {
    (window.saasname.q = window.saasname.q || []).push(arguments);
  };
</script>
<script defer data-site="SITE_ID" src="https://www.saasna.me/js/s.js"></script>
```

With the stub in place, pre-load calls use the method name as the first
argument: `saasname('identify', 'user_123')`, `saasname('track', 'signup', {
plan: 'pro' })`, `saasname('goal', 'signup')`. This is optional — most
integrations don't need it, since `defer` already runs the tracker before
the page finishes parsing.

### Cookies

| Name | Lifetime | Purpose |
|---|---|---|
| `_sn_vid` | 2 years | The visitor_id. `Secure` (on HTTPS), `SameSite=Lax`, `Path=/`. |

Session state (`_sn_session_<siteId>`) and the identified user id
(`_sn_uid_<siteId>`) live in `localStorage`, not cookies — same first-party
storage model, scoped per site id so multiple tracked sites in one browser
don't collide.

### Consent

Tracking is **on by default** — the same default as most analytics SDKs.
Call `setConsent(false)` before your own consent banner has been accepted
(or permanently, if you don't want tracking at all) and:

- No visitor cookie is created or read.
- No `localStorage` session/user state is created or read.
- No request is sent to the collection endpoint.

Call `setConsent(true)` to turn it back on — a fresh visitor_id and session
are created at that point, same as a brand-new visitor. There is no
degraded "anonymous aggregate" mode when consent is denied: tracking is
fully off or fully on.

## Collection endpoint

`POST /api/webstats/collect` (Node runtime, `fra1`). Accepts `page`,
`track`, `goal` and `identify` calls. Deliberately separate from
`/api/webstats/event` — see `037_webstats_identity_events.sql`'s header for
why sharing that table would have risked corrupting the existing dashboard.

- CORS: open (`access-control-allow-origin: *`), same trust model as
  `/event` — the site id is public by design, sitting in a script tag.
- Hostname check: the beacon's URL hostname must match the resolved site's
  domain (bare, `www.` stripped) or it's silently dropped.
- Rate limiting: the same per-IP burst limiter as `/event`
  (`libs/webstats/limits.ts`). The per-site monthly quota is **not** yet
  wired to this pipeline — see **Known limitations**.
- Payload cap: 16 KB.
- Idempotency: every call carries a client-generated `event_id`
  (`webstats_identity_events`) or is deduplicated via the goal's own
  `dedupe_key` rule (`webstats_goal_completions`) — a retried/duplicated
  beacon is a no-op, not a double-count.
- Sensitive query parameters are stripped from every stored URL
  (`libs/webstats/sanitize.ts`): `token`, `access_token`, `refresh_token`,
  `password`, `secret`, `authorization`, `code`, `session`, `email`,
  case-insensitively. Pass extra names as the second argument to
  `sanitizeUrl()` to extend the list per call site.
- Malformed/oversized payloads and unrecognised fields are rejected
  silently (still `202`, matching `/event`'s "a caller must never learn a
  beacon was rejected" policy) — see `libs/webstats/collect-payload.ts`.

## Goals

Configure from `/dashboard/sites/[id]/goals`. Each goal has:

- **`key`** — what `analytics.goal(key, props)` sends. Lowercase,
  `[a-z0-9_-]`, up to 60 characters.
- **`type`** — `page`, `event`, `signup`, `click`, `form`, `download`, or
  `outbound_link`. Currently informational/for your own organisation; goal
  matching itself is driven by the `key` the SDK call sends, not by
  automatically detecting a page destination or a form submission — see
  **Known limitations**.
- **Dedupe rule**:
  - `every` — every occurrence is counted (deduplicated only against an
    exact retry of the same call, via `event_id`).
  - `once_per_session` — a second completion in the same session is a
    no-op.
  - `once_per_visitor` — a second completion, ever, from the same visitor,
    is a no-op.

A `goal()` call for a key that hasn't been configured yet is silently
dropped — it doesn't break ingestion, there's just nothing to attribute it
to.

## Dashboard

- **Overview** (existing, unchanged) — the legacy cookieless pipeline.
- **Acquisition** (`/dashboard/sites/[id]/acquisition`) — unique visitors,
  sessions, pageviews, events, goal completions, conversion rate, new vs.
  returning, identified vs. anonymous, and breakdowns by channel, source,
  medium, campaign, referrer, landing page, country and browser. A "Recent
  visitors" list links into each visitor's journey.
- **Visitor journey** (`/dashboard/sites/[id]/visitors/[visitorId]`) — one
  visitor's timeline: session starts (with source), page views, track
  events, identify calls and goal completions, in order.
- **Goals** (`/dashboard/sites/[id]/goals`) — create/delete goal
  configuration.

`libs/webstats/acquisition.ts` and `libs/webstats/journey.ts` are the read
layer; both go through the user-scoped Supabase client, so RLS — not the
`siteId` parameter — is what actually enforces "your sites only."

## Testing

- `libs/webstats/attribution.test.ts` — source-priority order, channel
  classification, internal/ignored referrers.
- `libs/webstats/sanitize.test.ts` — sensitive query-param stripping.
- `libs/webstats/collect-payload.test.ts` — payload validation, malformed
  and oversized input.
- `libs/webstats/dedupe.test.ts` — goal dedupe key computation per rule.
- `libs/webstats/session-window.test.ts` — the 30-minute session boundary.
- `e2e/tracker.spec.ts` (Playwright, fully hermetic — no dev server, no
  network) — visitor cookie attributes, one `page()` call per SPA
  navigation with a stable visitor/session id, `identify()`/`reset()`
  behaviour including visitor rotation, `setConsent(false)` blocking all
  tracking, and the tracker not throwing when the collection endpoint is
  down.

Run: `npm test` (vitest), `npm run test:e2e` (Playwright).

## Known limitations / deferred improvements

- **Monthly quota** (`webstats_month_events`) counts only the legacy
  `webstats_events` table. A site using both pipelines heavily could exceed
  its plan's intended volume without the new pipeline being counted against
  it. The per-IP burst limiter still applies. Wiring a combined quota is
  the natural next step if this pipeline sees real traffic.
- **`write_key` has no dashboard UI** yet for viewing/rotating it — read it
  directly from `webstats_sites.write_key` for now. Needs a "Server API"
  panel alongside the existing site options menu.
- **Goal types beyond `key` matching are not auto-detected.** A `page`-type
  goal doesn't yet fire automatically when a visitor reaches a configured
  path, nor do `click`/`form`/`download`/`outbound_link` goals auto-attach
  listeners — every goal today fires because the customer's own code calls
  `analytics.goal(key, ...)`. Auto-detected goals are a real feature gap,
  not just a nice-to-have, for customers who don't want to instrument their
  own code.
- **No merged cross-visitor "everything this user has ever done" view.**
  `listRecentVisitors`/`getVisitorJourney` operate per-`visitor_id`. A true
  per-`user_id` timeline spanning every linked visitor_id is possible via
  `webstats_identity_links` but needs each visitor_id's contribution
  time-bounded to its `[linked_at, unlinked_at)` window — otherwise a
  shared-device handoff between two real people could mix their activity in
  that merged view. Not built yet; flagging so it's built correctly when it
  is.
- **Pre-load queueing** is opt-in via a stub snippet the install screen
  doesn't generate automatically yet (documented above, not wired into
  `libs/webstats/snippet.ts`'s generated variants) — most integrations
  don't need it, since the default tag is `defer`.
- **Goal dropdowns in the dashboard use native `<select>`s** rather than the
  themed dropdown pattern used elsewhere (`GroupPicker`, `NewMenu`) — a
  lower-traffic admin surface, left as a known follow-up.
