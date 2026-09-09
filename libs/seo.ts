import config from "@/config";

/** One source of truth for the origin. Previously this rebuilt a URL from
 *  `domainName`, which is the bare brand domain and therefore the apex - so
 *  canonical tags advertised an origin that only ever 308s elsewhere. */
export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "") ||
  config.productionUrl;

type SEOTags = {
  title?: string;
  description?: string;
  keywords?: string[];
  canonicalUrlRelative?: string;
  openGraph?: import("next").Metadata["openGraph"];
  robots?: import("next").Metadata["robots"];
};

/** Default and per-page SEO metadata — see docs/SEO.md */
export function getSEOTags({
  title,
  description,
  keywords,
  canonicalUrlRelative,
  openGraph,
  robots,
}: SEOTags = {}): import("next").Metadata {
  const defaultTitle = `${config.appName} — cookieless website analytics`;
  const resolvedTitle = title ?? defaultTitle;
  const resolvedDescription = description ?? config.appDescription;
  const canonicalPath = canonicalUrlRelative ?? "/";

  return {
    title: resolvedTitle,
    description: resolvedDescription,
    keywords: keywords ?? [
      config.appName,
      "cookieless analytics",
      "website analytics without cookies",
      "GDPR analytics",
      "no cookie banner analytics",
      "live visitor tracking",
    ],
    metadataBase: new URL(siteUrl),
    alternates: {
      canonical: canonicalPath,
    },
    applicationName: config.appName,
    openGraph: {
      title: resolvedTitle,
      description: resolvedDescription,
      url: `${siteUrl}${canonicalPath === "/" ? "" : canonicalPath}`,
      siteName: config.appName,
      locale: "en_US",
      type: "website",
      images: [{ url: `${siteUrl}${config.brand.logo}`, alt: config.brand.logoAlt }],
      ...openGraph,
    },
    twitter: {
      card: "summary_large_image",
      title: resolvedTitle,
      description: resolvedDescription,
    },
    ...(robots ? { robots } : {}),
  };
}
