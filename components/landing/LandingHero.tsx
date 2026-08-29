import Link from "next/link";
import { ArrowRight, Check, Globe, Scale } from "lucide-react";
import {
  AppleIcon,
  GithubIcon,
  GooglePlayIcon,
} from "@/components/icons/BrandIcons";
import config from "@/config";
import MarketingBackdrop from "@/components/ui/MarketingBackdrop";
import LandingDemo from "@/components/landing/LandingDemo";

/** Two claims the product actually honours, and that a subscription-weary
 *  founder is scanning for. The free-search count is already in the CTA, so
 *  repeating it here would spend a line saying nothing new. */
const trustBadges = ["No subscription", "Credits never expire"];

const sourceChips = [
  { name: "Domains", Icon: Globe },
  { name: "USPTO", Icon: Scale },
  { name: "App Store", Icon: AppleIcon },
  { name: "Play", Icon: GooglePlayIcon },
  { name: "Handles", Icon: GithubIcon },
];

export default function LandingHero() {
  return (
    <section className="relative overflow-hidden pb-20 pt-14 sm:pb-24 sm:pt-16 lg:pt-20">
      <MarketingBackdrop variant="hero" dark />
      <div className="landing-grid-bg pointer-events-none absolute inset-x-0 top-0 h-[600px]" aria-hidden />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="animate-fade-up space-y-6">
            {/* Capped so the line breaks after "you can" rather than running to
                four ragged lines at the widest breakpoint. */}
            <h1 className="section-heading max-w-[15ch] text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              Find a name you can{" "}
              <span className="gradient-text">actually own.</span>
            </h1>

            <p className="max-w-md text-lg leading-relaxed text-muted">
              Describe your idea. We check domains, trademarks, app stores and
              handles before you commit.
            </p>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
              <Link
                href={config.auth.loginUrl}
                className="btn-gradient px-8 py-3.5 text-sm"
              >
                Start with {config.credits.signupGrant} free searches
                <ArrowRight size={16} />
              </Link>
              <Link
                href="#how-it-works"
                className="text-sm font-medium text-muted underline-offset-4 transition-colors hover:text-foreground hover:underline"
              >
                See how it works
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

          <div className="animate-fade-up [animation-delay:150ms]">
            <LandingDemo />

            {/* These carry the source list that used to sit in the subhead. */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              {sourceChips.map((chip) => (
                <div
                  key={chip.name}
                  className="glass-card flex items-center gap-2 px-3 py-2"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary-soft text-primary">
                    <chip.Icon size={14} />
                  </span>
                  <span className="text-xs font-medium">{chip.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
