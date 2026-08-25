import config from "@/config";

export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? `https://${config.domainName}`;

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
  const defaultTitle = `${config.appName} — find a SaaS name that is actually free`;
  const resolvedTitle = title ?? defaultTitle;
  const resolvedDescription = description ?? config.appDescription;
  const canonicalPath = canonicalUrlRelative ?? "/";

  return {
    title: resolvedTitle,
    description: resolvedDescription,
    keywords: keywords ?? [
      config.appName,
      "SaaS name checker",
      "business name availability",
      "domain and trademark check",
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
