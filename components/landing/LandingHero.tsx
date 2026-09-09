import Link from "next/link";
import { Check } from "lucide-react";
import MarketingBackdrop from "@/components/ui/MarketingBackdrop";
import HeroLiveDemo from "@/components/landing/HeroLiveDemo";
import HeroDomainForm from "@/components/landing/HeroDomainForm";

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

            <h1 className="section-heading max-w-[19ch] text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              Know who&apos;s on your site,{" "}
              <span className="gradient-text">right now.</span>
            </h1>

            <p className="max-w-lg text-lg leading-relaxed text-muted">
              Cookieless analytics you can read in ten seconds — visitors,
              sources, and countries, live. Drop in one script tag and skip
              the cookie banner, the consent prompt, and the GDPR paperwork
              entirely.
            </p>

            <div className="max-w-lg space-y-2">
              <HeroDomainForm />
              <p className="text-xs text-muted">
                No credit card. Try the live demo first, or{" "}
                <Link
                  href="#how-it-works"
                  className="font-medium underline-offset-4 hover:text-foreground hover:underline"
                >
                  see how it works
                </Link>
                .
              </p>
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
            <HeroLiveDemo />
          </div>
        </div>
      </div>
    </section>
  );
}
