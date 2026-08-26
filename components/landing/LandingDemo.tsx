"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Globe, Loader2, Lock, Scale, Search } from "lucide-react";
import { AppleIcon } from "@/components/icons/BrandIcons";
import config from "@/config";
import { cn } from "@/libs/cn";
import {
  trackDemoCheckRun,
  trackDemoExampleClicked,
  trackDemoVerdictShown,
} from "@/libs/analytics";

type Verdict = "clear" | "contested" | "blocked" | "unknown";

type DemoCheck = {
  platform: string;
  status: string;
  verdict: Verdict;
  signals: Record<string, unknown>;
  evidenceUrl: string | null;
};

type DemoResult = {
  name: string;
  checks: DemoCheck[];
  withheld: string[];
  remaining: number;
};

const SOURCES = [
  { id: "domains", label: "Domains", Icon: Globe },
  { id: "trademark", label: "US trademark", Icon: Scale },
  { id: "app-store", label: "App Store", Icon: AppleIcon },
] as const;

const VERDICT_STYLES: Record<Verdict, string> = {
  clear: "border-verdict-clear/30 bg-verdict-clear/10 text-verdict-clear",
  contested: "border-verdict-contested/30 bg-verdict-contested/10 text-verdict-contested",
  blocked: "border-verdict-blocked/30 bg-verdict-blocked/10 text-verdict-blocked",
  unknown: "border-white/10 bg-white/5 text-verdict-unknown",
};

const VERDICT_LABELS: Record<Verdict, string> = {
  clear: "clear",
  contested: "caution",
  blocked: "taken",
  unknown: "unknown",
};

/** A known-taken name, so the first thing a visitor sees the tool do is catch
 *  a real conflict. A "clear" example would demo the boring half. */
const EXAMPLE_NAME = "Notion";

const VERDICT_SEVERITY: Record<Verdict, number> = {
  clear: 0,
  unknown: 1,
  contested: 2,
  blocked: 3,
};

/** The headline verdict is the worst one found — one blocked source is enough
 *  to make a name a bad idea, however clear the others are. */
function worstVerdict(checks: DemoCheck[]): Verdict {
  return checks.reduce<Verdict>(
    (worst, check) =>
      VERDICT_SEVERITY[check.verdict] > VERDICT_SEVERITY[worst] ? check.verdict : worst,
    "clear"
  );
}

/** One line per source, read from the same signals the real report renders. */
function describe(check: DemoCheck): string {
  const s = check.signals;

  if (check.status !== "ok") return "could not check";

  if (check.platform === "domains") {
    const tlds = ["com", "io", "ai", "dev", "app"];
    const free = tlds.filter((tld) => s[tld] === "available");
    if (free.length === 0) return "every extension taken";
    return `${free.map((tld) => `.${tld}`).join(", ")} available`;
  }

  if (check.platform === "trademark") {
    const live = Number(s.liveMarks) || 0;
    if (live === 0) return "no live mark on the register";
    return `${live} live ${live === 1 ? "mark" : "marks"}${s.liveInSoftwareClass ? ", one in software" : ""}`;
  }

  if (check.platform === "app-store") {
    return s.exactMatch
      ? "an app already uses this name"
      : `no app with this name (${Number(s.resultCount) || 0} similar)`;
  }

  return "checked";
}

export default function LandingDemo() {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DemoResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(0);

  // The work is genuinely done by the time the response lands; staggering the
  // reveal makes three simultaneous answers readable rather than a flash.
  useEffect(() => {
    if (!result) return;
    const timers = result.checks.map((_, index) =>
      window.setTimeout(() => setRevealed(index + 1), 220 * (index + 1))
    );
    return () => timers.forEach(window.clearTimeout);
  }, [result]);

  async function runCheck(candidate: string) {
    if (!candidate || loading) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setRevealed(0);
    trackDemoCheckRun(candidate.length);

    try {
      const response = await fetch("/api/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: candidate }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Could not run that check. Try again.");
        return;
      }

      const demoResult = data as DemoResult;
      setResult(demoResult);
      trackDemoVerdictShown(worstVerdict(demoResult.checks));
    } catch {
      setError("Could not reach the checker. Try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    void runCheck(name.trim());
  }

  function handleExample() {
    trackDemoExampleClicked();
    setName(EXAMPLE_NAME);
    void runCheck(EXAMPLE_NAME);
  }

  const showTiles = loading || result !== null;

  return (
    <div className="relative">
      <div className="absolute -inset-6 rounded-[2.5rem] bg-gradient-to-br from-brand-blue/25 via-brand-cyan/15 to-brand-violet/10 blur-3xl" />

      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/40 shadow-2xl shadow-brand-blue/10 ring-1 ring-white/10 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-white/5 px-5 py-3">
          <p className="text-sm font-bold">Try it now</p>
          <p className="text-xs font-medium text-muted">No account needed</p>
        </div>

        <div className="space-y-4 p-5">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={30}
              placeholder="Type any name…"
              aria-label="Name to check"
              className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-foreground placeholder:text-muted focus:border-brand-cyan/40 focus:outline-none"
            />
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="btn-gradient shrink-0 px-5 py-3 text-sm disabled:opacity-50"
            >
              {loading ? (
                <Loader2 size={15} className="animate-spin" aria-hidden="true" />
              ) : (
                <Search size={15} aria-hidden="true" />
              )}
              Check
            </button>
          </form>

          {error && (
            <p className="rounded-xl border border-verdict-contested/30 bg-verdict-contested/10 px-4 py-3 text-xs text-verdict-contested">
              {error}
            </p>
          )}

          {showTiles && (
            <ul className="space-y-2">
              {SOURCES.map((source, index) => {
                const check = result?.checks.find((c) => c.platform === source.id);
                const isRevealed = check !== undefined && index < revealed;

                return (
                  <li
                    key={source.id}
                    className={cn(
                      "relative flex items-center gap-3 overflow-hidden rounded-xl border px-4 py-3 transition-colors",
                      isRevealed
                        ? VERDICT_STYLES[check.verdict]
                        : "border-white/10 bg-white/5 text-muted"
                    )}
                  >
                    {!isRevealed && (
                      <span
                        aria-hidden="true"
                        className="animate-analysis-sweep pointer-events-none absolute inset-y-0 w-16 bg-gradient-to-r from-transparent via-white/25 to-transparent"
                      />
                    )}
                    <source.Icon size={15} className="relative shrink-0" />
                    <span className="relative min-w-0 flex-1">
                      <span className="block text-sm font-semibold">{source.label}</span>
                      <span className="block truncate text-xs opacity-80">
                        {isRevealed ? describe(check) : "checking…"}
                      </span>
                    </span>
                    {isRevealed && (
                      <span className="relative shrink-0 text-xs font-bold uppercase tracking-wide">
                        {VERDICT_LABELS[check.verdict]}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {result && revealed >= result.checks.length && (
            <div className="space-y-3 rounded-xl border border-dashed border-brand-cyan/30 bg-brand-blue/10 p-4">
              <p className="flex items-start gap-2 text-xs leading-relaxed text-muted">
                <Lock size={13} className="mt-0.5 shrink-0 text-brand-cyan" aria-hidden="true" />
                <span>
                  <span className="font-semibold text-foreground">
                    Three more sources are in the full report:
                  </span>{" "}
                  {result.withheld.join(", ")} — plus a scored verdict and a link
                  to the evidence behind every signal.
                </span>
              </p>
              <Link
                href={config.auth.loginUrl}
                className="btn-gradient w-full justify-center py-3 text-sm"
              >
                See the full report on {result.name}
                <ArrowRight size={15} aria-hidden="true" />
              </Link>
              <p className="text-center text-[11px] text-muted">
                {config.credits.signupGrant} free searches on signup · no card
              </p>
            </div>
          )}

          {!showTiles && !error && (
            <div className="space-y-3">
              <p className="text-xs leading-relaxed text-muted">
                Runs a real check against domain registries, the US trademark
                register and the App Store. Not a sample — these are live lookups.
              </p>
              <p className="text-xs text-muted">
                Nothing in mind?{" "}
                <button
                  type="button"
                  onClick={handleExample}
                  className="font-semibold text-brand-cyan underline underline-offset-2 hover:text-brand-blue"
                >
                  Try “{EXAMPLE_NAME}”
                </button>{" "}
                and watch it fail.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
