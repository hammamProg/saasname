import Link from "next/link";
import { getSEOTags } from "@/libs/seo";
import config from "@/config";

export const metadata = getSEOTags({
  title: `Privacy Policy | ${config.appName}`,
  canonicalUrlRelative: "/privacy-policy",
});

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-4 py-4 sm:px-6">
        <Link href="/" className="font-bold">
          ← {config.appName}
        </Link>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h1 className="section-heading text-3xl font-extrabold">Privacy Policy</h1>
        <p className="mt-6 leading-relaxed text-muted">
          Replace this page with your privacy policy. ShipFast includes a guide for
          generating one with GPT — coming soon in ShipNow docs.
        </p>
      </main>
    </div>
  );
}
