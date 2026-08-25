import { SectionHeader } from "@/components/landing/shared";

const benefits = [
  {
    emoji: "🚀",
    title: "Launch Faster",
    description: "Go from idea to production in days, not months of boilerplate work.",
  },
  {
    emoji: "💰",
    title: "Start Charging Immediately",
    description: "Paddle checkout and subscription logic ready on day one.",
  },
  {
    emoji: "🔒",
    title: "Production-Ready Security",
    description: "Auth, protected routes, and RLS policies configured correctly.",
  },
  {
    emoji: "📈",
    title: "Built-In Growth Foundation",
    description: "SEO, landing page, waitlist, and email flows to acquire users.",
  },
  {
    emoji: "⚡",
    title: "Modern Tech Stack",
    description: "Next.js 16, React 19, Supabase, Tailwind v4 — battle-tested and current.",
  },
  {
    emoji: "🎯",
    title: "Focus Only On Your Unique Idea",
    description: "Skip the repetitive setup. Build features that differentiate your product.",
  },
];

export default function LandingFounderBenefits() {
  return (
    <section className="relative py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          badge="Founder benefits"
          title="Built for Founders Who Ship"
          subtitle="Whether you're a solo indie hacker or an agency launching client products — ShipNow accelerates every launch."
        />

        <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {benefits.map((benefit) => (
            <article
              key={benefit.title}
              className="glass-card glass-card-hover p-6"
            >
              <span className="text-3xl" role="img" aria-hidden="true">
                {benefit.emoji}
              </span>
              <h3 className="mt-4 text-lg font-bold">{benefit.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {benefit.description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
