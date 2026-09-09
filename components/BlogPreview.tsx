import Link from "next/link";
import config from "@/config";
import { articles, formatPublishedAt } from "@/app/blog/_assets/content";
import BlogCover from "@/components/blog/BlogCover";

export default function BlogPreview() {
  const featured = articles.slice(0, 2);

  return (
    <section className="bg-surface py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <h2 className="section-heading text-center text-3xl font-extrabold">
          The {config.appName} Blog
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-muted">
          Guides on cookieless analytics, GDPR-compliant tracking, and reading
          traffic without a consent banner.
        </p>

        <div className="mt-12 grid gap-8 md:grid-cols-2">
          {featured.map((article) => (
            <Link
              key={article.slug}
              href={`/blog/${article.slug}`}
              className="card group overflow-hidden transition hover:shadow-lg"
            >
              <BlogCover
                category={article.categories[0]}
                className="aspect-video overflow-hidden transition group-hover:scale-105"
              />
              <div className="p-6">
                <div className="flex flex-wrap gap-2">
                  {article.categories.map((cat) => (
                    <span
                      key={cat}
                      className="rounded-full bg-surface px-2 py-0.5 text-xs font-medium"
                    >
                      {cat}
                    </span>
                  ))}
                </div>
                <h3 className="mt-3 font-bold group-hover:text-primary">{article.title}</h3>
                <p className="mt-2 text-sm text-muted">{article.description}</p>
                <p className="mt-4 text-xs text-muted">
                  {article.author} · {formatPublishedAt(article.publishedAt)}
                </p>
              </div>
            </Link>
          ))}
        </div>

        <p className="mt-8 text-center">
          <Link href="/blog" className="text-sm font-semibold text-primary hover:underline">
            View all articles →
          </Link>
        </p>
      </div>
    </section>
  );
}
