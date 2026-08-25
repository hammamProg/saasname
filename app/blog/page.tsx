import Link from "next/link";
import Image from "next/image";
import { articles } from "@/app/blog/_assets/content";
import config from "@/config";
import { getSEOTags } from "@/libs/seo";

export const metadata = getSEOTags({
  title: `Blog`,
  description: "Guides for shipping your startup faster.",
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
        <p className="mt-4 text-muted">Guides to ship faster.</p>
        <div className="mt-12 grid gap-8 md:grid-cols-2">
          {articles.map((article) => (
            <Link
              key={article.slug}
              href={`/blog/${article.slug}`}
              className="card overflow-hidden transition hover:shadow-lg"
            >
              <div className="relative aspect-video bg-surface">
                <Image src={article.image} alt="" fill className="object-cover" />
              </div>
              <div className="p-6">
                <h2 className="font-bold">{article.title}</h2>
                <p className="mt-2 text-sm text-muted">{article.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
