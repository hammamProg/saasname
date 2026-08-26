"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

/** Placeholder rows while the model writes. Eight because that is how many
 *  candidates the generator is asked for, so the space does not jump when the
 *  real names land. */
const SLOTS = Array.from({ length: 8 }, (_, index) => index);

/** What the generator is actually being asked to weigh, rotated so the wait
 *  reads as work rather than as a hang. These describe the prompt's criteria;
 *  they are not per-step progress, and none of them claims to be finished. */
const CRITERIA = [
  "Reading your idea",
  "Weighing sound and length",
  "Avoiding names that read as typos",
  "Keeping them pronounceable",
  "Checking they normalise to a clean handle",
  "Writing the shortlist",
];

export default function NamingAnimation() {
  const [criterion, setCriterion] = useState(0);

  useEffect(() => {
    const id = window.setInterval(
      () => setCriterion((prev) => (prev + 1) % CRITERIA.length),
      1400
    );
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="space-y-4" role="status" aria-live="polite">
      <p className="flex items-center gap-2 text-sm font-bold">
        <Sparkles size={15} className="animate-pulse text-primary" aria-hidden="true" />
        {CRITERIA[criterion]}…
      </p>

      <ul className="grid gap-2 sm:grid-cols-2">
        {SLOTS.map((slot) => (
          <li
            key={slot}
            className="relative h-[52px] overflow-hidden rounded-xl border border-border bg-surface"
            style={{ animationDelay: `${slot * 90}ms` }}
          >
            <span
              aria-hidden="true"
              className="animate-analysis-sweep absolute inset-y-0 w-20 bg-gradient-to-r from-transparent via-white/70 to-transparent"
              style={{ animationDelay: `${slot * 120}ms` }}
            />
            <span className="absolute left-4 top-4 block h-3 w-24 rounded bg-border/70" />
            <span className="absolute left-4 top-9 block h-2 w-36 rounded bg-border/40" />
          </li>
        ))}
      </ul>

      <p className="text-xs text-muted">
        Generating is free. Nothing is spent until you choose what to check.
      </p>
    </div>
  );
}
