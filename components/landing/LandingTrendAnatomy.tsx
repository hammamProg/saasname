import { SectionHeader } from "@/components/landing/shared";
import TrendCardSample from "@/components/landing/TrendCardSample";

/** The trust section, with the source list folded in as a compact strip
 *  rather than its own section — the fact that there are nine sources matters,
 *  a card each for them does not. */
const SOURCES = [
  "Hacker News",
  "GitHub",
  "npm",
  "PyPI",
  "arXiv",
  "Hugging Face",
  "Stack Overflow",
  "Publisher feeds",
  "Search demand",
];

const annotations = [
  {
    label: "Strength",
    body: "How much this week moved against last week, and how many independent sources agree. Ranked strongest-first so you start where the signal is loudest.",
  },
  {
    label: "Stage",
    body: "Early signal through cooling. Early is where the opportunity is; established tells you you're already late.",
  },
  {
    label: "Evidence",
    body: "The actual posts, repos and packages behind the score. Nothing is asserted without a link you can open and judge yourself.",
  },
];

export default function LandingTrendAnatomy() {
  return (
    <section id="what-you-get" className="relative py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          badge="What you get"
          title="A number you can't trace is a number you can't use."
          subtitle="Every trend arrives with its reasoning attached — a candidate for a new product, or a feature in the one you already run."
        />

        <div className="mt-14 grid items-start gap-10 lg:grid-cols-2 lg:gap-14">
          <TrendCardSample className="lg:sticky lg:top-24" />

          <dl className="space-y-5">
            {annotations.map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-border bg-card p-6"
              >
                <dt className="text-sm font-bold uppercase tracking-wider text-primary">
                  {item.label}
                </dt>
                <dd className="mt-2 text-sm leading-relaxed text-muted">
                  {item.body}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="mt-14 rounded-2xl border border-border bg-surface p-7 text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">
            Reading every day
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            {SOURCES.map((source) => (
              <span key={source} className="text-sm font-medium">
                {source}
              </span>
            ))}
          </div>
          <p className="mt-4 text-xs text-muted">
            One source moving alone is noise, and we label it that way — a
            single-source trend stays low-confidence until something unrelated
            confirms it.
          </p>
        </div>
      </div>
    </section>
  );
}
