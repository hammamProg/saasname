import Link from "next/link";
import Image from "next/image";
import config from "@/config";
import { articles } from "@/app/blog/_assets/content";

export default function BlogPreview() {
  const featured = articles.slice(0, 2);

  return (
    <section className="bg-surface py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <h2 className="section-heading text-center text-3xl font-extrabold">
          The {config.appName} Blog
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-muted">
          Learn how to setup auth, prevent chargebacks, handle subscriptions, and more.
        </p>

        <div className="mt-12 grid gap-8 md:grid-cols-2">
          {featured.map((article) => (
            <Link
              key={article.slug}
              href={`/blog/${article.slug}`}
              className="card group overflow-hidden transition hover:shadow-lg"
            >
              <div className="relative aspect-video overflow-hidden bg-surface-dark">
                <Image
                  src={article.image}
                  alt=""
                  fill
                  className="object-cover transition group-hover:scale-105"
                />
              </div>
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
                  {article.author} · {article.publishedAt}
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
