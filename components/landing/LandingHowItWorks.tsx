import { FileCheck2, Radar, Wand2 } from "lucide-react";
import config from "@/config";
import { SectionHeader } from "@/components/landing/shared";

const steps = [
  {
    step: "01",
    icon: Wand2,
    title: "Describe the idea",
    description:
      "One sentence is enough. You get 5–8 candidate names back, free — generating costs no credits.",
    visual: (
      <div className="mt-6 space-y-2 rounded-xl border border-border bg-surface p-4 font-mono text-xs">
        <p className="text-muted">&gt; expense tracking for freelancers</p>
        <p className="text-primary">Ledgerloop</p>
        <p className="text-primary">Tallyhaus</p>
        <p className="text-primary">Notchbook</p>
      </div>
    ),
  },
  {
    step: "02",
    icon: Radar,
    title: "Pick the ones worth checking",
    description:
      "One credit per candidate. Results stream in as each source answers — you are not staring at a spinner.",
    visual: (
      <div className="mt-6 space-y-2">
        {[
          ["Domains", "done"],
          ["Trademark", "done"],
          ["App stores", "done"],
          ["Handles", "running"],
        ].map(([item, state]) => (
          <div
            key={item}
            className="flex items-center justify-between rounded-lg border border-border bg-surface px-3 py-2 text-xs"
          >
            <span>{item}</span>
            <span className={state === "done" ? "text-emerald-600" : "text-muted"}>
              {state === "done" ? "Checked" : "Checking…"}
            </span>
          </div>
        ))}
      </div>
    ),
  },
  {
    step: "03",
    icon: FileCheck2,
    title: "Read the verdict and go register",
    description:
      "Clear, caution, or taken — with a short explanation and a link to the evidence behind every signal.",
    visual: (
      <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
        <p className="text-2xl font-extrabold text-emerald-700">Clear</p>
        <p className="mt-1 text-xs text-muted">Ledgerloop · score 82</p>
        <p className="mt-3 text-xs font-semibold text-emerald-600">
          .com available · no live mark
        </p>
      </div>
    ),
  },
];

export default function LandingHowItWorks() {
  return (
    <section id="how-it-works" className="relative py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          badge="How it works"
          title="Idea to Verdict in Three Steps"
          subtitle={`Your first ${config.credits.signupGrant} searches are on us — enough to settle a name before you spend anything.`}
        />

        <div className="mt-16 grid gap-8 lg:grid-cols-3">
          {steps.map((item) => (
            <article
              key={item.step}
              className="glass-card glass-card-hover relative overflow-hidden p-8"
            >
              <span className="text-5xl font-extrabold text-primary/15">{item.step}</span>
              <div className="mt-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <item.icon size={22} />
              </div>
              <h3 className="mt-6 text-xl font-bold">{item.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">{item.description}</p>
              {item.visual}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
