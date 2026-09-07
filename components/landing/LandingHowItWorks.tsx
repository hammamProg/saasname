import { SectionHeader } from "@/components/landing/shared";

/** Mirrors the real flow rather than a marketing abstraction, so the page and
 *  the product cannot drift apart. */
const steps = [
  {
    number: "01",
    title: "Add the snippet",
    body: "One script tag. Paste it by hand, or hand the same prompt to Cursor, Claude Code or Codex and let it find the right file.",
  },
  {
    number: "02",
    title: "It confirms itself",
    body: "The install screen watches for your first pageview and flips to \"Connected\" within seconds — no reload, no guessing whether it worked.",
  },
  {
    number: "03",
    title: "Watch it live",
    body: "Visitors, referrers, countries and who's on the site right now, updating without a page reload.",
  },
];

export default function LandingHowItWorks() {
  return (
    <section id="how-it-works" className="relative bg-surface py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          badge="How it works"
          title="Three steps, and the last one never ends."
          subtitle="Install once. Everything after that just runs."
        />

        <ol className="mt-14 grid gap-6 md:grid-cols-3">
          {steps.map((step) => (
            <li
              key={step.number}
              className="rounded-2xl border border-border bg-card p-7"
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-foreground text-sm font-bold text-background">
                {step.number}
              </span>
              <h3 className="mt-4 text-lg font-bold">{step.title}</h3>
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
