import type { MetadataRoute } from "next";
import { articles } from "@/app/blog/_assets/content";
import { siteUrl } from "@/libs/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  // The component showcase is a development reference, not a marketing page --
  // it is excluded here and noindexed at the page level.
  const staticRoutes = ["", "/blog", "/tos", "/privacy-policy", "/vs/plausible"];

  const blogRoutes = articles.map((article) => `/blog/${article.slug}`);

  return [...staticRoutes, ...blogRoutes].map((path) => ({
    url: `${siteUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : 0.7,
  }));
}
