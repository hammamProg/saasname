import { CreditCard, Rocket, ShoppingBag } from "lucide-react";
import { SectionHeader } from "@/components/landing/shared";

const steps = [
  {
    step: "01",
    icon: ShoppingBag,
    title: "Buy ShipNow",
    description:
      "One-time purchase. Lifetime access to the full codebase, docs, and future updates.",
    visual: (
      <div className="mt-6 space-y-2 rounded-xl border border-white/10 bg-black/30 p-4 font-mono text-xs">
        <p className="text-emerald-400">✓ Checkout complete</p>
        <p className="text-muted">Lifetime access unlocked</p>
        <p className="text-brand-mint">→ Download & clone repo</p>
      </div>
    ),
  },
  {
    step: "02",
    icon: Rocket,
    title: "Create Your New SaaS Project",
    description:
      "Use the launchpad to configure auth, payments, database, and email in guided steps.",
    visual: (
      <div className="mt-6 space-y-2">
        {["Auth", "Database", "Payments", "Email"].map((item, i) => (
          <div
            key={item}
            className="flex items-center justify-between rounded-lg border border-white/8 bg-white/5 px-3 py-2 text-xs"
          >
            <span>{item}</span>
            <span className={i < 3 ? "text-emerald-400" : "text-muted"}>
              {i < 3 ? "Connected" : "Setup…"}
            </span>
          </div>
        ))}
      </div>
    ),
  },
  {
    step: "03",
    icon: CreditCard,
    title: "Launch & Get Paying Customers",
    description:
      "Deploy to production, start charging, and focus on your unique product features.",
    visual: (
      <div className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center">
        <p className="text-2xl font-extrabold text-emerald-400">$2,450</p>
        <p className="mt-1 text-xs text-muted">First month revenue</p>
        <p className="mt-3 text-xs font-semibold text-emerald-300">🚀 Live in production</p>
      </div>
    ),
  },
];

export default function LandingHowItWorks() {
  return (
    <section className="relative py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          badge="How it works"
          title="From Purchase to Production in 3 Steps"
          subtitle="No more months of setup. ShipNow gets you from zero to revenue-ready in days."
        />

        <div className="mt-16 grid gap-8 lg:grid-cols-3">
          {steps.map((item) => (
            <article
              key={item.step}
              className="glass-card glass-card-hover relative overflow-hidden p-8"
            >
              <span className="text-5xl font-extrabold text-white/5">{item.step}</span>
              <div className="mt-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-brand-teal/25 to-brand-mint/20 text-accent">
                <item.icon size={22} />
              </div>
              <h3 className="mt-6 text-xl font-bold">{item.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">{item.description}</p>
              {item.visual}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
