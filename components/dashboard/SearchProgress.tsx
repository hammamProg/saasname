"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AtSign, Check, Globe, Loader2, Scale, Search, X } from "lucide-react";
import { AppleIcon, GooglePlayIcon } from "@/components/icons/BrandIcons";
import { cn } from "@/libs/cn";

/** Long enough that a burst of fast probes does not queue six server renders,
 *  short enough that the page visibly fills in. */
const REFRESH_INTERVAL_MS = 2500;

/** Newest first, capped so a large run does not grow an unbounded DOM. */
const MAX_LOG_LINES = 8;

/** Outbound calls per name: 5 TLDs + 3 handles + one each for the App Store,
 *  Google Play, USPTO and web search. Stated because a user watching a
 *  progress bar has no other way to see the size of what they bought. */
const LOOKUPS_PER_NAME = 12;

type ProgressEvent =
  | {
      type: "check";
      candidateId: string;
      platform: string;
      status: string;
      done: number;
      total: number;
    }
  | { type: "done"; searchId: string; refunded: number };

type LogLine = {
  key: string;
  name: string;
  platform: string;
  status: string;
  at: number;
};

const SOURCES = [
  { id: "domains", label: "Domains", Icon: Globe },
  { id: "trademark", label: "US trademark", Icon: Scale },
  { id: "app-store", label: "App Store", Icon: AppleIcon },
  { id: "google-play", label: "Google Play", Icon: GooglePlayIcon },
  { id: "socials", label: "Handles", Icon: AtSign },
  { id: "web-serp", label: "Web search", Icon: Search },
] as const;

const SOURCE_LABELS: Record<string, string> = Object.fromEntries(
  SOURCES.map((source) => [source.id, source.label])
);

function elapsed(from: number, to: number): string {
  const seconds = Math.max(0, Math.round((to - from) / 1000));
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

/**
 * Drives a running search and shows the work as it happens.
 *
 * Opening the stream is what starts the work, so this component is mounted
 * whenever a search is not finished — including on a reload, where the run may
 * already be complete and the server simply closes the stream immediately.
 *
 * Deliberately no "already started" ref. Under StrictMode the effect runs,
 * cleans up, then runs again; a ref guard makes the second run bail out after
 * the first has already closed its stream, leaving no live connection at all.
 * Duplicate runs are prevented server-side instead, where two browser tabs are
 * a real possibility and a ref would not have helped anyway.
 *
 * Every line in the feed corresponds to an event the server actually sent.
 * Nothing here is on a timer pretending to be work.
 */
export default function SearchProgress({
  searchId,
  total,
  initialDone,
  candidates = [],
}: {
  searchId: string;
  total: number;
  initialDone: number;
  /** Names the feed by candidate, since events carry only the id. */
  candidates?: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const [done, setDone] = useState(initialDone);
  const [failed, setFailed] = useState(false);
  const [log, setLog] = useState<LogLine[]>([]);
  const [activePlatform, setActivePlatform] = useState<string | null>(null);
  const [settledPlatforms, setSettledPlatforms] = useState<Set<string>>(new Set());
  const [now, setNow] = useState(() => Date.now());
  const [startedAt] = useState(() => Date.now());
  const lastRefreshRef = useRef(0);
  const seqRef = useRef(0);

  // One ticking clock for the whole panel rather than one per line.
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const names = new Map(candidates.map((c) => [c.id, c.name]));
    const source = new EventSource(`/api/searches/${searchId}/stream`);

    source.onmessage = (message) => {
      const event = JSON.parse(message.data) as ProgressEvent;

      if (event.type === "check") {
        setDone(event.done);
        setActivePlatform(event.platform);
        setSettledPlatforms((prev) => new Set(prev).add(event.platform));
        seqRef.current += 1;
        setLog((prev) =>
          [
            {
              key: `${event.candidateId}:${event.platform}:${seqRef.current}`,
              name: names.get(event.candidateId) ?? "Candidate",
              platform: event.platform,
              status: event.status,
              at: Date.now(),
            },
            ...prev,
          ].slice(0, MAX_LOG_LINES)
        );

        // Each result is already in the database by the time its event is
        // emitted, so pulling the server render forward is what actually makes
        // "results appear as each source answers" true. Throttled, because one
        // refresh per check would be up to 48 round trips on a full run.
        const at = Date.now();
        if (at - lastRefreshRef.current > REFRESH_INTERVAL_MS) {
          lastRefreshRef.current = at;
          router.refresh();
        }
        return;
      }

      source.close();
      // The stream carried progress; the report itself is re-read from the
      // database, which is the only thing that was ever authoritative.
      router.refresh();
    };

    source.onerror = () => {
      source.close();
      setFailed(true);
      // The run keeps going server-side, so a refresh will pick up whatever
      // finished. Losing the connection is not losing the work.
      router.refresh();
    };

    return () => source.close();
    // `candidates` is a fresh array each render; the names inside it are
    // stable for the life of the report, so keying on the id is correct.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchId, router]);

  const percent = total > 0 ? Math.round((done / total) * 100) : 0;
  // Every probe has answered, but the verdicts and written summary come after.
  // Without this the bar sits at 6/6 under "Checking…" with nothing happening.
  const scoring = total > 0 && done >= total;
  const nameCount = candidates.length || 1;

  return (
    <section
      className="card overflow-hidden"
      role="status"
      aria-live="polite"
      aria-label="Check progress"
    >
      <div className="space-y-4 border-b border-border p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-sm font-bold">
            <Loader2 size={15} className="animate-spin text-primary" aria-hidden="true" />
            {scoring ? "Scoring and writing the summary…" : "Running clearance checks"}
          </p>
          <p className="flex items-center gap-3 text-sm font-bold tabular-nums">
            <span className="font-mono text-xs font-medium text-muted">
              {elapsed(startedAt, now)}
            </span>
            <span className="text-muted">
              {done}/{total}
            </span>
            <span className="text-primary">{percent}%</span>
          </p>
        </div>

        <div className="h-2 w-full overflow-hidden rounded-full bg-surface">
          <div
            className="relative h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
            style={{ width: `${percent}%` }}
          >
            <span
              aria-hidden="true"
              className="animate-analysis-sweep absolute inset-y-0 w-16 bg-gradient-to-r from-transparent via-white/50 to-transparent"
            />
          </div>
        </div>

        <p className="text-xs text-muted">
          {nameCount} {nameCount === 1 ? "name" : "names"} · 6 sources ·{" "}
          {nameCount * LOOKUPS_PER_NAME} live lookups. You can leave this page;
          the run continues.
        </p>
      </div>

      <div className="grid gap-2 border-b border-border p-5 sm:grid-cols-3">
        {SOURCES.map((source) => {
          const isActive = activePlatform === source.id && !scoring;
          const hasSettled = settledPlatforms.has(source.id);

          return (
            <div
              key={source.id}
              className={cn(
                "relative flex items-center gap-2.5 overflow-hidden rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors",
                isActive
                  ? "animate-pulse-ring border-primary/40 bg-primary-soft text-primary"
                  : hasSettled
                    ? "border-verdict-clear/25 bg-verdict-clear/8 text-foreground"
                    : "border-border bg-surface text-muted"
              )}
            >
              {isActive && (
                <span
                  aria-hidden="true"
                  className="animate-analysis-sweep pointer-events-none absolute inset-y-0 w-12 bg-gradient-to-r from-transparent via-white/60 to-transparent"
                />
              )}
              <source.Icon size={15} className="shrink-0" />
              <span className="relative truncate">{source.label}</span>
              <span className="relative ml-auto shrink-0">
                {hasSettled ? (
                  <Check size={14} className="text-verdict-clear" aria-hidden="true" />
                ) : (
                  <span className="block h-1.5 w-1.5 rounded-full bg-border" aria-hidden="true" />
                )}
              </span>
            </div>
          );
        })}
      </div>

      <div className="p-5">
        <ul className="space-y-1 font-mono text-xs">
          {log.length === 0 ? (
            <li className="text-muted">Opening connections to six sources…</li>
          ) : (
            log.map((line) => (
              <li
                key={line.key}
                className="animate-log-line-in flex items-center gap-3 text-muted"
              >
                <span className="shrink-0 tabular-nums opacity-60">
                  {elapsed(startedAt, line.at)}
                </span>
                <span className="min-w-0 flex-1 truncate">
                  <span className="font-semibold text-foreground">{line.name}</span>
                  <span className="opacity-60"> · </span>
                  {SOURCE_LABELS[line.platform] ?? line.platform}
                </span>
                {line.status === "ok" ? (
                  <span className="flex shrink-0 items-center gap-1 text-verdict-clear">
                    <Check size={12} aria-hidden="true" />
                    checked
                  </span>
                ) : (
                  <span className="flex shrink-0 items-center gap-1 text-verdict-contested">
                    <X size={12} aria-hidden="true" />
                    {line.status}
                  </span>
                )}
              </li>
            ))
          )}
        </ul>

        {failed && (
          <p className="mt-3 text-xs text-verdict-contested">
            Lost the live connection. The check is still running — reload in a
            moment.
          </p>
        )}
      </div>
    </section>
  );
}
