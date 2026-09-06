import { SectionHeader } from "@/components/landing/shared";

/** Mirrors the real pipeline rather than a marketing abstraction, so the page
 *  and the system cannot drift apart. Three steps, not five — the ingest and
 *  cluster stages are one idea from the reader's side. */
const steps = [
  {
    number: "01",
    title: "Watch",
    body: "Nine sources, pulled every day: launches, repos, packages, papers, models, developer questions and search demand.",
  },
  {
    number: "02",
    title: "Cluster and score",
    body: "Related activity from unrelated sources collapses into one named trend, scored nightly on momentum and how many sources agree.",
  },
  {
    number: "03",
    title: "Act early",
    body: "Your feed ranks them strongest-first, with the evidence attached — so you can judge it yourself instead of taking our word.",
  },
];

export default function LandingHowItWorks() {
  return (
    <section id="how-it-works" className="relative bg-surface py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          badge="How it works"
          title="Noise in, ranked opportunities out."
          subtitle="The same three steps run every day, whether or not anyone is watching."
        />

        <ol className="mt-14 grid gap-6 md:grid-cols-3">
          {steps.map((step) => (
            <li
              key={step.number}
              className="rounded-2xl border border-border bg-card p-7"
            >
              <span className="gradient-text text-3xl font-extrabold tracking-tight">
                {step.number}
              </span>
              <h3 className="mt-3 text-lg font-bold">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {step.body}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
