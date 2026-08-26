import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";

/** Shared chrome for the legal and confidentiality pages. Print styles matter
 *  here: an NDA that cannot be filed as a PDF is not much of an NDA. */
export default function LegalPage({
  title,
  updated,
  intro,
  children,
}: {
  title: string;
  updated: string;
  intro?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-4 py-4 sm:px-6 print:hidden">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <BrandLogo size="md" href="/" />
          <Link
            href="/"
            className="text-sm font-medium text-muted transition-colors hover:text-primary"
          >
            Home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h1 className="section-heading text-3xl font-extrabold sm:text-4xl">{title}</h1>
        <p className="mt-2 text-sm text-muted">Last updated {updated}</p>
        {intro && <div className="mt-6 text-lg leading-relaxed text-muted">{intro}</div>}
        <div className="legal-body mt-10 space-y-8">{children}</div>
      </main>
    </div>
  );
}

export function Section({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-bold tracking-tight">{heading}</h2>
      <div className="space-y-3 leading-relaxed text-muted">{children}</div>
    </section>
  );
}
