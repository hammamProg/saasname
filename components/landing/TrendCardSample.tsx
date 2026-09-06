import { ArrowUpRight, TrendingUp } from "lucide-react";
import { cn } from "@/libs/cn";

/** The product's core unit of value, rendered as a static sample.
 *
 *  Deliberately not wired to live data: the landing page must never imply a
 *  number the pipeline has not actually produced, and a real feed needs a
 *  signed-in user plus a nightly run. Everything here is labelled as an
 *  example, and every figure shown is one the real card also shows — so the
 *  page promises exactly the product that ships, no more. */

export type SampleEvidence = {
  source: string;
  title: string;
};

export type SampleTrend = {
  name: string;
  stage: string;
  summary: string;
  momentum: string;
  confidence: number;
  sourceCount: number;
  evidence: SampleEvidence[];
};

export const SAMPLE_TREND: SampleTrend = {
  name: "Local-first sync engines",
  stage: "Accelerating",
  summary:
    "Libraries that keep app state on-device and reconcile it in the background, replacing always-online CRUD backends.",
  momentum: "+164% signals vs. last week",
  confidence: 82,
  sourceCount: 5,
  evidence: [
    { source: "Hacker News", title: "Show HN: offline-first sync in 400 lines" },
    { source: "GitHub", title: "sync-engine — 2.4k stars in 14 days" },
    { source: "npm", title: "Three new CRDT packages this month" },
  ],
};

export default function TrendCardSample({
  trend = SAMPLE_TREND,
  className,
  frameless = false,
}: {
  trend?: SampleTrend;
  className?: string;
  /** Skips the card's own border/shadow/radius so it can sit inside an
   *  external frame (the hero's browser-chrome mockup). */
  frameless?: boolean;
}) {
  return (
    <div
      className={cn(
        frameless ? "p-6 sm:p-7" : "glass-card overflow-hidden p-6 sm:p-7",
        className
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
            Example trend
          </p>
          <h3 className="mt-1 truncate text-xl font-extrabold tracking-tight">
            {trend.name}
          </h3>
        </div>
        <span className="shrink-0 rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary">
          {trend.stage}
        </span>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-muted">{trend.summary}</p>

      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
        <span className="inline-flex items-center gap-1.5 font-semibold text-primary">
          <TrendingUp size={14} className="shrink-0" aria-hidden />
          {trend.momentum}
        </span>
        <span className="text-muted">Confidence {trend.confidence}/100</span>
        <span className="text-muted">
          {trend.sourceCount} independent sources
        </span>
      </div>

      <div className="mt-5 border-t border-border pt-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
          Why it&apos;s ranked here
        </p>
        <ul className="mt-2.5 space-y-2">
          {trend.evidence.map((item) => (
            <li
              key={item.title}
              className="flex items-start gap-2 text-sm leading-snug"
            >
              <ArrowUpRight
                size={14}
                className="mt-0.5 shrink-0 text-primary"
                aria-hidden
              />
              <span>
                <span className="font-medium">{item.source}</span>
                <span className="text-muted"> — {item.title}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
