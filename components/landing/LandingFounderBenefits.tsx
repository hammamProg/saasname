import { SectionHeader } from "@/components/landing/shared";

const benefits = [
  {
    emoji: "⚖️",
    title: "Find the blocker early",
    description:
      "A live trademark discovered in week one costs you nothing. Discovered in month six, it costs you the brand.",
  },
  {
    emoji: "🎯",
    title: "Decide, then move on",
    description:
      "Naming is a decision to close, not a hobby. Get a defensible answer and get back to building.",
  },
  {
    emoji: "🔍",
    title: "Evidence, not opinions",
    description:
      "Every signal links to the registry, register, store, or search result it came from.",
  },
  {
    emoji: "🤝",
    title: "Something you can forward",
    description:
      "Share a read-only report with a co-founder or lawyer instead of pasting fifteen screenshots.",
  },
  {
    emoji: "🧾",
    title: "No subscription",
    description:
      "Credits are bought in packs and never expire. Name a product twice a year and pay for exactly that.",
  },
  {
    emoji: "📚",
    title: "A record of what you rejected",
    description:
      "Every report stays in your history, so the name you dismissed in March does not come back in June.",
  },
];

export default function LandingFounderBenefits() {
  return (
    <section className="relative py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          badge="Why founders use it"
          title="Built For The Week Before You Commit"
          subtitle="Solo founders, agencies naming client products, and anyone who has already lost a name to a squatter once."
        />

        <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {benefits.map((benefit) => (
            <article key={benefit.title} className="glass-card glass-card-hover p-6">
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
