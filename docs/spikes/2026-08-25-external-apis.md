# External API spikes — 2026-08-25

## Socials

Probe method: `GET` with a desktop User-Agent, `redirect: "manual"`. Script: `scripts/spikes/socials.ts`.
Validated against two independent handle pairs (`slack`/`zzqxwvunlikelyhandle99`, then `vercel`+`stripe`/`qxzvpltnobodyhas7391`+`wmkjrbzxfake2026x`).

| Platform | Direct fetch distinguishes? | Via Firecrawl? | v1 verdict |
|---|---|---|---|
| GitHub | Yes — 200 taken / 404 free | n/a (not needed) | INCLUDE |
| X | Yes — 200 taken / 404 free | n/a (not needed) | INCLUDE |
| Instagram | No — 200 + identical ~618 KB login-wall HTML for both | No — Firecrawl returns "we do not support this site" | DROP |
| TikTok | No — 200 + identical 1462-byte Slardar/WAF shell for both | No — Firecrawl returns "we do not support this site" | DROP |
| LinkedIn | Yes — 200 or 301 (alias redirect) taken / 404 free | n/a (not needed) | INCLUDE |

**Platforms included in v1:** GitHub, X, LinkedIn (company pages)
**Platforms dropped:** Instagram (serves an identical logged-out wall with HTTP 200 for both existing and non-existent handles; Firecrawl explicitly refuses the domain), TikTok (WAF challenge shell with HTTP 200 and byte-identical body for both cases; Firecrawl explicitly refuses the domain)

### Implementation notes for Phase 5

- Treat `2xx` and `3xx` as **taken**, `404` as **available**. LinkedIn returns `301` for alias handles (`/company/slack` → `/company/tiny-spec-inc`), which still means taken — so do not follow redirects, and do not treat `3xx` as an error.
- Any other status (`403`, `429`, `5xx`, network error) must map to an `unknown` result, never to `available`. A false "available" is the worst failure mode for this feature.
- Only the response status is needed; do not read the body. Use `method: "GET"` with `redirect: "manual"` — `HEAD` was not validated and some of these hosts behave differently for it.
- A desktop `User-Agent` is required; the default fetch UA is more likely to be challenged.
- These are unofficial, undocumented endpoints and can break without notice. Wrap each probe in a timeout, run them in parallel, and degrade to `unknown` per-platform rather than failing the whole request.

---

## Google Play

**Verdict:** WORKS

**Search URL pattern:** `https://play.google.com/store/search?q={term}&c=apps`
**Detail URL pattern:** `https://play.google.com/store/apps/details?id={packageId}`

**Firecrawl credits per check:** 1 credit per `markdown` scrape; **5 credits** per
`json` (LLM-extraction) scrape. Both observed directly in
`metadata.creditsUsed`. A full app check = 1 search scrape + 1 detail scrape =
**2 credits** on the markdown path, or **6 credits** on the json path.

**Signals extractable (from the DETAIL page):**
rating average **yes**, rating count **yes**, install band **yes**,
last updated **yes**, developer **yes**, app title **yes**.

**Signals extractable (from the SEARCH page):** title **yes**, developer **yes**,
rating average **yes**, rating count **yes**, install band **yes**,
last updated **NO**. The top "featured" result on the search page carries a
richer block than the sibling result cards, which only carry
title / developer / rating average. Treat the search page as a *package-id
discovery* step and always follow up with a detail scrape.

### API request shape (v2)

`POST https://api.firecrawl.dev/v2/scrape`, `Authorization: Bearer $FIRECRAWL_API_KEY`.

**Gotcha:** in v2 the structured-extraction options live *inside* `formats` as an
object, not as a top-level `jsonOptions` key. The v1 shape returns
`HTTP 400 BAD_REQUEST — Unrecognized key in body ... "jsonOptions"`.

```jsonc
// correct (v2)
{ "url": "...", "formats": [{ "type": "json", "prompt": "...", "schema": { ... } }] }
// rejected with 400
{ "url": "...", "formats": ["json"], "jsonOptions": { "prompt": "...", "schema": { ... } } }
```

### Extraction notes — markdown path (1 credit)

Real output for `id=com.Slack`, in document order. Anchors the parser should key off:

| Signal | Appears as | Parse rule |
|---|---|---|
| App title | `# Slack` | first `#` H1 on the page |
| Developer | `[SLACK TECHNOLOGIES L.L.C.](https://play.google.com/store/apps/developer?id=...)` | first markdown link whose href contains `/store/apps/developer?id=` — link **text** is the developer name |
| Rating average | `4.6 _star_` | regex `/^([\d.]+)\s+_star_$/m` — note the `_star_` italic marker is the icon ligature |
| Rating count | `212K reviews` (line immediately after the rating) | regex `/^([\d.]+[KMB]?)\s+reviews$/m`. Beware: the page contains this **twice** with *different* values — `212K reviews` in the header and `206K reviews` in the ratings-histogram section further down. Take the **first** match (header). |
| Install band | `50M+` on one line, `Downloads` on the very next line | regex `/^([\d.]+[KMB]?\+)\n\nDownloads$/m` — the number and the word "Downloads" are separate markdown blocks |
| Last updated | `Updated on` then `Aug 24, 2026` on the next block | regex `/Updated on\n\n(.+)/` — US-format `MMM D, YYYY` |

Package id is also available without parsing the body, from
`metadata["appstore:bundle_id"]` / `metadata["appstore:store_id"]` (both
`com.Slack`), and the canonical URL from `metadata["og:url"]`.

### Extraction notes — json path (5 credits)

Passing the six-field schema returned exactly, first try, no retries:

```json
{
  "title": "Slack",
  "developer": "SLACK TECHNOLOGIES L.L.C.",
  "ratingAverage": 4.6,
  "ratingCount": "212K reviews",
  "installBand": "50M+ Downloads",
  "updatedOn": "Aug 24, 2026"
}
```

Note it picked the **header** rating count (212K), not the histogram's 206K —
which is the value we want. `ratingCount` and `installBand` come back as display
strings, so a `"212K" -> 212000` / `"50M+" -> 50000000` normalizer is still
needed either way.

**Recommendation:** use the **markdown path** (1 credit) with the regexes above.
The anchors are stable text ligatures, and it is 5x cheaper. Keep the json path
as a fallback for pages where the markdown regexes miss.

### Not-found / delisted handling

`id=com.saasname.doesnotexist12345` and `id=com.nolanlawson.logcat` (delisted)
both return the same shape — Firecrawl call itself succeeds (`HTTP 200`,
`success: true`, 1 credit still charged), but:

- `data.metadata.statusCode` is **404**
- `data.metadata.error` is `"Not Found"`
- `data.metadata.title` is `"Not Found"`
- `data.markdown` is `"We're sorry, the requested URL was not found on this server."`

**The caller MUST check `data.metadata.statusCode === 200`.** A 404 does not
surface as a non-2xx on the Firecrawl HTTP response, so naive `res.ok` checks
will silently treat a delisted app as a successful empty scrape.

### Other observations

- `proxyUsed: "basic"` — no stealth proxy needed; Google Play did not block.
- Firecrawl caches aggressively (`cacheState: "hit"`, `cachedAt`). Freshness of
  the `Updated on` signal is therefore bounded by cache age; pass `maxAge: 0`
  if a live read matters.
- Each response ends with a `reCAPTCHA / Recaptcha requires verification.`
  footer block. This is inert boilerplate present even on successful scrapes —
  do **not** treat its presence as a bot-block signal.
- `onlyMainContent: true` was used for all markdown probes; it removes nav chrome
  but retains every one of the five signals.

### Untested caveat

Not verified: an app with **too few installs for Google to display a rating**
(Play hides the rating block below a threshold). Both low-profile package ids
tried returned 404 instead. Phase 5 should treat rating average / rating count /
install band as **optional** fields and not fail the rollup when they are absent
from an otherwise-200 detail page.

### Key location

`FIRECRAWL_API_KEY` is **not** in `.env.local`. It is exported from the
developer's `~/.zshrc` (prefix `fc-`), which is why `npx tsx` picks it up.
Phase 5 must add it to `.env.local` / deployment env explicitly — relying on
the ambient shell export will break in CI and on Vercel.

---

## USPTO

**Verdict:** `TMSEARCH_FALLBACK_REQUIRED`

**Endpoint that works:** `POST https://tmsearch.uspto.gov/prod-stage-v1-0-0/tmsearch`
**Auth:** none — no API key, no cookie, no AWS WAF token, no `Origin`/`Referer` required. Verified with a bare `curl` from a clean context.
**Rate limit observed:** none hit. 30 sequential requests in 14s (~128 req/min) and a 25-way concurrent burst both returned `200` across the board. No `Retry-After`, no `429`. Undocumented, so assume it can change.
**Sample response shape:** see below — `wordmark` (mark text), `alive` (status), `internationalClass` (class), `ownerName` (owner), `filedDate` (filing date).

Script: `scripts/spikes/uspto-trademark.ts`.

### The Open Data Portal has no trademark endpoints at all

The legacy Developer Hub was decommissioned 2026-06-05. Its replacement,
`api.uspto.gov`, sits behind AWS API Gateway, which conveniently distinguishes
the two failure modes for us:

| Response | Meaning |
|---|---|
| `401 {"message":"Unauthorized"}` | route **exists**, needs an API key |
| `403 {"message":"Missing Authentication Token"}` | route **does not exist** |

Probing with **no API key** is therefore still conclusive. Results:

```
403 [ROUTE DOES NOT EXIST] https://api.uspto.gov/api/v1/trademark/applications/search
403 [ROUTE DOES NOT EXIST] https://api.uspto.gov/api/v1/trademarks/search
403 [ROUTE DOES NOT EXIST] https://api.uspto.gov/api/v1/trademark/search
403 [ROUTE DOES NOT EXIST] https://api.uspto.gov/api/v1/trademarks/applications/search
403 [ROUTE DOES NOT EXIST] https://api.uspto.gov/api/v1/trademark
403 [ROUTE DOES NOT EXIST] https://api.uspto.gov/api/v1/trademark/casedocuments/search
403 [ROUTE DOES NOT EXIST] https://api.uspto.gov/api/v1/tm/search
401 [route exists, needs API key] https://api.uspto.gov/api/v1/patent/applications/search   <- control
403 [ROUTE DOES NOT EXIST] https://api.uspto.gov/api/v1/zzzz/nonexistent                    <- control
```

The patent control returning `401` while every trademark path returns `403`
proves the ODP exposes **patent data only**. `ODP_SEARCH_WORKS` is ruled out,
and **no `USPTO_API_KEY` is needed** — do not add one to `.env.local`.

TSDR (`https://tsdrapi.uspto.gov/ts/cd/casestatus/sn{serial}/info.json`) is
still up but now returns `401` demanding an API key, and in any case is
**lookup-by-serial-number, not search** — useless for "is this name taken".

### How the tmsearch endpoint was found

`https://tmsearch.uspto.gov` is a static Angular SPA served from S3 (POSTs to
the origin return S3 `MethodNotAllowed` XML). Its backend base URL is published
in plaintext and requires no reverse-engineering:

```
GET https://tmsearch.uspto.gov/configuration.json
  -> { "serviceUrlSearchElastic": "https://tmsearch.uspto.gov/prod-stage-v1-0-0/", ... }
```

Confirmed by driving the real UI in a headless browser and capturing the XHR:
one `POST` to `{serviceUrlSearchElastic}tmsearch`, with **no `Authorization`
header and no auth cookie**.

The SPA does load an AWS WAF challenge script
(`a434627cf98f.edge.sdk.awswaf.com`), but the search endpoint answered a bare
`curl` with no WAF token, so the challenge is not enforced on this route today.

### Request shape

The body is **raw Elasticsearch query DSL, passed through to the index**. This is
the exact query the official UI sends for a wordmark search (`WM` = wordmark,
`PM` = pseudo-mark):

```jsonc
{
  "query": { "bool": { "must": [ { "bool": { "should": [
    { "match_phrase": { "WM": { "query": "slack", "boost": 5 } } },
    { "match":        { "WM": { "query": "slack", "boost": 2 } } },
    { "match_phrase": { "PM": { "query": "slack", "boost": 2 } } }
  ] } } ] } },
  "size": 100, "from": 0, "track_total_hits": true,
  "_source": ["wordmark", "ownerName", "registrationId", "internationalClass",
              "filedDate", "registrationDate", "alive", "markType", "goodsAndServices"],
  "aggs": { "alive": { "terms": { "field": "alive" } } }
}
```

Only `Content-Type: application/json` is required. `size: 100` is what the UI
uses; drop it to `5`–`10` for our purposes.

For an **exact** wordmark hit (the signal that actually matters for a hard
blocker), `{"query":{"bool":{"must":[{"term":{"WM":"slack"}}]}}}` works and
returned 115 exact `SLACK` records.

### Response shape

Note the field names are **remapped from standard Elasticsearch** — `_source` →
`source`, `_id` → `id`, `hits.total.value` → `hits.totalValue`. Do not reach for
an off-the-shelf ES client.

```jsonc
{
  "took": 3, "timedOut": false,
  "hits": {
    "totalValue": 201, "totalRelation": "eq", "maxScore": 119.97,
    "hits": [ { "index": "tmsearch-index", "type": "_doc", "id": "85911730",
                "score": 119.97, "source": { /* fields below */ } } ]
  },
  "aggregations": { "alive": { "buckets": [ { "key": 0, "key_as_string": "false", "doc_count": 127 },
                                            { "key": 1, "key_as_string": "true",  "doc_count": 74 } ] } }
}
```

Fields the scoring rollup needs, all confirmed present:

| Need | Field | Example |
|---|---|---|
| Mark text | `wordmark` (string) | `"SLACK FUN"` |
| Status (live/dead) | `alive` (**boolean**) | `false` |
| Class | `internationalClass` (string[]) | `["IC 028"]` |
| Owner | `ownerName` (string[]) | `["ID-Sports GmbH (LIMITED LIABILITY COMPANY; GERMANY)"]` |
| Filing date | `filedDate` (ISO, no TZ) | `"2013-04-23T00:00:00"` |

Also useful: `id` (serial number, e.g. `85911730`), `registrationId`
(**nullable** — null when never registered), `registrationDate` (nullable),
`markType` (`["TRADEMARK"]`), `goodsAndServices` (string[], prefixed
`"(CANCELLED) IC 028: ..."` for dead marks), `ownerFullText`, `abandonDate`,
`cancelDate`.

The `aggs.alive` bucket gives a free live-vs-dead count for the whole result
set without paging — use it for the rollup headline.

### Implementation notes for Phase 5

- **`alive` is the blocker signal, not hit count.** 201 total hits for "slack"
  but only 74 alive. A dead/cancelled/abandoned mark is not a blocker.
- Prefer the exact `term` query on `WM` for the hard-blocker decision, and the
  boosted `match`/`match_phrase` query for the "similar marks" advisory list.
- `internationalClass` matters: a live mark in an unrelated class is a soft
  signal, not a hard blocker. Software/SaaS is typically IC 009 / IC 042.
- `registrationId` and `registrationDate` are nullable — a pending application
  has neither. Do not assume they exist.
- Anything other than a `200` with a parseable `hits` object must map to
  `unknown`, never to "no conflict". A false "clear" is the worst failure mode.
- Set a short timeout and wrap in try/catch. This is an **undocumented internal
  endpoint of a government SPA** with no stability guarantee, no terms of use
  covering programmatic access, and no published rate limit. Re-read
  `configuration.json` at build time rather than hardcoding
  `prod-stage-v1-0-0` if the path proves to drift between releases.
- Cache aggressively (results change on the order of days, not seconds) to keep
  our request volume low and reduce the chance of being blocked.

### Risk

`TMSEARCH_FALLBACK_REQUIRED` means v1 ships on an unofficial endpoint. It works
well and returns richer data than the old Developer Hub API did, but USPTO could
put it behind the WAF challenge at any time. Contingency if that happens:
degrade trademark to `unknown` (advisory, not a hard blocker) rather than
failing the whole name check — i.e. have the `NOT_VIABLE_FOR_V1` fallback path
coded from day one even though the verdict today is that it works.
