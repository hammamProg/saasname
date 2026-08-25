# Static page

Build SEO-optimized marketing pages quickly using FastShip components and the SEO helper.

> Based on [ShipFast Static page tutorial](https://shipfa.st/docs/tutorials/static-page).

---

## What you get

| Piece | Location | Purpose |
|-------|----------|---------|
| Marketing components | `/components` | Hero, pricing, FAQ, etc. — see [Components](./COMPONENTS.md) |
| SEO helper | `libs/seo.ts`, `libs/seo-schema.tsx` | `getSEOTags()` + `renderSchemaTags()` |
| Example static page | `/landing` | Minimal single-section page from the tutorial |
| Sitemap & robots | `app/sitemap.ts`, `app/robots.ts` | Generated at build time |

---

## Two ways to build a page

### 1. Full landing page (recommended)

Use pre-built components on the home page — already wired in `app/page.tsx`:

```
Header → Hero → Problem → Features → Testimonials → Pricing → FAQ → CTA → Footer
```

Customize copy in `/components` and `config.ts`. See [Ship in 5 minutes](./SHIP_IN_5_MINUTES.md).

### 2. Simple static page

For a focused page (waitlist, product teaser, niche landing), create a route under `/app`:

```tsx
// app/landing/page.tsx
import { getSEOTags } from "@/libs/seo";

export const metadata = getSEOTags({
  title: "Food recipes you'll love",
  description: "Our AI generates recipes based on your preferences.",
  canonicalUrlRelative: "/landing",
});

export default function LandingPage() {
  return (
    <main className="min-h-screen p-12 text-center">
      <h1 className="text-4xl font-extrabold">Food recipes you&apos;ll love 🥦</h1>
      {/* ... */}
    </main>
  );
}
```

**Live example:** [http://localhost:3000/landing](http://localhost:3000/landing)

---

## SEO tags

### Per-page metadata

Import `getSEOTags` and export `metadata` from any `page.tsx`:

```tsx
import { getSEOTags } from "@/libs/seo";

export const metadata = getSEOTags({
  title: "Terms and Conditions",
  canonicalUrlRelative: "/tos",
});
```

Always set `title` and `canonicalUrlRelative` for each public page. Full details: [SEO guide](./SEO.md).

### Structured data (home page)

Add JSON-LD on key marketing pages:

```tsx
import { renderSchemaTags } from "@/libs/seo-schema";

export default function Home() {
  return (
    <>
      {renderSchemaTags()}
      <main>...</main>
    </>
  );
}
```

Already enabled on `/`.

---

## Config

Set these in `config.ts` — they feed default SEO tags:

| Key | Example |
|-----|---------|
| `appName` | `FastShip` |
| `appDescription` | One-line value proposition |
| `domainName` | `fastship.app` |

Set production URL in `.env.local`:

```env
NEXT_PUBLIC_SITE_URL=https://fastship.app
```

---

## Legal pages (stubs)

| Route | File |
|-------|------|
| `/tos` | `app/tos/page.tsx` |
| `/privacy-policy` | `app/privacy-policy/page.tsx` |

Replace placeholder copy with your terms. Footer links point here via `config.links`.

---

## Checklist

- [ ] Customize `config.ts` (`appName`, `appDescription`, `domainName`)
- [ ] Set `NEXT_PUBLIC_SITE_URL` in `.env.local`
- [ ] Add `getSEOTags()` to every public page
- [ ] Add `renderSchemaTags()` on the homepage
- [ ] Claim domain in [Google Search Console](https://search.google.com/search-console)
- [ ] Verify `/sitemap.xml` and `/robots.txt` after deploy

---

## What's next

- [SEO](./SEO.md) — tags, sitemap, structured data
- [Ship in 5 minutes](./SHIP_IN_5_MINUTES.md) — full landing page
- [Components](./COMPONENTS.md) — all UI sections
