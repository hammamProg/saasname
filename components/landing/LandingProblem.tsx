import { X } from "lucide-react";
import { SectionHeader } from "@/components/landing/shared";

const painPoints = [
  ".com gone, and the squatter wants $4,000",
  "A live US trademark in your exact class",
  "An app on the App Store with the same name",
  "The X handle is a dormant account from 2013",
  "Page one of Google already belongs to someone else",
  "GitHub org taken by an abandoned project",
  "A Play Store listing you never thought to check",
  "Six tabs, six sources, no answer you can trust",
];

export default function LandingProblem() {
  return (
    <section className="relative py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          badge="The problem"
          title="The Name Is Never The Hard Part. Proving It's Free Is."
          subtitle="You fall in love with a name in ten minutes, then lose an afternoon to registrar pages, trademark databases, and app stores — and still ship without knowing whether you're walking into a cease-and-desist."
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
                Checking by hand
              </p>
              <p className="mt-2 text-4xl font-extrabold tracking-tight">
                ~40 minutes
              </p>
              <p className="mt-2 text-sm text-muted">
                Per name. Across six sources. And you still skip the trademark
                search because the interface is from 2004.
              </p>
            </div>

            <div className="relative glass-card border-emerald-500/25 p-6 shadow-lg shadow-emerald-500/10">
              <div className="absolute -inset-px rounded-2xl bg-gradient-to-r from-brand-blue/25 via-brand-cyan/20 to-brand-violet/10 opacity-50 blur-sm" />
              <div className="relative">
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                  With a report
                </p>
                <p className="mt-2 text-4xl font-extrabold tracking-tight gradient-text">
                  One page
                </p>
                <p className="mt-2 text-sm text-muted">
                  Every source, every candidate, one verdict each — with a link
                  to the evidence so you can check our work.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
