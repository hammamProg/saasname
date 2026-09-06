# DataFast-style re-theme — design

**Date:** 2026-09-06
**Status:** Approved

## Goal

Rebuild the landing page and re-skin the dashboard to match the visual language of [datafa.st](https://datafa.st), while keeping this product's own copy, data, and honesty principles (no fabricated social proof, no numbers the pipeline hasn't produced).

## Source material

Pulled via Firecrawl branding extraction + full-page screenshot of datafa.st (2026-09-06):

- Background: `#FBFAF9` (warm off-white)
- Primary CTA: `#E16540` (coral/orange), white text, 8px radius, layered soft shadow (`0 1px 1px rgba(0,0,0,.06), 0 8px 16px -8px rgba(225,101,64,.64), inset 0 -1px 2px rgba(181,81,51,.48)`)
- Secondary/link color: `#1D9BF0` (blue)
- Body text: `#536471` (muted), headings near-black
- Font: DM Sans, h1 ~60px, h2 ~48px, body 16px
- Base spacing unit 4px, border radius 8px on inputs/buttons, larger (~1rem+) on cards
- Layout flow: hero (headline + CTA + product screenshot) → social-proof avatar/tweet row → numbered 3-step cards → feature blocks with embedded screenshots → dark terminal "AI agent" block → integration logo grid → founder letter → testimonial → 2-tier pricing cards → FAQ accordion → final CTA → footer with mini dashboard graphic

## Decisions

1. **Copy scope:** Structure + style — rebuild the landing page using DataFast's section flow, rewritten with this product's own copy/screenshots. Not a literal text clone.
2. **Dashboard scope:** Re-skin + layout tweaks — recolor/retype the existing dashboard (sidebar, top bar, trend cards, stats) to the DataFast visual language, plus minor density/layout adjustments. No new dashboard features, no change to data fetching or business logic.
3. **Social proof:** Omitted. DataFast's testimonial row, live user counter, and founder-letter section are skipped entirely — this codebase has an existing principle (see comments in `TrendCardSample.tsx`, `LandingHowItWorks.tsx`) of never showing a claim or number the product hasn't earned. No placeholders, no fabricated quotes/avatars/counts.
4. **Out of scope:** Leftover naming-tool components (`CandidateList`, `CheckCard`, `NamingAnimation`, `RunStepper`, etc.) — dead code from a prior product pivot, untouched by this work. No business logic, data-fetching, or auth changes.

## Design tokens (`app/globals.css`)

Replace the current blue/violet/navy palette with a warm coral system, applied to both `:root` and `.landing-theme`:

| Token | Old | New |
|---|---|---|
| `--background` | `#F7F9FC` / `#FFFFFF` | `#FBFAF9` |
| `--foreground` | `#021B42` / `#08203F` | `#1A1A1A` |
| `--muted` | `#55627A` / `#55658A` | warm gray, e.g. `#6B6660` |
| `--border` | navy-tinted rgba | warm-tinted rgba, e.g. `rgba(26,26,26,0.1)` |
| `--primary` | `#008DF7` / `#0A6ED1` | `#E16540` |
| `--primary-hover` | `#0072C9` / `#0857A8` | darkened coral, e.g. `#C0532F` |
| `--accent` | `#00BDFC` / `#3C3FEB` | `#1D9BF0` |
| `--surface` | `#EDF4FD` / `#F4F8FD` | warm gray, e.g. `#F4F1EC` |

- Font: swap Inter → DM Sans via `next/font/google` in `app/layout.tsx`; update `--font-sans` mapping.
- `.btn-primary` / `.btn-gradient`: solid coral fill, 8px radius, DataFast's layered shadow instead of the current single blue glow.
- `.card` / `.glass-card`: white background, warm 1px border, keep current ~1rem radius (DataFast cards are chunkier than their buttons), subtle shadow on hover unchanged in mechanics, recolored.
- Verdict/stage colors (`--verdict-*`) stay as-is — they're semantic (clear/contested/blocked), not brand colors.

## Landing page (`app/page.tsx` + `components/landing/*`)

Reordered/restyled flow, same components, no new data dependencies:

1. **`LandingHero`** — same headline/CTA structure, recolored (coral CTA), trend-card mockup restyled with a browser-chrome frame treatment.
2. **`LandingHowItWorks`** — restyle the 3 numbered steps as DataFast-style cards (dark numbered badge instead of gradient-text numeral).
3. **`LandingTrendAnatomy`** — restyle as a two-column feature block (sticky sample card + annotation list), matching DataFast's "Analytics that bring customers" section treatment.
4. **Sources strip** (currently the bottom block of `LandingTrendAnatomy`) — restyle as a standalone DataFast-style chip/logo grid ("Reading every day: ...").
5. **`LandingPricing`** — restyle `PlanCards` to DataFast's clean 2-card layout (existing plan data, no new tiers).
6. **`LandingFAQ`** — restyle accordion visuals only, same content/behavior.
7. **`LandingFinalCTA`** — restyle, coral CTA on warm background.

No testimonial, user-counter, founder-letter, or AI-agent-terminal sections are added.

## Header / Footer

Recolor to the warm/coral tokens; no structural changes (nav links, mobile menu behavior stay as-is).

## Dashboard re-skin (`components/dashboard/*`, `app/dashboard/*`)

- `AppSidebar`, `DashboardTopBar`: recolor hardcoded navy hex values (`#0E2A52`, `#8FA6C6`, etc. — currently bypass the token system) to warm/coral equivalents; keep structure and interaction logic unchanged.
- `TrendCard`, `DashboardStats`, badges/pills (stage labels, credit balance): recolor to warm/coral tokens; light density/spacing tightening where cards read as loose compared to DataFast's tighter stat-tile style.
- No changes to data fetching, follow/hide actions, locking logic, or routes.

## Testing / verification

- `npm run build` (or equivalent typecheck) after changes — this is a styling/markup change, not new logic, so no new unit tests are required. Existing tests (`feed.test.ts`, `follows.test.ts`, `snapshot.test.ts`, `plans.test.ts`) must continue to pass since no data-layer code changes.
- Manual visual check: landing page and dashboard in the browser (light theme only — this product doesn't have a dark mode toggle).
