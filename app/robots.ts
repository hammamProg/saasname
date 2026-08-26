import type { MetadataRoute } from "next";
import { siteUrl } from "@/libs/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // /components is a development reference, /dashboard and /r are private
      // or per-user surfaces. Shared reports carry their own noindex tag.
      disallow: ["/components", "/dashboard", "/r/", "/auth/", "/api/"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
