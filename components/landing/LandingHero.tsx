import Link from "next/link";
import {
  ArrowRight,
  Check,
  CreditCard,
  Database,
  Lock,
  Mail,
  Sparkles,
} from "lucide-react";
import ButtonCheckout from "@/components/ButtonCheckout";
import MarketingBackdrop from "@/components/ui/MarketingBackdrop";

const trustBadges = [
  "Production Ready",
  "Save 100+ Hours",
  "Built for Real SaaS Businesses",
];

const floatingLogos = [
  { name: "Next.js", badge: "N" },
  { name: "Supabase", badge: "S" },
  { name: "Paddle", badge: "P" },
  { name: "Stripe", badge: "S", soon: true },
  { name: "Resend", badge: "R" },
];

const dashboardItems = [
  { icon: Sparkles, label: "Create project", status: "Ready" },
  { icon: Lock, label: "Authentication", status: "Connected" },
  { icon: CreditCard, label: "Paddle payments", status: "Connected" },
  { icon: Database, label: "Supabase database", status: "Connected" },
  { icon: Mail, label: "Resend emails", status: "Connected" },
];

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
              Production-ready SaaS starter kit
            </div>

            <h1 className="section-heading text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl xl:text-7xl">
              Launch Your SaaS in{" "}
              <span className="gradient-text">Days. Not Months.</span>
            </h1>

            <p className="max-w-xl text-lg leading-relaxed text-muted sm:text-xl">
              ShipNow gives you a complete production-ready SaaS foundation with
              authentication, payments, emails, database, SEO, and deployment
              workflows already configured.
            </p>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <ButtonCheckout
                label="Get ShipNow"
                source="landing"
                extraStyle="btn-gradient px-8 py-3.5 text-sm"
              />
              <Link href="/dashboard" className="btn-ghost px-8 py-3.5 text-sm">
                View Demo
                <ArrowRight size={16} />
              </Link>
            </div>

            <ul className="flex flex-wrap gap-x-6 gap-y-2 pt-2">
              {trustBadges.map((badge) => (
                <li key={badge} className="flex items-center gap-2 text-sm text-muted">
                  <Check size={16} className="shrink-0 text-brand-mint" />
                  {badge}
                </li>
              ))}
            </ul>
          </div>

          <div className="animate-fade-up relative [animation-delay:150ms]">
            <div className="absolute -inset-6 rounded-[2.5rem] bg-gradient-to-br from-brand-teal/25 via-brand-mint/15 to-brand-gold/10 blur-3xl" />

            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/40 shadow-2xl shadow-brand-teal/10 ring-1 ring-white/10 backdrop-blur-xl">
              <div className="flex items-center gap-2 border-b border-white/10 bg-white/5 px-4 py-3">
                <span className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
                <span className="ml-2 text-xs font-medium text-muted">
                  ShipNow Launchpad
                </span>
              </div>

              <div className="space-y-3 p-5">
                <div className="rounded-xl border border-dashed border-brand-mint/40 bg-brand-teal/10 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-brand-mint">
                    New project
                  </p>
                  <p className="mt-1 font-semibold">my-saas-app</p>
                  <p className="mt-1 text-xs text-muted">
                    Create your SaaS foundation in one click
                  </p>
                </div>

                {dashboardItems.slice(1).map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between rounded-xl border border-white/8 bg-white/5 px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-teal/25 to-brand-mint/20 text-accent">
                        <item.icon size={16} />
                      </span>
                      <span className="text-sm font-medium">{item.label}</span>
                    </div>
                    <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pointer-events-none absolute -right-4 top-8 hidden flex-col gap-3 lg:flex">
              {floatingLogos.map((logo, i) => (
                <div
                  key={logo.name}
                  className="animate-float glass-card flex items-center gap-2 px-3 py-2 shadow-lg"
                  style={{ animationDelay: `${i * 0.8}s` }}
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-brand-teal/30 to-brand-mint/30 text-xs font-bold">
                    {logo.badge}
                  </span>
                  <span className="text-xs font-medium">
                    {logo.name}
                    {logo.soon && (
                      <span className="ml-1 text-[10px] text-muted">(Soon)</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
