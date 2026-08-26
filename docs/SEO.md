# SEO

Set metadata, canonical URLs, structured data, and sitemap so Google can index your app.

> Based on [ShipFast SEO docs](https://shipfa.st/docs/features/seo).

---

## Setup

### 1. Config

In `config.ts`, set:

- `appName`
- `appDescription`
- `domainName`

These values power default tags from `libs/seo.ts`.

### 2. Site URL

```env
# .env.local
NEXT_PUBLIC_SITE_URL=https://fastship.app
```

Use `http://localhost:3000` locally. Use your real domain in production (Vercel env vars).

---

## `getSEOTags()`

Located in `libs/seo.ts`. Returns a Next.js `Metadata` object.

```tsx
import { getSEOTags } from "@/libs/seo";

export const metadata = getSEOTags({
  title: "Terms and Conditions",
  description: "Optional override",
  canonicalUrlRelative: "/tos",
});
```

**Recommendation:** set `title` and `canonicalUrlRelative` on every public page.

### What it includes

- `title` / `description`
- `keywords`
- `metadataBase` (from `NEXT_PUBLIC_SITE_URL`)
- `alternates.canonical`
- Open Graph tags (`og:title`, `og:description`, `og:url`, …)
- Twitter card tags
- `applicationName`

---

## `renderSchemaTags()`

Adds JSON-LD `WebSite` schema for rich snippets:

```tsx
import { renderSchemaTags } from "@/libs/seo-schema";

export default function Page() {
  return (
    <>
      {renderSchemaTags()}
      <main>...</main>
    </>
  );
}
```

Used on the homepage (`app/page.tsx`). Extend `libs/seo-schema.tsx` for `Product`, `FAQPage`, etc. when needed.

---

## Sitemap & robots

FastShip uses `next-sitemap.config.js`. FastShip uses native Next.js routes:

| File | URL |
|------|-----|
| `app/sitemap.ts` | `/sitemap.xml` |
| `app/robots.ts` | `/robots.txt` |

Routes included: `/`, `/blog`, `/tos`, `/privacy-policy`, and all blog articles.
`/components`, `/dashboard`, `/r/*`, `/auth/*` and `/api/*` are excluded from the
sitemap and disallowed in `robots.txt`.

After deploy, open `https://yourdomain.com/sitemap.xml` and submit it in Google Search Console.

---

## Pages with SEO today

| Page | Canonical | Schema |
|------|-----------|--------|
| `/` | `/` | ✓ |
| `/tos` | `/tos` | — |
| `/privacy-policy` | `/privacy-policy` | — |
| `/blog` | `/blog` | — |
| `/blog/[slug]` | per article | — |

Add `getSEOTags()` when you create new routes.

---

## Google Search Console

1. Verify domain ownership
2. Submit sitemap: `https://yourdomain.com/sitemap.xml`
3. Request indexing for new pages after publishing

For blog posts, submit new URLs when you publish — see [Components → Blog](./COMPONENTS.md).

---

## What's next

- [Static page](./STATIC_PAGE.md) — build marketing pages
- [Ship in 5 minutes](./SHIP_IN_5_MINUTES.md) — landing page workflow
