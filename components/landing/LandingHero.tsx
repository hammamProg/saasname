import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import config from "@/config";
import MarketingBackdrop from "@/components/ui/MarketingBackdrop";
import AnalyticsCardSample from "@/components/landing/AnalyticsCardSample";

/** Three claims the product actually honours today, so none can age into a
 *  lie: no card required while in beta, no cookie banner needed, and the
 *  first pageview shows up in seconds, not after a batch job. */
const trustBadges = ["Free while in beta", "No cookie banner needed", "Live in seconds"];

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
            <span className="inline-flex items-center rounded-full border border-primary/25 bg-primary-soft/50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-accent">
              Beta — free for now
            </span>

            <h1 className="section-heading max-w-[18ch] text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              Cookieless website analytics that{" "}
              <span className="gradient-text">respect your visitors.</span>
            </h1>

            <p className="max-w-lg text-lg leading-relaxed text-muted">
              One script tag, no cookies, no consent banner. See who&apos;s on
              your site right now, where they came from, and which pages hold
              them — without asking their browser for permission first. No
              GDPR consent prompt to build, no cookie law to worry about.
            </p>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
              <Link
                href={config.auth.loginUrl}
                className="btn-gradient px-8 py-3.5 text-sm"
              >
                Start tracking free
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
            <AnalyticsCardSample frameless />
          </div>
        </div>
      </div>
    </section>
  );
}
