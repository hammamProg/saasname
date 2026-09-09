import Link from "next/link";
import { articles, formatPublishedAt } from "@/app/blog/_assets/content";
import config from "@/config";
import { getSEOTags } from "@/libs/seo";
import BlogCover from "@/components/blog/BlogCover";

export const metadata = getSEOTags({
  title: "Blog — Cookieless Analytics Guides",
  description:
    "Guides on privacy-friendly web analytics, GDPR-compliant tracking, and reading traffic data without a cookie banner.",
  canonicalUrlRelative: "/blog",
});

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-4 py-4 sm:px-6">
        <Link href="/" className="font-bold">
          ← {config.appName}
        </Link>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <h1 className="section-heading text-4xl font-extrabold">Blog</h1>
        <p className="mt-4 text-muted">
          Guides on cookieless analytics, GDPR-compliant tracking, and reading
          traffic without a consent banner.
        </p>
        <div className="mt-12 grid gap-8 md:grid-cols-2">
          {articles.map((article) => (
            <Link
              key={article.slug}
              href={`/blog/${article.slug}`}
              className="card overflow-hidden transition hover:shadow-lg"
            >
              <BlogCover category={article.categories[0]} className="aspect-video" />
              <div className="p-6">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                  {article.categories.join(", ")} · {formatPublishedAt(article.publishedAt)}
                </p>
                <h2 className="mt-1.5 font-bold">{article.title}</h2>
                <p className="mt-2 text-sm text-muted">{article.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
