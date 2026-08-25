import { X } from "lucide-react";
import { SectionHeader } from "@/components/landing/shared";

const painPoints = [
  "Authentication setup",
  "Database architecture",
  "Payment integration",
  "Email infrastructure",
  "SEO configuration",
  "User management",
  "Subscription logic",
  "Deployment setup",
];

export default function LandingProblem() {
  return (
    <section className="relative py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          badge="The problem"
          title="Stop Rebuilding The Same SaaS Foundation"
          subtitle="Every new SaaS project starts with the same weeks of boilerplate. ShipNow eliminates the grind so you can focus on what makes your product unique."
        />

        <div className="mt-16 grid gap-8 lg:grid-cols-2 lg:gap-12">
          <div className="grid gap-3 sm:grid-cols-2">
            {painPoints.map((point) => (
              <div
                key={point}
                className="glass-card glass-card-hover flex items-start gap-3 p-4"
              >
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-500/15 text-red-400">
                  <X size={12} strokeWidth={3} />
                </span>
                <span className="text-sm font-medium">{point}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-col justify-center gap-6">
            <div className="glass-card border-red-500/20 p-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-red-400">
                Without ShipNow
              </p>
              <p className="mt-2 text-4xl font-extrabold tracking-tight">4–8 weeks</p>
              <p className="mt-2 text-sm text-muted">
                Auth, payments, emails, database, dashboards — rebuilt from scratch every time.
              </p>
            </div>

            <div className="relative glass-card border-emerald-500/25 p-6 shadow-lg shadow-emerald-500/10">
              <div className="absolute -inset-px rounded-2xl bg-gradient-to-r from-brand-blue/25 via-brand-cyan/20 to-brand-violet/10 opacity-50 blur-sm" />
              <div className="relative">
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                  With ShipNow
                </p>
                <p className="mt-2 text-4xl font-extrabold tracking-tight gradient-text">
                  Launch today
                </p>
                <p className="mt-2 text-sm text-muted">
                  Everything pre-wired. Clone, customize, and start talking to customers this week.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
