import { Star } from "lucide-react";
import { SectionHeader } from "@/components/landing/shared";

const testimonials = [
  {
    quote:
      "I saved 3 weeks on auth and payments alone. Shipped my first paying customer in 12 days.",
    name: "Sarah Chen",
    role: "Founder, MetricFlow",
    company: "metricflow.io",
    initial: "SC",
    metric: "3 weeks saved",
  },
  {
    quote:
      "We launch 2–3 client SaaS products per quarter. ShipNow cut our setup time from weeks to days.",
    name: "Marcus Webb",
    role: "Agency Lead, LaunchLab",
    company: "launchlab.dev",
    initial: "MW",
    metric: "$18k first month",
  },
  {
    quote:
      "The code quality is actually production-ready. Not a toy boilerplate — real architecture I trust.",
    name: "Priya Patel",
    role: "Indie Hacker",
    company: "shipkit.app",
    initial: "PP",
    metric: "Live in 5 days",
  },
  {
    quote:
      "Finally stopped rebuilding the same dashboard and email setup. Now I focus on the product idea.",
    name: "Alex Rivera",
    role: "Developer & Founder",
    company: "stackwise.co",
    initial: "AR",
    metric: "100+ hrs saved",
  },
];

export default function LandingTestimonials() {
  return (
    <section id="testimonials" className="relative py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          badge="Testimonials"
          title="Founders Who Ship Faster"
          subtitle="Real makers launching real products — with time and revenue to show for it."
        />

        <div className="mt-16 grid gap-6 sm:grid-cols-2">
          {testimonials.map((item) => (
            <figure
              key={item.name}
              className="glass-card glass-card-hover flex flex-col p-8"
            >
              <div className="flex gap-1 text-amber-400">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} size={14} fill="currentColor" />
                ))}
              </div>

              <blockquote className="mt-4 flex-1 text-base leading-relaxed">
                &ldquo;{item.quote}&rdquo;
              </blockquote>

              <figcaption className="mt-6 flex items-center justify-between gap-4 border-t border-white/10 pt-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-brand-blue/30 to-brand-cyan/30 text-sm font-bold">
                    {item.initial}
                  </div>
                  <div>
                    <p className="font-bold">{item.name}</p>
                    <p className="text-sm text-muted">{item.role}</p>
                    <p className="text-xs text-muted">{item.company}</p>
                  </div>
                </div>
                <span className="shrink-0 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-400">
                  {item.metric}
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
