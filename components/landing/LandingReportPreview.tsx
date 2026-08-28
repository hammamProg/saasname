"use client";

import { useState } from "react";
import { SectionHeader } from "@/components/landing/shared";

type Row = { label: string; detail: string; state: "clear" | "caution" | "taken" };

const stateStyles: Record<Row["state"], string> = {
  clear: "bg-emerald-50 text-emerald-700",
  caution: "bg-amber-50 text-amber-700",
  taken: "bg-red-50 text-red-700",
};

/** An illustrative report, not a recorded one. The vocabulary matches the real
 *  rollup so the section does not describe a product that does not exist. */
const candidates = [
  {
    id: "ledgerloop",
    name: "Ledgerloop",
    score: 82,
    verdict: "clear" as const,
    summary:
      "The .com is unregistered and no live US mark covers it. One dormant X handle is the only friction worth noting.",
    rows: [
      { label: "ledgerloop.com", detail: "Available", state: "clear" },
      { label: "ledgerloop.io", detail: "Available", state: "clear" },
      { label: "US trademark", detail: "No live mark on the register", state: "clear" },
      { label: "App Store", detail: "No matching app", state: "clear" },
      { label: "Google Play", detail: "No matching listing", state: "clear" },
      { label: "github.com/ledgerloop", detail: "Free", state: "clear" },
      { label: "x.com/ledgerloop", detail: "Taken — inactive since 2013", state: "caution" },
      { label: "Web presence", detail: "3 weak results, none commercial", state: "caution" },
    ] satisfies Row[],
  },
  {
    id: "tallyhaus",
    name: "Tallyhaus",
    score: 54,
    verdict: "caution" as const,
    summary:
      "The .com is parked and a German bookkeeping tool already ranks for the term. Usable, but you will be fighting for the name.",
    rows: [
      { label: "tallyhaus.com", detail: "Registered — parked", state: "taken" },
      { label: "tallyhaus.io", detail: "Available", state: "clear" },
      { label: "US trademark", detail: "No live mark on the register", state: "clear" },
      { label: "App Store", detail: "No matching app", state: "clear" },
      { label: "Google Play", detail: "No matching listing", state: "clear" },
      { label: "github.com/tallyhaus", detail: "Free", state: "clear" },
      { label: "x.com/tallyhaus", detail: "Free", state: "clear" },
      { label: "Web presence", detail: "Established competitor ranks #1", state: "caution" },
    ] satisfies Row[],
  },
  {
    id: "notchbook",
    name: "Notchbook",
    score: 18,
    verdict: "taken" as const,
    summary:
      "A live US mark in a neighbouring class and a shipping iOS app. Not a name to build a brand on.",
    rows: [
      { label: "notchbook.com", detail: "Registered — live site", state: "taken" },
      { label: "notchbook.io", detail: "Registered", state: "taken" },
      { label: "US trademark", detail: "1 live mark", state: "taken" },
      { label: "App Store", detail: "App published 2024", state: "taken" },
      { label: "Google Play", detail: "No matching listing", state: "clear" },
      { label: "github.com/notchbook", detail: "Taken", state: "taken" },
      { label: "x.com/notchbook", detail: "Taken — active", state: "taken" },
      { label: "Web presence", detail: "Brand owns page one", state: "taken" },
    ] satisfies Row[],
  },
];

export default function LandingReportPreview() {
  const [activeId, setActiveId] = useState(candidates[0].id);
  const active = candidates.find((c) => c.id === activeId) ?? candidates[0];

  return (
    <section className="relative py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          badge="The report"
          title="A Verdict You Can Check Yourself"
          subtitle="Every row comes from a source you can open. Nothing is inferred, and nothing is hidden behind a score."
        />

        <div className="mt-12 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="flex gap-1 overflow-x-auto border-b border-border bg-surface p-2">
            {candidates.map((candidate) => (
              <button
                key={candidate.id}
                type="button"
                onClick={() => setActiveId(candidate.id)}
                className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  activeId === candidate.id
                    ? "bg-primary-soft text-primary"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {candidate.name}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border px-6 py-5">
            <div>
              <h3 className="text-2xl font-extrabold">{active.name}</h3>
              <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted">
                {active.summary}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${stateStyles[active.verdict]}`}
              >
                {active.verdict}
              </span>
              <div className="text-right">
                <p className="text-3xl font-extrabold gradient-text">{active.score}</p>
                <p className="text-[10px] uppercase tracking-wider text-muted">Score</p>
              </div>
            </div>
          </div>

          <ul className="divide-y divide-border">
            {active.rows.map((row) => (
              <li
                key={row.label}
                className="flex items-center justify-between gap-4 px-6 py-3.5"
              >
                <span className="font-mono text-sm">{row.label}</span>
                <span className="flex items-center gap-3 text-right">
                  <span className="hidden text-sm text-muted sm:inline">{row.detail}</span>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${stateStyles[row.state]}`}
                  >
                    {row.state}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="mt-4 text-center text-xs text-muted">
          Illustrative report. Availability changes by the minute — every search
          queries the sources live.
        </p>
      </div>
    </section>
  );
}
