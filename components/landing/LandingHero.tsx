import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import config from "@/config";
import MarketingBackdrop from "@/components/ui/MarketingBackdrop";
import TrendCardSample from "@/components/landing/TrendCardSample";

/** Three claims the product actually honours today, so none can age into a
 *  lie: there is a real free plan, the source list is the one wired up, and
 *  every figure on a trend links to the signal behind it. */
const trustBadges = ["Free plan, no card", "9 live sources", "Evidence on every trend"];

export default function LandingHero() {
  return (
    <section className="relative overflow-hidden pb-20 pt-14 sm:pb-24 sm:pt-16 lg:pt-20">
      <MarketingBackdrop variant="hero" dark />
      <div
        className="landing-grid-bg pointer-events-none absolute inset-x-0 top-0 h-[600px]"
        aria-hidden
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="animate-fade-up space-y-6">
            <h1 className="section-heading max-w-[15ch] text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              Catch it before it&apos;s{" "}
              <span className="gradient-text">crowded.</span>
            </h1>

            <p className="max-w-lg text-lg leading-relaxed text-muted">
              We watch nine sources for what&apos;s just starting to move, and
              rank it by how strong the signal is. Build the product — or ship
              the feature — while it&apos;s still early.
            </p>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
              <Link
                href={config.auth.loginUrl}
                className="btn-gradient px-8 py-3.5 text-sm"
              >
                Start free
                <ArrowRight size={16} />
              </Link>
              <Link
                href="#how-it-works"
                className="text-sm font-medium text-muted underline-offset-4 transition-colors hover:text-foreground hover:underline"
              >
                How it works
              </Link>
            </div>

            <ul className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted">
              {trustBadges.map((badge) => (
                <li key={badge} className="flex items-center gap-2">
                  <Check size={15} className="shrink-0 text-primary" />
                  {badge}
                </li>
              ))}
            </ul>
          </div>

          <div className="animate-fade-up overflow-hidden rounded-2xl border border-border bg-card shadow-[0_24px_60px_-24px_rgba(26,26,26,0.25)] [animation-delay:150ms]">
            <div className="flex items-center gap-1.5 border-b border-border bg-surface px-4 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" aria-hidden />
              <span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" aria-hidden />
              <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" aria-hidden />
            </div>
            <TrendCardSample frameless />
          </div>
        </div>
      </div>
    </section>
  );
}
