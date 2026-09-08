import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getArticle, articles } from "@/app/blog/_assets/content";
import { getSEOTags } from "@/libs/seo";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return articles.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) return {};
  return getSEOTags({
    title: article.title,
    description: article.description,
    canonicalUrlRelative: `/blog/${slug}`,
  });
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) notFound();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-4 py-4 sm:px-6">
        <Link href="/blog" className="font-bold">
          ← Blog
        </Link>
      </header>
      <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <div className="relative mb-8 aspect-video overflow-hidden rounded-xl">
          <Image src={article.image} alt={article.title} fill className="object-cover" />
        </div>
        <h1 className="section-heading text-3xl font-extrabold sm:text-4xl">
          {article.title}
        </h1>
        <p className="mt-2 text-sm text-muted">
          {article.author} · {article.publishedAt}
        </p>
        <div className="prose prose-slate mt-8 max-w-none whitespace-pre-wrap leading-relaxed text-muted">
          {article.content}
        </div>
      </article>
    </div>
  );
}
