# DataFast Re-theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-theme the landing page and dashboard to match datafa.st's visual language (warm off-white background, coral CTA, DM Sans, chunky rounded cards) while keeping this product's own copy, data, and no-fabricated-social-proof principle.

**Architecture:** This app already runs a CSS-custom-property design token system (`app/globals.css`) that `.card`, `.btn-gradient`, `.btn-primary`, and most component classNames read from. The bulk of the re-theme is therefore a token-value swap in one file plus a font swap, which cascades to any component using token-based utility classes (`bg-background`, `text-muted`, `border-border`, `bg-primary-soft`, `.btn-gradient`, `.card`, etc.) with zero code changes. A smaller set of components hardcode colors outside the token system (`components/ui/MarketingBackdrop.tsx`) or need structural markup changes called out in the design spec (hero mockup framing, step-card badges, FAQ chevron, sources strip extraction) — those get dedicated tasks.

**Tech Stack:** Next.js 16 App Router, Tailwind CSS v4 (`@theme inline` token mapping), `next/font/google`, React 19 (Server + Client Components), Vitest.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-09-06-datafast-retheme-design.md`
- No fabricated social proof: no testimonials, user counters, or founder-letter content is added anywhere in this plan.
- No changes to data fetching, business logic, auth, payments, or routes — this is a styling/markup-only plan.
- Do not touch dead/unused files: `components/dashboard/AppSidebar.tsx`, `components/dashboard/DashboardShell.tsx`, `components/Hero.tsx`, `components/CTA.tsx`, `components/ButtonGradient.tsx`, `components/FeaturesAccordion.tsx`, `components/dashboard/DashboardStats.tsx`, `components/dashboard/SearchProgress.tsx`, `components/dashboard/NamingAnimation.tsx`, `components/dashboard/GenerateForm.tsx`, `components/dashboard/CandidateList.tsx`, `components/dashboard/CheckCard.tsx` — confirmed via `grep -rl` that none of these are imported from any active `app/` route except their own definitions (and `DashboardShell`/`AppSidebar`'s dead sidebar-variant branch of `ButtonAccount.tsx`, which is also left untouched).
- Verify with `npm run lint`, `npm run build`, `npm test` (Vitest) — no new automated tests are added since this plan makes no logic changes; existing tests (`libs/trends/feed.test.ts`, `libs/trends/follows.test.ts`, `libs/trends/snapshot.test.ts`, `libs/plans.test.ts`) must keep passing untouched.
- Color values throughout: primary coral `#E16540` (hover `#C0532F`), secondary/link blue `#1D9BF0`, warm off-white background `#FBFAF9`, near-black foreground `#1A1A1A`, warm gray muted `#6B6660`, warm gray surface `#F4F1EC`. These exact hex values are used consistently across every task below — do not substitute different shades.

---

## Task 1: Design tokens and font swap

**Files:**
- Modify: `app/globals.css`
- Modify: `app/layout.tsx`

**Interfaces:**
- Produces: CSS custom properties `--background`, `--foreground`, `--muted`, `--border`, `--card`, `--primary`, `--primary-hover`, `--primary-soft`, `--accent`, `--accent-soft`, `--accent-warm`, `--surface`, `--surface-dark` (both in `:root` and `.landing-theme`) now resolve to the coral/warm palette. CSS variable `--font-dm-sans` (renamed from `--font-inter`) is produced by `app/layout.tsx` and consumed by `app/globals.css`. Every later task relies on these token values already being in place — no later task redefines them.
- Consumes: nothing (this is the foundation task).

- [ ] **Step 1: Replace the color tokens and button/card color literals in `app/globals.css`**

Open `app/globals.css`. Make these exact replacements (all other rules in the file — keyframes, `.legal-body`, `.landing-grid-bg` sizing, `.animate-*` mechanics, `--verdict-*`, `--brand-ink`/`--brand-violet`/`--brand-indigo`/`--brand-blue`/`--brand-cyan` — are left untouched; those brand-* tokens are only consumed by dead components per the Global Constraints list):

Replace the `:root` block (lines 3–30) with:

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

  --background: #FBFAF9;
  --foreground: #1A1A1A;
  --muted: #6B6660;
  --border: rgba(26, 26, 26, 0.1);
  --card: #ffffff;
  --primary: #E16540;
  --primary-hover: #C0532F;
  --primary-soft: rgba(225, 101, 64, 0.12);
  --accent: #1D9BF0;
  --accent-soft: rgba(29, 155, 240, 0.1);
  --accent-warm: #E16540;
  --surface: #F4F1EC;
  --surface-dark: #1A1A1A;

  --brand-gradient: linear-gradient(135deg, #E16540 0%, #EF8B62 100%);
}
```

In the `@theme inline` block, change the line:
```css
  --font-sans: var(--font-inter);
```
to:
```css
  --font-sans: var(--font-dm-sans);
```

Change the `body` rule's font line from:
```css
  font-family: var(--font-inter), system-ui, sans-serif;
```
to:
```css
  font-family: var(--font-dm-sans), system-ui, sans-serif;
```

Change the `::selection` rule from:
```css
::selection {
  background: rgba(0, 189, 252, 0.35);
  color: var(--foreground);
}
```
to:
```css
::selection {
  background: rgba(225, 101, 64, 0.3);
  color: var(--foreground);
}
```

Replace the `.btn-primary`, `.btn-primary:hover`, `.btn-primary:disabled` rules with:

```css
.btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  border-radius: 0.5rem;
  background: var(--primary);
  color: #ffffff;
  font-weight: 700;
  transition: background 0.2s, transform 0.2s, box-shadow 0.2s;
  box-shadow: 0 1px 1px rgba(0, 0, 0, 0.06), 0 8px 16px -8px rgba(225, 101, 64, 0.55);
}

.btn-primary:hover {
  background: var(--primary-hover);
  transform: translateY(-1px);
  box-shadow: 0 1px 1px rgba(0, 0, 0, 0.08), 0 10px 20px -8px rgba(225, 101, 64, 0.6);
}

/* Unlayered, so this beats any `disabled:*` utility a caller adds.
   A disabled button still has to read as a button. The previous fill sat a
   hair off the page background, so the control looked absent rather than
   unavailable — which made enabling it look like something appearing instead
   of something changing state. */
.btn-primary:disabled {
  background: #EDE9E3;
  border: 1px solid rgba(26, 26, 26, 0.14);
  color: var(--muted);
  box-shadow: none;
  transform: none;
  cursor: not-allowed;
}
```

Replace the `.landing-theme` and `.landing-theme ::selection` rules with:

```css
.landing-theme {
  --background: #FBFAF9;
  --foreground: #1A1A1A;
  --muted: #6B6660;
  --border: rgba(26, 26, 26, 0.08);
  --card: #FFFFFF;
  --primary: #E16540;
  --primary-hover: #C0532F;
  --primary-soft: rgba(225, 101, 64, 0.1);
  --accent: #1D9BF0;
  --accent-soft: rgba(29, 155, 240, 0.08);
  --accent-warm: #E16540;
  --surface: #F4F1EC;
  --surface-dark: #1A1A1A;
  background: var(--background);
  color: var(--foreground);
}

.landing-theme ::selection {
  background: rgba(225, 101, 64, 0.22);
  color: var(--foreground);
}
```

Leave `.gradient-text` unchanged — it already reads `color: var(--primary)`, so it now renders coral automatically.

In `.glass-card`, change the box-shadow line from:
```css
  box-shadow: 0 1px 2px rgba(8, 32, 63, 0.04);
```
to:
```css
  box-shadow: 0 1px 2px rgba(26, 26, 26, 0.05);
```

Replace `.btn-gradient` and `.btn-gradient:hover` with:

```css
.btn-gradient {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  border-radius: 0.625rem;
  background: var(--primary);
  color: #ffffff;
  font-weight: 700;
  transition: background 0.2s, transform 0.2s, box-shadow 0.2s;
  box-shadow: 0 1px 1px rgba(0, 0, 0, 0.06), 0 8px 16px -8px rgba(225, 101, 64, 0.5), inset 0 -1px 2px rgba(180, 81, 51, 0.35);
}

.btn-gradient:hover {
  background: var(--primary-hover);
  transform: translateY(-1px);
  box-shadow: 0 1px 1px rgba(0, 0, 0, 0.08), 0 10px 20px -8px rgba(225, 101, 64, 0.55), inset 0 -1px 2px rgba(180, 81, 51, 0.4);
}
```

In `.btn-ghost:hover`, change:
```css
  border-color: rgba(10, 110, 209, 0.3);
```
to:
```css
  border-color: rgba(225, 101, 64, 0.3);
```

In `.landing-grid-bg`, change both grid-line rgba values from `rgba(8, 32, 63, 0.045)` to `rgba(26, 26, 26, 0.045)`:
```css
.landing-grid-bg {
  background-image:
    linear-gradient(to right, rgba(26, 26, 26, 0.045) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(26, 26, 26, 0.045) 1px, transparent 1px);
  background-size: 4rem 4rem;
  mask-image: radial-gradient(ellipse 80% 60% at 50% 0%, #000 30%, transparent 100%);
}
```

Leave `.brand-panel`, `.brand-icon-chip`, `.highlight`, and the `.animate-analysis-sweep` / `.animate-log-line-in` / `.animate-pulse-ring` / `.animate-ready-pop` keyframes untouched — confirmed via `grep -rln` that `.brand-panel` and `.brand-icon-chip` are unused anywhere in `app/`/`components/`, `.highlight` is only used by the dead `components/FeaturesAccordion.tsx`, and the four animation classes are only used by the dead naming-tool flow (`SearchProgress.tsx`, `NamingAnimation.tsx`, `GenerateForm.tsx`).

- [ ] **Step 2: Swap the font from Inter to DM Sans in `app/layout.tsx`**

Change:
```typescript
import { Inter } from "next/font/google";
```
to:
```typescript
import { DM_Sans } from "next/font/google";
```

Change:
```typescript
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});
```
to:
```typescript
const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});
```

Change:
```typescript
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
```
to:
```typescript
    <html lang="en" className={`${dmSans.variable} h-full antialiased`}>
```

- [ ] **Step 3: Verify the build**

Run: `npm run build`
Expected: build succeeds with no TypeScript or CSS errors. `next build` will fail loudly if `DM_Sans` isn't a valid `next/font/google` export or if `app/globals.css` has a syntax error — both are the failure modes this step catches.

- [ ] **Step 4: Visual smoke check**

Run: `npm run dev`, open `/` and `/dashboard` (sign in first if needed) in a browser.
Expected: page background is warm off-white (not blue-white), body text renders in DM Sans (rounder, slightly heavier than Inter), every button that was previously blue (Start free, Upgrade, etc.) is now coral/orange.

- [ ] **Step 5: Commit**

```bash
git add app/globals.css app/layout.tsx
git commit -m "feat: swap design tokens and font to DataFast-style warm/coral theme"
```

---

## Task 2: Recolor `MarketingBackdrop`

**Files:**
- Modify: `components/ui/MarketingBackdrop.tsx`

**Interfaces:**
- Consumes: nothing new (same `MarketingBackdropProps` as before: `className?`, `variant?: "hero" | "section" | "dashboard"`, `dark?`, `cover?`).
- Produces: same component signature; only the inline `rgba(...)` gradient colors change. `LandingHero.tsx` (Task 3) and `LandingFinalCTA.tsx` (unchanged) both render this component with `dark` set, and pick up the new coral/blue radial gradients automatically.

This file hardcodes gradient colors outside the CSS variable system (`bg-[radial-gradient(...)]` inline arbitrary values), so it needs direct edits — Task 1's token swap does not reach it.

- [ ] **Step 1: Replace the hardcoded blue/violet gradient colors**

In the `dark` branch, change:
```tsx
        <div
          className={cn(
            "absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(10,110,209,0.10),transparent_62%)]",
            !cover && height
          )}
        />
        <div
          className={cn(
            "absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(98,46,248,0.06),transparent_52%)]",
            !cover && height
          )}
        />
        <div
          className={cn(
            "absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(0,189,252,0.06),transparent_45%)]",
            !cover && height
          )}
        />
```
to:
```tsx
        <div
          className={cn(
            "absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(225,101,64,0.12),transparent_62%)]",
            !cover && height
          )}
        />
        <div
          className={cn(
            "absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(29,155,240,0.05),transparent_52%)]",
            !cover && height
          )}
        />
        <div
          className={cn(
            "absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(225,101,64,0.05),transparent_45%)]",
            !cover && height
          )}
        />
```

In the non-dark branch, change:
```tsx
      <div
        className={cn(
          "absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(10,110,209,0.08),transparent_55%)]",
          !cover && height
        )}
      />
```
to:
```tsx
      <div
        className={cn(
          "absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(225,101,64,0.08),transparent_55%)]",
          !cover && height
        )}
      />
```

And change the grid-line color in the same branch from:
```tsx
          "[background-image:linear-gradient(to_right,rgba(8,32,63,0.045)_1px,transparent_1px),linear-gradient(to_bottom,rgba(8,32,63,0.045)_1px,transparent_1px)]",
```
to:
```tsx
          "[background-image:linear-gradient(to_right,rgba(26,26,26,0.045)_1px,transparent_1px),linear-gradient(to_bottom,rgba(26,26,26,0.045)_1px,transparent_1px)]",
```

- [ ] **Step 2: Verify with lint**

Run: `npm run lint`
Expected: no errors (this is a pure value edit, no new imports or logic).

- [ ] **Step 3: Visual check**

Run `npm run dev`, open `/`. Expected: the soft glow behind the hero headline and behind the final-CTA section is now a warm coral wash instead of blue/violet.

- [ ] **Step 4: Commit**

```bash
git add components/ui/MarketingBackdrop.tsx
git commit -m "feat: recolor marketing backdrop glows to coral/blue"
```

---

## Task 3: Hero browser-chrome mockup frame

**Files:**
- Modify: `components/landing/TrendCardSample.tsx`
- Modify: `components/landing/LandingHero.tsx`

**Interfaces:**
- Produces: `TrendCardSample` gains a new optional prop `frameless?: boolean` (default `false`). When `true`, the component renders its content with `p-6 sm:p-7` padding only (no `glass-card` border/shadow/radius) so it can sit inside an external frame. `components/landing/LandingTrendAnatomy.tsx` (Task 5) continues to call `<TrendCardSample className="lg:sticky lg:top-24" />` with no `frameless` prop and is unaffected.
- Consumes: `cn` from `@/libs/cn` (already imported).

- [ ] **Step 1: Add the `frameless` prop to `TrendCardSample`**

In `components/landing/TrendCardSample.tsx`, change the function signature from:
```tsx
export default function TrendCardSample({
  trend = SAMPLE_TREND,
  className,
}: {
  trend?: SampleTrend;
  className?: string;
}) {
  return (
    <div className={cn("glass-card overflow-hidden p-6 sm:p-7", className)}>
```
to:
```tsx
export default function TrendCardSample({
  trend = SAMPLE_TREND,
  className,
  frameless = false,
}: {
  trend?: SampleTrend;
  className?: string;
  /** Skips the card's own border/shadow/radius so it can sit inside an
   *  external frame (the hero's browser-chrome mockup). */
  frameless?: boolean;
}) {
  return (
    <div
      className={cn(
        frameless ? "p-6 sm:p-7" : "glass-card overflow-hidden p-6 sm:p-7",
        className
      )}
    >
```

- [ ] **Step 2: Run existing checks**

Run: `npm run lint`
Expected: no errors. `TrendCardSample` has no test file, so there is nothing to run beyond lint/build here — verified in Step 5 below.

- [ ] **Step 3: Wrap the sample card in a browser-chrome frame in `LandingHero`**

In `components/landing/LandingHero.tsx`, change:
```tsx
          <div className="animate-fade-up [animation-delay:150ms]">
            <TrendCardSample />
          </div>
```
to:
```tsx
          <div className="animate-fade-up overflow-hidden rounded-2xl border border-border bg-card shadow-[0_24px_60px_-24px_rgba(26,26,26,0.25)] [animation-delay:150ms]">
            <div className="flex items-center gap-1.5 border-b border-border bg-surface px-4 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" aria-hidden />
              <span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" aria-hidden />
              <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" aria-hidden />
            </div>
            <TrendCardSample frameless />
          </div>
```

- [ ] **Step 4: Verify the build**

Run: `npm run build`
Expected: succeeds — `frameless` is a valid optional prop, no type errors.

- [ ] **Step 5: Visual check**

Run `npm run dev`, open `/`. Expected: the hero's example trend card now sits inside a browser-window-style frame (traffic-light dots in a toolbar strip, one continuous border/shadow around the whole thing) instead of floating as a bare card.

- [ ] **Step 6: Commit**

```bash
git add components/landing/TrendCardSample.tsx components/landing/LandingHero.tsx
git commit -m "feat: frame hero trend card sample in browser-chrome mockup"
```

---

## Task 4: Numbered step badges in "How it works"

**Files:**
- Modify: `components/landing/LandingHowItWorks.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: nothing consumed elsewhere — this is a leaf visual change.

- [ ] **Step 1: Replace the gradient-text numeral with a dark numbered badge**

Change:
```tsx
            <li
              key={step.number}
              className="rounded-2xl border border-border bg-card p-7"
            >
              <span className="gradient-text text-3xl font-extrabold tracking-tight">
                {step.number}
              </span>
              <h3 className="mt-3 text-lg font-bold">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {step.body}
              </p>
            </li>
```
to:
```tsx
            <li
              key={step.number}
              className="rounded-2xl border border-border bg-card p-7"
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-foreground text-sm font-bold text-background">
                {step.number}
              </span>
              <h3 className="mt-4 text-lg font-bold">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {step.body}
              </p>
            </li>
```

- [ ] **Step 2: Verify with lint**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 3: Visual check**

Run `npm run dev`, open `/#how-it-works`. Expected: each of the 3 step cards shows a small dark rounded square with the white step number (01/02/03) instead of a large coral numeral.

- [ ] **Step 4: Commit**

```bash
git add components/landing/LandingHowItWorks.tsx
git commit -m "feat: restyle how-it-works step numbers as dark badges"
```

---

## Task 5: Extract sources strip into its own DataFast-style chip section

**Files:**
- Create: `components/landing/LandingSourcesStrip.tsx`
- Modify: `components/landing/LandingTrendAnatomy.tsx`
- Modify: `app/page.tsx`

**Interfaces:**
- Produces: `LandingSourcesStrip` — a default-exported, no-props React Server Component. Rendered once, directly in `app/page.tsx`.
- Consumes: `SectionHeader` from `@/components/landing/shared` (already used elsewhere, same import path).

- [ ] **Step 1: Create `components/landing/LandingSourcesStrip.tsx`**

```tsx
import { SectionHeader } from "@/components/landing/shared";

/** The trust section on its own: nine sources shown as a chip grid rather
 *  than buried at the bottom of the trend-anatomy block. The fact that
 *  there are nine matters; a card each for them does not. */
const SOURCES = [
  "Hacker News",
  "GitHub",
  "npm",
  "PyPI",
  "arXiv",
  "Hugging Face",
  "Stack Overflow",
  "Publisher feeds",
  "Search demand",
];

export default function LandingSourcesStrip() {
  return (
    <section className="relative py-20 sm:py-24">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          badge="Sources"
          title="Reading every day, across nine sources."
          subtitle="One source moving alone is noise, and we label it that way — a single-source trend stays low-confidence until something unrelated confirms it."
        />

        <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
          {SOURCES.map((source) => (
            <span
              key={source}
              className="rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground"
            >
              {source}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Remove the sources block from `LandingTrendAnatomy`**

In `components/landing/LandingTrendAnatomy.tsx`, remove the `SOURCES` constant (lines 7–17):
```tsx
/** The trust section, with the source list folded in as a compact strip
 *  rather than its own section — the fact that there are nine sources matters,
 *  a card each for them does not. */
const SOURCES = [
  "Hacker News",
  "GitHub",
  "npm",
  "PyPI",
  "arXiv",
  "Hugging Face",
  "Stack Overflow",
  "Publisher feeds",
  "Search demand",
];

```

Remove the trailing sources block (the last `<div>` before the closing `</div></section>`):
```tsx
        <div className="mt-14 rounded-2xl border border-border bg-surface p-7 text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">
            Reading every day
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            {SOURCES.map((source) => (
              <span key={source} className="text-sm font-medium">
                {source}
              </span>
            ))}
          </div>
          <p className="mt-4 text-xs text-muted">
            One source moving alone is noise, and we label it that way — a
            single-source trend stays low-confidence until something unrelated
            confirms it.
          </p>
        </div>
```

So the section's closing structure becomes:
```tsx
        <div className="mt-14 grid items-start gap-10 lg:grid-cols-2 lg:gap-14">
          <TrendCardSample className="lg:sticky lg:top-24" />

          <dl className="space-y-5">
            {annotations.map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-border bg-card p-6"
              >
                <dt className="text-sm font-bold uppercase tracking-wider text-primary">
                  {item.label}
                </dt>
                <dd className="mt-2 text-sm leading-relaxed text-muted">
                  {item.body}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Wire the new section into `app/page.tsx`**

Change:
```tsx
import LandingTrendAnatomy from "@/components/landing/LandingTrendAnatomy";
import LandingPricing from "@/components/landing/LandingPricing";
```
to:
```tsx
import LandingTrendAnatomy from "@/components/landing/LandingTrendAnatomy";
import LandingSourcesStrip from "@/components/landing/LandingSourcesStrip";
import LandingPricing from "@/components/landing/LandingPricing";
```

And change:
```tsx
        <LandingHero />
        <LandingHowItWorks />
        <LandingTrendAnatomy />
        <LandingPricing />
```
to:
```tsx
        <LandingHero />
        <LandingHowItWorks />
        <LandingTrendAnatomy />
        <LandingSourcesStrip />
        <LandingPricing />
```

- [ ] **Step 4: Verify the build**

Run: `npm run build`
Expected: succeeds — no unused-variable lint errors (the `SOURCES` const was fully removed from `LandingTrendAnatomy.tsx`, not just its usage).

- [ ] **Step 5: Visual check**

Run `npm run dev`, open `/`. Expected: a new standalone section titled "Reading every day, across nine sources." appears between the "What you get" section and "Pricing", showing all 9 source names as individual rounded chip pills. The "What you get" section itself no longer has the gray box of source names at its bottom.

- [ ] **Step 6: Commit**

```bash
git add components/landing/LandingSourcesStrip.tsx components/landing/LandingTrendAnatomy.tsx app/page.tsx
git commit -m "feat: extract sources strip into standalone chip-grid section"
```

---

## Task 6: Pricing card polish

**Files:**
- Modify: `components/PlanCards.tsx`

**Interfaces:**
- Consumes: nothing new (same `PlanCardsProps`: `prices: PriceRecord`, `source?: "landing" | "dashboard"`).
- Produces: nothing consumed elsewhere — visual-only change to the two card containers.

- [ ] **Step 1: Restyle the Free and Pro card containers**

Change:
```tsx
      <div className="rounded-2xl border border-border bg-card p-8">
        <h3 className="text-lg font-bold">Free</h3>
```
to:
```tsx
      <div className="rounded-3xl border border-border bg-card p-8 shadow-[0_1px_2px_rgba(26,26,26,0.04)]">
        <h3 className="text-lg font-bold">Free</h3>
```

Change:
```tsx
      <div className="rounded-2xl border-2 border-primary bg-card p-8">
        <div className="flex items-center justify-between gap-3">
```
to:
```tsx
      <div className="rounded-3xl border-2 border-primary bg-card p-8 shadow-[0_20px_40px_-24px_rgba(225,101,64,0.35)]">
        <div className="flex items-center justify-between gap-3">
```

- [ ] **Step 2: Verify with lint**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 3: Visual check**

Run `npm run dev`, open `/#pricing`. Expected: both cards have more rounded corners (`rounded-3xl` vs the previous `rounded-2xl`), the Free card has a faint shadow, and the Pro card has a visible warm coral glow shadow that draws the eye to it.

- [ ] **Step 4: Commit**

```bash
git add components/PlanCards.tsx
git commit -m "feat: polish pricing card shadows and radius"
```

---

## Task 7: FAQ accordion restyle

**Files:**
- Modify: `components/landing/LandingFAQ.tsx`

**Interfaces:**
- Consumes: `ChevronDown` from `lucide-react` (new import; `lucide-react` is already a project dependency, used elsewhere e.g. `components/landing/LandingHero.tsx`).
- Produces: nothing consumed elsewhere.

- [ ] **Step 1: Replace the whole file**

Replace the full contents of `components/landing/LandingFAQ.tsx` with:

```tsx
"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { SectionHeader } from "@/components/landing/shared";
import { LANDING_FAQS } from "@/libs/landing-faqs";

export default function LandingFAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="relative py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          badge="FAQ"
          title="Frequently Asked Questions"
          subtitle="What the checks cover, and what they deliberately do not."
        />

        <div className="mt-12 divide-y divide-border rounded-2xl border border-border bg-card">
          {LANDING_FAQS.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div key={faq.question}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  aria-expanded={isOpen}
                >
                  <span
                    className={`font-semibold transition-colors ${
                      isOpen ? "text-primary" : ""
                    }`}
                  >
                    {faq.question}
                  </span>
                  <ChevronDown
                    size={18}
                    className={`shrink-0 text-muted transition-transform ${
                      isOpen ? "rotate-180 text-primary" : ""
                    }`}
                    aria-hidden
                  />
                </button>
                {isOpen && (
                  <p className="px-6 pb-5 text-sm leading-relaxed text-muted">
                    {faq.answer}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Verify the build**

Run: `npm run build`
Expected: succeeds — `ChevronDown` is a valid `lucide-react` export (confirm by checking it's already imported elsewhere in the codebase, e.g. `components/ButtonAccount.tsx`).

- [ ] **Step 3: Visual check**

Run `npm run dev`, open `/#faq`. Expected: FAQ items sit inside one bordered card with dividers between rows (not floating individually), a chevron icon rotates 180° on open instead of a `+`/`−` character swap, and the open question's text is coral instead of the old blue accent color.

- [ ] **Step 4: Commit**

```bash
git add components/landing/LandingFAQ.tsx
git commit -m "feat: restyle FAQ accordion with chevron and card container"
```

---

## Task 8: Dashboard trend card density and hover polish

**Files:**
- Modify: `components/dashboard/TrendCard.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: nothing consumed elsewhere — visual-only change to both the locked and unlocked card containers.

- [ ] **Step 1: Tighten padding and add a hover lift to the locked card**

Change:
```tsx
      <div className="relative overflow-hidden rounded-2xl border border-primary/25 bg-card p-6">
```
to:
```tsx
      <div className="relative overflow-hidden rounded-2xl border border-primary/25 bg-card p-5 transition-shadow hover:shadow-[0_12px_28px_-16px_rgba(26,26,26,0.18)]">
```

- [ ] **Step 2: Tighten padding and add a hover lift to the unlocked card**

Change:
```tsx
    <div className="rounded-2xl border border-border bg-card p-6">
```
to:
```tsx
    <div className="rounded-2xl border border-border bg-card p-5 transition-shadow hover:shadow-[0_12px_28px_-16px_rgba(26,26,26,0.18)]">
```

- [ ] **Step 3: Verify with lint**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 4: Verify existing tests still pass**

Run: `npm test -- libs/trends`
Expected: `libs/trends/feed.test.ts` and `libs/trends/follows.test.ts` pass unchanged — this task touches only JSX className strings, not `TrendCardData` shape or fetch logic.

- [ ] **Step 5: Visual check**

Run `npm run dev`, sign in, open `/dashboard`. Expected: trend cards are slightly tighter (less internal padding) and lift with a soft shadow on hover.

- [ ] **Step 6: Commit**

```bash
git add components/dashboard/TrendCard.tsx
git commit -m "feat: tighten dashboard trend card density and add hover lift"
```

---

## Task 9: Dashboard page spacing tightening

**Files:**
- Modify: `app/dashboard/page.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: nothing consumed elsewhere.

- [ ] **Step 1: Tighten vertical rhythm**

Change:
```tsx
    <div className="space-y-12">
      <div className="space-y-2">
```
to:
```tsx
    <div className="space-y-10">
      <div className="space-y-2">
```

Change both occurrences of:
```tsx
      <section className="space-y-4">
```
to:
```tsx
      <section className="space-y-3">
```

(There are two `<section className="space-y-4">` occurrences — the "In your categories" section and the "Rising fast" section. Change both.)

- [ ] **Step 2: Verify with lint**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 3: Verify existing tests still pass**

Run: `npm test`
Expected: full suite passes — this task touches only the page's JSX className strings, no data fetching (`getForYouFeed`, `getRisingFastFeed`, `getUserPreferences`, `getProfileAccess`, `planForAccess` calls are all unchanged).

- [ ] **Step 4: Visual check**

Run `npm run dev`, sign in, open `/dashboard`. Expected: slightly denser spacing between the page header, the "In your categories" section, and the "Rising fast" section, matching DataFast's tighter dashboard rhythm.

- [ ] **Step 5: Commit**

```bash
git add app/dashboard/page.tsx
git commit -m "feat: tighten dashboard page vertical spacing"
```

---

## Task 10: Full verification pass

**Files:**
- None (verification only).

**Interfaces:**
- Consumes: the full set of changes from Tasks 1–9.
- Produces: nothing — this task is the final gate before considering the plan done.

- [ ] **Step 1: Run the full lint, test, and build suite**

```bash
npm run lint
npm test
npm run build
```
Expected: all three succeed with zero errors.

- [ ] **Step 2: Confirm no stray old-palette colors remain in touched files**

```bash
grep -n "rgba(10, 110, 209\|rgba(8, 32, 63\|rgba(0, 141, 247\|rgba(0, 189, 252\|#008DF7\|#00BDFC\|#021B42\|#08203F" \
  app/globals.css app/layout.tsx app/page.tsx app/dashboard/page.tsx \
  components/ui/MarketingBackdrop.tsx \
  components/landing/LandingHero.tsx components/landing/TrendCardSample.tsx \
  components/landing/LandingHowItWorks.tsx components/landing/LandingTrendAnatomy.tsx \
  components/landing/LandingSourcesStrip.tsx components/landing/LandingFAQ.tsx \
  components/PlanCards.tsx components/dashboard/TrendCard.tsx
```
Expected: no output (empty grep result). If any hex/rgba values from the old blue/violet palette appear in these specific files, an earlier task's edit was incomplete — go back and fix it before proceeding. (This intentionally excludes the dead files listed in Global Constraints, which still legitimately contain the old palette.)

- [ ] **Step 3: Full manual visual walkthrough**

Run `npm run dev` and check, in order:
1. `/` — warm off-white background throughout; hero CTA and mockup browser-chrome frame are coral/warm; "How it works" shows dark numbered badges; "What you get" two-column block unchanged in structure but recolored; new "Reading every day, across nine sources" chip section appears before pricing; pricing cards are rounded-3xl with the Pro card glowing coral; FAQ accordion uses a rotating chevron inside one bordered card; final CTA section is warm-toned.
2. `/dashboard` (signed in) — top bar, trend cards (both locked and unlocked variants — locked requires a free-plan account or a manually-inspected locked trend), category picker (if shown), and the free-plan upgrade callout are all coral/warm instead of blue.
3. `/dashboard/billing`, `/dashboard/settings` — spot-check that these inherit the new tokens correctly even though no task explicitly modified them (they use the same token-based utility classes as everything else).
4. Toggle the FAQ accordion open/closed, hover a dashboard trend card, and hover the hero/pricing/final-CTA buttons — confirm the coral hover/shadow states from Task 1 render correctly.

Expected: no blue/violet accents remain anywhere in the pages listed above; the DM Sans font is visibly applied (rounder terminals than Inter, especially noticeable in headings).

- [ ] **Step 4: Report findings**

If Step 3 surfaces any missed spot (a component this plan didn't cover that still shows the old palette), note the exact file and className — do not silently patch it without confirming it's in scope per the Global Constraints "no dead files" rule.
