import config from "@/config";

export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? `https://${config.domainName}`;

type SEOTags = {
  title?: string;
  description?: string;
  keywords?: string[];
  canonicalUrlRelative?: string;
  openGraph?: import("next").Metadata["openGraph"];
};

/** Default and per-page SEO metadata — see docs/SEO.md */
export function getSEOTags({
  title,
  description,
  keywords,
  canonicalUrlRelative,
  openGraph,
}: SEOTags = {}): import("next").Metadata {
  const defaultTitle = `${config.appName} — Ship your startup in days, not weeks`;
  const resolvedTitle = title ?? defaultTitle;
  const resolvedDescription = description ?? config.appDescription;
  const canonicalPath = canonicalUrlRelative ?? "/";

  return {
    title: resolvedTitle,
    description: resolvedDescription,
    keywords: keywords ?? [
      config.appName,
      "Next.js boilerplate",
      "Next.js starter",
      "SaaS",
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
  };
}
