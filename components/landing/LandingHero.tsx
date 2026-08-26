import Link from "next/link";
import { ArrowRight, AtSign, Check, Globe, Scale, Search, Sparkles } from "lucide-react";
import {
  AppleIcon,
  GithubIcon,
  GooglePlayIcon,
} from "@/components/icons/BrandIcons";
import config from "@/config";
import MarketingBackdrop from "@/components/ui/MarketingBackdrop";

const trustBadges = [
  `${config.credits.signupGrant} free searches on signup`,
  "No subscription",
  "Credits never expire",
];

const sourceChips = [
  { name: "Domains", Icon: Globe },
  { name: "USPTO", Icon: Scale },
  { name: "App Store", Icon: AppleIcon },
  { name: "Play", Icon: GooglePlayIcon },
  { name: "Handles", Icon: GithubIcon },
];

/** The sample report in the hero. Verdicts here mirror the real rollup
 *  vocabulary (clear / caution / taken) so the screenshot does not promise a
 *  UI the product does not have. */
const sampleChecks = [
  { icon: Globe, label: "Domains", detail: ".com · .io · .ai", state: "clear" },
  { icon: Scale, label: "US trademark", detail: "No live mark", state: "clear" },
  { icon: AppleIcon, label: "App stores", detail: "No app found", state: "clear" },
  { icon: AtSign, label: "Handles", detail: "X taken", state: "caution" },
  { icon: Search, label: "Web presence", detail: "3 weak results", state: "caution" },
];

const stateStyles: Record<string, string> = {
  clear: "bg-emerald-500/15 text-emerald-400",
  caution: "bg-amber-500/15 text-amber-400",
  taken: "bg-red-500/15 text-red-400",
};

export default function LandingHero() {
  return (
    <section className="relative overflow-hidden pb-24 pt-16 sm:pb-32 sm:pt-20 lg:pt-28">
      <MarketingBackdrop variant="hero" dark />
      <div className="landing-grid-bg pointer-events-none absolute inset-x-0 top-0 h-[600px]" aria-hidden />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-16 lg:grid-cols-2 lg:gap-12">
          <div className="animate-fade-up space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-accent backdrop-blur-sm">
              <Sparkles size={14} />
              Name research for founders
            </div>

            <h1 className="section-heading text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl xl:text-7xl">
              Find a SaaS name that is{" "}
              <span className="gradient-text">actually free to use.</span>
            </h1>

            <p className="max-w-xl text-lg leading-relaxed text-muted sm:text-xl">
              Describe your idea. {config.appName} writes candidate names and
              checks each one against domain registries, the US trademark
              register, both app stores, social handles, and web search — then
              tells you, in plain English, which ones survive.
            </p>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <Link
                href={config.auth.loginUrl}
                className="btn-gradient px-8 py-3.5 text-sm"
              >
                Start with {config.credits.signupGrant} free searches
                <ArrowRight size={16} />
              </Link>
              <Link href="#how-it-works" className="btn-ghost px-8 py-3.5 text-sm">
                See how it works
              </Link>
            </div>

            <ul className="flex flex-wrap gap-x-6 gap-y-2 pt-2">
              {trustBadges.map((badge) => (
                <li key={badge} className="flex items-center gap-2 text-sm text-muted">
                  <Check size={16} className="shrink-0 text-brand-cyan" />
                  {badge}
                </li>
              ))}
            </ul>
          </div>

          <div className="animate-fade-up relative [animation-delay:150ms]">
            <div className="absolute -inset-6 rounded-[2.5rem] bg-gradient-to-br from-brand-blue/25 via-brand-cyan/15 to-brand-violet/10 blur-3xl" />

            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/40 shadow-2xl shadow-brand-blue/10 ring-1 ring-white/10 backdrop-blur-xl">
              <div className="flex items-center gap-2 border-b border-white/10 bg-white/5 px-4 py-3">
                <span className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
                <span className="ml-2 text-xs font-medium text-muted">
                  Clearance report
                </span>
              </div>

              <div className="space-y-3 p-5">
                <div className="rounded-xl border border-dashed border-brand-cyan/40 bg-brand-blue/10 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-brand-cyan">
                        Candidate
                      </p>
                      <p className="mt-1 text-lg font-semibold">Ledgerloop</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-extrabold gradient-text">82</p>
                      <p className="text-[10px] uppercase tracking-wider text-muted">
                        Score
                      </p>
                    </div>
                  </div>
                </div>

                {sampleChecks.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between rounded-xl border border-white/8 bg-white/5 px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-blue/25 to-brand-cyan/20 text-accent">
                        <item.icon size={16} />
                      </span>
                      <div>
                        <p className="text-sm font-medium">{item.label}</p>
                        <p className="text-xs text-muted">{item.detail}</p>
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${stateStyles[item.state]}`}
                    >
                      {item.state}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              {sourceChips.map((chip, i) => (
                <div
                  key={chip.name}
                  className="animate-float glass-card flex items-center gap-2 px-3 py-2 shadow-lg"
                  style={{ animationDelay: `${i * 0.8}s` }}
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-brand-blue/30 to-brand-cyan/30 text-brand-cyan">
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
