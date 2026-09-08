import Link from "next/link";
import { ArrowRight, Check, Minus } from "lucide-react";
import { Suspense } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { SectionHeader } from "@/components/landing/shared";
import MarketingBackdrop from "@/components/ui/MarketingBackdrop";
import config from "@/config";
import { getSEOTags } from "@/libs/seo";

export const metadata = getSEOTags({
  title: "SaaSNa.me vs Plausible Analytics Compared",
  description:
    "How SaaSNa.me and Plausible Analytics compare on cookies, pricing, setup and what you actually see in the dashboard.",
  canonicalUrlRelative: "/vs/plausible",
});

/** Every row here is a claim about our own product or a widely-documented,
 *  easily-verified fact about Plausible's public pricing/docs — nothing that
 *  requires guessing at their roadmap or current numbers. Rows we are not
 *  confident enough to state precisely (their live pricing, self-host specifics)
 *  are left off rather than risk being wrong. */
const rows: { feature: string; us: string; them: string }[] = [
  { feature: "Cookieless by default", us: "Yes", them: "Yes" },
  { feature: "Cookie consent banner required", us: "No", them: "No" },
  { feature: "Setup", us: "One script tag", them: "One script tag" },
  { feature: "Open source", us: "No", them: "Yes" },
  { feature: "Self-hostable", us: "No", them: "Yes" },
  { feature: "Free plan", us: "Yes, while in beta", them: "Trial only, then paid" },
  { feature: "Who's online right now", us: "Yes", them: "On paid plans" },
  {
    feature: "Referrer breakdown",
    us: "Channel, direct and campaign, split apart",
    them: "Referrer list",
  },
  { feature: "Multi-site grouping", us: "Yes", them: "Yes, on paid plans" },
];

export default function VsPlausiblePage() {
  return (
    <div className="landing-theme min-h-screen">
      <Suspense>
        <Header variant="landing" />
      </Suspense>

      <main>
        <section className="relative overflow-hidden pb-16 pt-14 sm:pb-20 sm:pt-16">
          <MarketingBackdrop variant="hero" dark />
          <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
            <h1 className="section-heading text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl">
              SaaSNa.me vs <span className="gradient-text">Plausible Analytics</span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-muted">
              Both are cookieless, both skip the consent banner. Here&apos;s where
              they actually differ — for people comparing privacy-friendly
              analytics tools, not for picking a fight.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-5">
              <Link href={config.auth.loginUrl} className="btn-gradient px-8 py-3.5 text-sm">
                Try SaaSNa.me free
                <ArrowRight size={16} />
              </Link>
              <span className="text-sm text-muted">Beta — free for now, no card required.</span>
            </div>
          </div>
        </section>

        <section className="relative py-16 sm:py-20">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <SectionHeader
              badge="Feature by feature"
              title="Where SaaSNa.me and Plausible differ."
              subtitle="Plausible is a solid, mature product — this is what's different about ours, not a claim that theirs is worse."
            />

            <div className="mt-12 overflow-hidden rounded-2xl border border-border">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="bg-surface">
                    <th className="px-5 py-3 font-semibold text-muted">Feature</th>
                    <th className="px-5 py-3 font-semibold">SaaSNa.me</th>
                    <th className="px-5 py-3 font-semibold text-muted">Plausible</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr
                      key={row.feature}
                      className={i % 2 === 1 ? "bg-surface/50" : undefined}
                    >
                      <td className="border-t border-border px-5 py-3.5 text-muted">
                        {row.feature}
                      </td>
                      <td className="border-t border-border px-5 py-3.5 font-medium">
                        {row.us}
                      </td>
                      <td className="border-t border-border px-5 py-3.5 text-muted">
                        {row.them}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="relative py-16 sm:py-20">
          <div className="mx-auto grid max-w-4xl gap-8 px-4 sm:grid-cols-2 sm:px-6 lg:px-8">
            <div className="rounded-2xl border border-border bg-card p-7">
              <h2 className="flex items-center gap-2 text-lg font-bold">
                <Check size={18} className="text-primary" />
                Pick SaaSNa.me if
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                You want live visitor tracking and traffic-source attribution
                without paying for it while the product is in beta, and you&apos;d
                rather not run your own infrastructure.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-7">
              <h2 className="flex items-center gap-2 text-lg font-bold">
                <Minus size={18} className="text-muted" />
                Pick Plausible if
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                You need an open-source tool you can self-host, or want a
                product with an established paid track record rather than one
                still in beta.
              </p>
            </div>
          </div>
        </section>
      </main>

      <Footer variant="landing" />
    </div>
  );
}
