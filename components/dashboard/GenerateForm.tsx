"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Check,
  Globe,
  Loader2,
  Search,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { AndroidIcon, AppleIcon } from "@/components/icons/BrandIcons";
import apiClient, { ApiError } from "@/libs/api";
import {
  type GeneratedCandidate,
  type TargetPlatform,
} from "@/libs/names/generate";
import CandidateList from "@/components/dashboard/CandidateList";
import SearchProgress from "@/components/dashboard/SearchProgress";
import NamingAnimation from "@/components/dashboard/NamingAnimation";
import StepHeader from "@/components/dashboard/RunStepper";
import { cn } from "@/libs/cn";

/** The surfaces a user picks from. `cross` is not offered directly -- it is
 *  what any multi-surface selection resolves to. */
const PLATFORM_CHOICES = [
  { id: "web", label: "Web", Icon: Globe },
  { id: "ios", label: "iOS", Icon: AppleIcon },
  { id: "android", label: "Android", Icon: AndroidIcon },
] as const;

type PlatformChoice = (typeof PLATFORM_CHOICES)[number]["id"];

/** Maps the checklist onto the single enum the API and the scoring weights
 *  speak. One surface keeps that surface's weighting; two or more resolve to
 *  `cross`, the balanced profile. Picking iOS + Android and getting `cross`
 *  counts web signals a little more heavily than strictly necessary -- it errs
 *  toward more evidence, never toward a false "clear". */
function resolveTargetPlatform(selected: Set<PlatformChoice>): TargetPlatform {
  if (selected.size === 1) {
    return [...selected][0] as TargetPlatform;
  }
  return "cross";
}

const IDEA_MIN_LENGTH = 10;
const IDEA_MAX_LENGTH = 500;
const SEED_MAX_LENGTH = 50;
const NAME_MAX_LENGTH = 30;
/** Mirrors MAX_CANDIDATES in libs/searches/create.ts. The API rejects more;
 *  this stops the user discovering that only after spending the click. */
const MAX_NAMES = 8;

type Mode = "generate" | "check";

/** Splits the direct-check input on commas or whitespace and de-duplicates,
 *  so "Ledgerloop, Tallyhaus" and "Ledgerloop Tallyhaus" both work. */
function parseNames(raw: string): string[] {
  const parts = raw
    .split(/[,\n]+/)
    .flatMap((part) => part.trim().split(/\s+/))
    .map((part) => part.trim())
    .filter(Boolean);

  return [...new Set(parts)];
}

/**
 * A real checkbox group, without a real `<input type="checkbox">`.
 *
 * The input was previously hidden with `sr-only`, which clips to a 1px box.
 * Safari renders form controls at their intrinsic size regardless of that
 * clip, so every chip drew the native macOS checkbox next to the styled one.
 * `role="checkbox"` on a button is announced identically and has no native
 * chrome to leak, so there is nothing left to hide.
 */
function PlatformChecklist({
  selected,
  onToggle,
}: {
  selected: Set<PlatformChoice>;
  onToggle: (id: PlatformChoice) => void;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="mb-2 text-sm font-semibold">Where will it live?</legend>

      <div className="grid gap-2 sm:grid-cols-3" role="group">
        {PLATFORM_CHOICES.map((choice) => {
          const checked = selected.has(choice.id);

          return (
            <button
              key={choice.id}
              type="button"
              role="checkbox"
              aria-checked={checked}
              onClick={() => onToggle(choice.id)}
              className={cn(
                "flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-semibold transition-all",
                checked
                  ? "border-primary/50 bg-primary-soft text-primary shadow-sm"
                  : "border-border bg-surface text-muted hover:border-primary/25 hover:text-foreground"
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-md border transition-colors",
                  checked
                    ? "border-primary bg-primary text-white"
                    : "border-border bg-card"
                )}
              >
                {checked && <Check size={12} strokeWidth={3.5} />}
              </span>
              <choice.Icon size={16} className="shrink-0" />
              <span>{choice.label}</span>
            </button>
          );
        })}
      </div>

      {selected.size === 0 && (
        <p className="text-xs font-medium text-verdict-blocked">
          Pick at least one — it decides how much each source counts.
        </p>
      )}
    </fieldset>
  );
}

/** What this run will cost against what is left. Previously the only signal
 *  was a 402 on submit that bounced the user to the credits page, which is a
 *  poor way to learn you cannot afford something you already committed to. */
function CostLine({ cost, balance }: { cost: number; balance: number }) {
  const short = cost > balance;

  if (short) {
    return (
      <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs font-medium text-verdict-blocked">
        <TriangleAlert size={13} aria-hidden="true" className="shrink-0" />
        {cost} {cost === 1 ? "credit" : "credits"} needed, you have {balance}.
        <Link href="/dashboard/credits" className="font-bold underline">
          Top up
        </Link>
      </p>
    );
  }

  return (
    <p className="text-xs text-muted">
      {cost} {cost === 1 ? "credit" : "credits"} · {balance - cost} left
      afterwards. Refunded if a check cannot be completed.
    </p>
  );
}

export default function GenerateForm({
  balance,
  initialMode = "generate",
}: {
  balance: number;
  /** Lets the dashboard link straight into the mode the user asked for. */
  initialMode?: Mode;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [idea, setIdea] = useState("");
  const [seedName, setSeedName] = useState("");
  const [directNames, setDirectNames] = useState("");
  const [platforms, setPlatforms] = useState<Set<PlatformChoice>>(
    () => new Set<PlatformChoice>(["web"])
  );
  const [candidates, setCandidates] = useState<GeneratedCandidate[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [run, setRun] = useState<{
    searchId: string;
    total: number;
    candidates: Array<{ id: string; name: string }>;
  } | null>(null);
  const [finished, setFinished] = useState(false);

  const targetPlatform = resolveTargetPlatform(platforms);
  const noPlatform = platforms.size === 0;
  const tooShort = idea.trim().length < IDEA_MIN_LENGTH;
  const parsedNames = parseNames(directNames);
  const tooManyNames = parsedNames.length > MAX_NAMES;
  const nameTooLong = parsedNames.some((name) => name.length > NAME_MAX_LENGTH);

  function togglePlatform(id: PlatformChoice) {
    setPlatforms((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function switchMode(next: Mode) {
    if (next === mode) return;
    // Candidates belong to the mode that produced them; carrying them across
    // would offer a "check" button for names the visible form no longer shows.
    setMode(next);
    setCandidates(null);
    setSelected(new Set());
    setError(null);
  }

  async function handleGenerate(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    // Clear the previous run so a failure cannot leave stale names on screen
    // looking like the result of the request that just failed.
    setCandidates(null);
    setSelected(new Set());

    try {
      const { candidates: next } = await apiClient.post<{
        candidates: GeneratedCandidate[];
      }>("/generate", {
        idea: idea.trim(),
        seedName: seedName.trim() || undefined,
        targetPlatform,
      });

      setCandidates(next);
      setSelected(new Set(next.map((c) => c.normalizedName)));
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Could not generate names right now. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  /** Both paths end in the same POST; only where the names came from differs. */
  async function startSearch(
    payload: Record<string, unknown>,
    onFailure: () => void
  ) {
    setChecking(true);
    setError(null);

    try {
      const started = await apiClient.post<{
        searchId: string;
        total: number;
        candidates: Array<{ id: string; name: string }>;
      }>("/searches", payload);

      setRun(started);
      // The balance lives in the dashboard layout, and a layout does not
      // re-render on nested navigation -- without this the top bar would keep
      // showing the pre-spend number.
      router.refresh();
    } catch (caught) {
      // 402 means out of credits, which has a specific next step.
      if (caught instanceof ApiError && caught.status === 402) {
        router.push("/dashboard/credits");
        return;
      }
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Could not check these names right now. Please try again."
      );
      onFailure();
    }
  }

  async function handleCheckGenerated() {
    if (!candidates) return;

    await startSearch(
      {
        mode: "generate",
        ideaText: idea.trim(),
        seedName: seedName.trim() || undefined,
        targetPlatform,
        candidates: candidates
          .filter((c) => selected.has(c.normalizedName))
          .map((c) => ({ name: c.name, rationale: c.rationale })),
      },
      () => setChecking(false)
    );
  }

  async function handleCheckDirect(event: React.FormEvent) {
    event.preventDefault();

    await startSearch(
      {
        mode: "check",
        targetPlatform,
        candidates: parsedNames.map((name) => ({ name })),
      },
      () => setChecking(false)
    );
  }

  const busy = loading || checking || run !== null;
  const canGenerate = !loading && !tooShort && !noPlatform;
  const canCheckDirect =
    !checking &&
    parsedNames.length > 0 &&
    !tooManyNames &&
    !nameTooLong &&
    !noPlatform &&
    parsedNames.length <= balance;
  const canCheckSelected =
    !checking && selected.size > 0 && selected.size <= balance;
  const showShortlist =
    mode === "generate" && !run && !loading && !!candidates && candidates.length > 0;

  return (
    <section className="space-y-6">
      {run ? (
        <>
          <SearchProgress
            searchId={run.searchId}
            total={run.total}
            initialDone={0}
            candidates={run.candidates}
            onComplete={() => {
              // Let the stepper land on its final state before the report
              // replaces the page; otherwise the last step never renders.
              setFinished(true);
              window.setTimeout(
                () => router.push(`/dashboard/searches/${run.searchId}`),
                900
              );
            }}
          />
          <p className="text-center text-xs text-muted">
            {finished
              ? "Done — opening your report…"
              : "Your report opens automatically when every source has answered."}
          </p>
        </>
      ) : showShortlist ? null : (
      <form
        onSubmit={mode === "generate" ? handleGenerate : handleCheckDirect}
        className="space-y-6"
      >
      <div className="card overflow-hidden">
        <div
          hidden={loading}
          role="tablist"
          aria-label="How to start"
          className="m-4 flex gap-1 rounded-xl border border-border bg-surface p-1"
        >
          {(
            [
              { id: "generate", label: "Describe an idea", icon: Sparkles },
              { id: "check", label: "Check a name I have", icon: Search },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={mode === tab.id}
              disabled={busy}
              onClick={() => switchMode(tab.id)}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all",
                mode === tab.id
                  ? "bg-card text-primary shadow-sm ring-1 ring-primary/15"
                  : "text-muted hover:bg-card/50 hover:text-foreground"
              )}
            >
              <tab.icon size={15} aria-hidden="true" />
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-5 px-6 pb-6 pt-2">
            <StepHeader step="generating" mode="generate" />
            <NamingAnimation />
          </div>
        ) : mode === "generate" ? (
          <div className="space-y-5 px-6 pb-6 pt-2">
            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between gap-3">
                <label htmlFor="idea" className="text-sm font-semibold">
                  Describe your idea
                </label>
                <span className="text-xs tabular-nums text-muted">
                  {tooShort && idea.length > 0
                    ? `${IDEA_MIN_LENGTH - idea.trim().length} more characters`
                    : `${idea.trim().length}/${IDEA_MAX_LENGTH}`}
                </span>
              </div>
              <textarea
                id="idea"
                value={idea}
                onChange={(event) => setIdea(event.target.value)}
                maxLength={IDEA_MAX_LENGTH}
                rows={3}
                placeholder="A tool that checks whether a SaaS name is actually free to use."
                className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm leading-relaxed transition-colors focus:border-primary/40 focus:outline-none focus:ring-4 focus:ring-primary-soft"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="seedName" className="text-sm font-semibold">
                A name you already like{" "}
                <span className="font-normal text-muted">(optional)</span>
              </label>
              <input
                id="seedName"
                value={seedName}
                onChange={(event) => setSeedName(event.target.value)}
                maxLength={SEED_MAX_LENGTH}
                placeholder="Ledgerloop"
                className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm transition-colors focus:border-primary/40 focus:outline-none focus:ring-4 focus:ring-primary-soft"
              />
            </div>

            <PlatformChecklist selected={platforms} onToggle={togglePlatform} />

          </div>
        ) : (
          <div className="space-y-5 px-6 pb-6 pt-2">
            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between gap-3">
                <label htmlFor="directNames" className="text-sm font-semibold">
                  Names to check
                </label>
                <span
                  className={cn(
                    "text-xs tabular-nums",
                    tooManyNames ? "font-semibold text-verdict-blocked" : "text-muted"
                  )}
                >
                  {parsedNames.length}/{MAX_NAMES}
                </span>
              </div>
              <textarea
                id="directNames"
                value={directNames}
                onChange={(event) => setDirectNames(event.target.value)}
                rows={3}
                placeholder="Ledgerloop, Tallyhaus, Notchbook — commas or spaces"
                className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm leading-relaxed transition-colors focus:border-primary/40 focus:outline-none focus:ring-4 focus:ring-primary-soft"
              />

            </div>

            <PlatformChecklist selected={platforms} onToggle={togglePlatform} />

          </div>
        )}
      </div>

      <div className="flex flex-col items-center gap-2.5">
        {mode === "generate" ? (
          <>
            <button
              type="submit"
              disabled={!canGenerate}
              className={cn(
                "rounded-xl px-10 py-4 text-base font-bold transition-all",
                // The gradient is reserved for "this is ready to press". A
                // permanently loud button teaches nothing; one that changes at
                // the moment the form becomes valid does.
                canGenerate ? "btn-gradient animate-ready-pop" : "btn-primary"
              )}
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" aria-hidden="true" />
              ) : (
                <Sparkles size={18} aria-hidden="true" />
              )}
              {loading ? "Generating…" : "Generate names"}
            </button>
            <p className="text-xs text-muted">Free — credits are spent at the check.</p>
          </>
        ) : (
          <>
            <button
              type="submit"
              disabled={!canCheckDirect}
              className={cn(
                "rounded-xl px-10 py-4 text-base font-bold transition-all",
                canCheckDirect ? "btn-gradient animate-ready-pop" : "btn-primary"
              )}
            >
              {checking ? (
                <Loader2 size={18} className="animate-spin" aria-hidden="true" />
              ) : (
                <ShieldCheck size={18} aria-hidden="true" />
              )}
              {checking
                ? "Checking…"
                : parsedNames.length > 0
                  ? `Check ${parsedNames.length} ${parsedNames.length === 1 ? "name" : "names"}`
                  : "Check names"}
            </button>
            {tooManyNames ? (
              <p className="text-xs text-verdict-blocked">
                Check at most {MAX_NAMES} names at once.
              </p>
            ) : nameTooLong ? (
              <p className="text-xs text-verdict-blocked">
                Each name must be {NAME_MAX_LENGTH} characters or fewer.
              </p>
            ) : parsedNames.length > 0 ? (
              <CostLine cost={parsedNames.length} balance={balance} />
            ) : (
              <p className="text-xs text-muted">
                1 credit per name. You have {balance}.
              </p>
            )}
          </>
        )}
      </div>
      </form>
      )}

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-verdict-blocked/30 bg-verdict-blocked/10 px-4 py-3 text-sm text-verdict-blocked"
        >
          {error}
        </p>
      )}

      {mode === "generate" && !run && candidates && candidates.length > 0 && (
        <div className="card space-y-5 p-6">
          <StepHeader step="select" mode="generate" />

          <CandidateList
            candidates={candidates}
            selected={selected}
            onToggle={(normalizedName) =>
              setSelected((prev) => {
                const next = new Set(prev);
                if (next.has(normalizedName)) next.delete(normalizedName);
                else next.add(normalizedName);
                return next;
              })
            }
          />

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleCheckGenerated}
              disabled={!canCheckSelected}
              className={cn(
                "rounded-xl px-5 py-2.5 text-sm font-bold transition-all",
                canCheckSelected ? "btn-gradient" : "btn-primary"
              )}
            >
              {checking ? (
                <Loader2 size={16} className="animate-spin" aria-hidden="true" />
              ) : (
                <ShieldCheck size={16} aria-hidden="true" />
              )}
              {checking
                ? "Checking…"
                : `Check ${selected.size} ${selected.size === 1 ? "name" : "names"}`}
            </button>
            <CostLine cost={selected.size} balance={balance} />
          </div>
        </div>
      )}
    </section>
  );
}
