import Link from "next/link";
import { getSEOTags } from "@/libs/seo";
import config from "@/config";

export const metadata = getSEOTags({
  title: `Terms and Conditions | ${config.appName}`,
  canonicalUrlRelative: "/tos",
});

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-4 py-4 sm:px-6">
        <Link href="/" className="font-bold">
          ← {config.appName}
        </Link>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h1 className="section-heading text-3xl font-extrabold">Terms of Service</h1>
        <p className="mt-6 leading-relaxed text-muted">
          Replace this page with your legal terms. Use{" "}
          <code className="rounded bg-surface px-1">getSEOTags</code> in{" "}
          <code className="rounded bg-surface px-1">app/tos/page.tsx</code> to set
          the page title and canonical URL for SEO.
        </p>
      </main>
    </div>
  );
}
