import Image from "next/image";
import Link from "next/link";
import config from "@/config";
import { getSEOTags } from "@/libs/seo";

export const metadata = getSEOTags({
  title: `Food recipes you'll love | ${config.appName}`,
  description:
    "Our AI will generate recipes based on your preferences. New recipes will be added every week!",
  canonicalUrlRelative: "/landing",
});

const heroImage =
  "https://images.unsplash.com/photo-1518843875459-f738682238a6?auto=format&fit=crop&w=1000&q=80";

/** Example static marketing page — see docs/STATIC_PAGE.md */
export default function LandingPage() {
  return (
    <main className="min-h-screen bg-surface-dark p-12 pb-24 text-center text-white">
      <section className="mx-auto max-w-xl space-y-8">
        <Link href="/" className="text-sm text-slate-400 hover:text-white">
          ← Back to {config.appName}
        </Link>

        <h1 className="text-3xl font-extrabold md:text-4xl">
          Food recipes you&apos;ll love 🥦
        </h1>

        <p className="text-lg leading-relaxed text-slate-300">
          Our AI will generate recipes based on your preferences. New recipes
          will be added every week!
        </p>

        <Image
          src={heroImage}
          alt="Fresh vegetables"
          width={500}
          height={250}
          className="mx-auto rounded-lg"
          priority
        />

        <Link href="/#waitlist" className="btn-primary inline-flex px-10 py-3">
          Get started
        </Link>
      </section>
    </main>
  );
}
