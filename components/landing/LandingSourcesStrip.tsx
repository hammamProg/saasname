import { SectionHeader } from "@/components/landing/shared";

/** The trust section on its own: nine sources shown as a chip grid rather
 *  than buried at the bottom of the trend-anatomy block. The fact that
 *  there are nine matters; a card each for them does not. */
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

export default function LandingSourcesStrip() {
  return (
    <section className="relative py-20 sm:py-24">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          badge="Sources"
          title="Reading every day, across nine sources."
          subtitle="One source moving alone is noise, and we label it that way — a single-source trend stays low-confidence until something unrelated confirms it."
        />

        <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
          {SOURCES.map((source) => (
            <span
              key={source}
              className="rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground"
            >
              {source}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
