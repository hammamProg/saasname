import Image from "next/image";
import { SectionHeader } from "@/components/landing/shared";
import { CodexAgentIcon } from "@/components/icons/AgentIcons";

/** Every place the install snippet already works, shown as a chip grid —
 *  the same variants InstallSnippet renders once you're signed in, so this
 *  section can never promise a target that doesn't exist. */
const TARGETS = [
  { label: "HTML" },
  { label: "Next.js" },
  { label: "WordPress" },
  { label: "Cursor", icon: "/analytics/agents/cursor.png" },
  { label: "Claude Code", icon: "/analytics/agents/claude-code.png" },
  { label: "Codex", codex: true },
];

export default function LandingSourcesStrip() {
  return (
    <section className="relative py-20 sm:py-24">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          badge="Install"
          title="One snippet, every stack."
          subtitle="Paste it by hand, or hand the exact same command to the AI agent you already have open."
        />

        <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
          {TARGETS.map((target) => (
            <span
              key={target.label}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground"
            >
              {target.icon ? (
                <Image src={target.icon} alt="" width={16} height={16} unoptimized />
              ) : target.codex ? (
                <CodexAgentIcon size={16} />
              ) : null}
              {target.label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
