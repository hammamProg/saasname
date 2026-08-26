import Link from "next/link";
import { ArrowRight, FileCheck2, Radar, Wand2 } from "lucide-react";

/** Shown until the first report exists. The alternative was leaving the lower
 *  half of the dashboard blank, which reads as a broken page rather than a
 *  new account. */
const steps = [
  {
    icon: Wand2,
    title: "Describe or paste",
    body: "Give us the idea and we write candidates, or paste names you already have.",
  },
  {
    icon: Radar,
    title: "We check six sources",
    body: "Domains, US trademarks, both app stores, social handles, and web search.",
  },
  {
    icon: FileCheck2,
    title: "You get a verdict",
    body: "Clear, contested, or blocked per name — with a link to every piece of evidence.",
  },
];

export default function EmptyStateGuide() {
  return (
    <section aria-label="How it works" className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold">What happens next</h2>
        <Link
          href="/dashboard/new"
          className="flex items-center gap-1 text-sm font-semibold text-primary transition-colors hover:text-primary-hover"
        >
          Start the first one
          <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {steps.map((step, index) => (
          <div key={step.title} className="card p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <step.icon size={17} aria-hidden="true" />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-muted">
                Step {index + 1}
              </span>
            </div>
            <h3 className="mt-3 font-bold">{step.title}</h3>
            <p className="mt-1 text-sm leading-relaxed text-muted">{step.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
