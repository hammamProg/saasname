import type { MetadataRoute } from "next";
import { articles } from "@/app/blog/_assets/content";
import { siteUrl } from "@/libs/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = ["", "/landing", "/blog", "/components", "/tos", "/privacy-policy"];

  const blogRoutes = articles.map((article) => `/blog/${article.slug}`);

  return [...staticRoutes, ...blogRoutes].map((path) => ({
    url: `${siteUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : 0.7,
  }));
}
