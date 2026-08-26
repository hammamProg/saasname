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

function PlatformChecklist({
  selected,
  onToggle,
}: {
  selected: Set<PlatformChoice>;
  onToggle: (id: PlatformChoice) => void;
}) {
  return (
    <fieldset className="space-y-1.5">
      <legend className="text-sm font-semibold">Where will it live?</legend>
      <div className="flex flex-wrap gap-2 pt-1">
        {PLATFORM_CHOICES.map((choice) => {
          const checked = selected.has(choice.id);

          return (
            <label
              key={choice.id}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-medium transition-colors",
                checked
                  ? "border-primary/40 bg-primary-soft text-primary"
                  : "border-border bg-surface text-muted hover:text-foreground"
              )}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={checked}
                onChange={() => onToggle(choice.id)}
              />
              <span
                aria-hidden="true"
                className={cn(
                  "flex h-4 w-4 items-center justify-center rounded border transition-colors",
                  checked ? "border-primary bg-primary text-white" : "border-border bg-card"
                )}
              >
                {checked && <Check size={11} strokeWidth={3.5} />}
              </span>
              <choice.Icon size={15} className="shrink-0" />
              {choice.label}
            </label>
          );
        })}
      </div>
      <p className="text-xs text-muted">
        {selected.size === 0
          ? "Pick at least one — it decides how much each source counts."
          : selected.size > 1
            ? "Multiple surfaces: every source is weighted evenly."
            : "Sources are weighted for this surface."}
      </p>
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
      const { searchId } = await apiClient.post<{ searchId: string }>(
        "/searches",
        payload
      );

      router.push(`/dashboard/searches/${searchId}`);
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

  return (
    <section className="space-y-6">
      <div className="card overflow-hidden">
        <div
          role="tablist"
          aria-label="How to start"
          className="flex gap-1 border-b border-border bg-surface/60 p-1.5"
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
              onClick={() => switchMode(tab.id)}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors",
                mode === tab.id
                  ? "bg-card text-primary shadow-sm"
                  : "text-muted hover:text-foreground"
              )}
            >
              <tab.icon size={15} aria-hidden="true" />
              {tab.label}
            </button>
          ))}
        </div>

        {mode === "generate" ? (
          <form onSubmit={handleGenerate} className="space-y-4 p-6">
            <div className="space-y-1.5">
              <label htmlFor="idea" className="text-sm font-semibold">
                Describe your idea
              </label>
              <textarea
                id="idea"
                value={idea}
                onChange={(event) => setIdea(event.target.value)}
                maxLength={IDEA_MAX_LENGTH}
                rows={3}
                placeholder="A tool that checks whether a SaaS name is actually free to use."
                className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm transition-colors focus:border-primary/40 focus:outline-none"
              />
              <p className="text-xs text-muted">
                {idea.trim().length}/{IDEA_MAX_LENGTH}
                {tooShort && idea.length > 0 && (
                  <span className="ml-2">
                    · at least {IDEA_MIN_LENGTH} characters
                  </span>
                )}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
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
                  className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm transition-colors focus:border-primary/40 focus:outline-none"
                />
              </div>

              <PlatformChecklist selected={platforms} onToggle={togglePlatform} />
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="submit"
                disabled={loading || tooShort || noPlatform}
                className="btn-primary rounded-xl px-5 py-2.5 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                ) : (
                  <Sparkles size={16} aria-hidden="true" />
                )}
                {loading ? "Generating…" : "Generate names"}
              </button>
              <p className="text-xs text-muted">
                Generating is free. You spend credits only when you check.
              </p>
            </div>
          </form>
        ) : (
          <form onSubmit={handleCheckDirect} className="space-y-4 p-6">
            <div className="space-y-1.5">
              <label htmlFor="directNames" className="text-sm font-semibold">
                Names to check
              </label>
              <textarea
                id="directNames"
                value={directNames}
                onChange={(event) => setDirectNames(event.target.value)}
                rows={3}
                placeholder="Ledgerloop, Tallyhaus, Notchbook"
                className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm transition-colors focus:border-primary/40 focus:outline-none"
              />
              <p className="text-xs text-muted">
                Separate with commas or spaces. Up to {MAX_NAMES} at a time.
                {parsedNames.length > 0 && (
                  <span className={cn("ml-2", tooManyNames && "text-verdict-blocked")}>
                    · {parsedNames.length} entered
                  </span>
                )}
              </p>
            </div>

            <PlatformChecklist selected={platforms} onToggle={togglePlatform} />

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="submit"
                disabled={
                  checking ||
                  parsedNames.length === 0 ||
                  tooManyNames ||
                  nameTooLong ||
                  noPlatform ||
                  parsedNames.length > balance
                }
                className="btn-primary rounded-xl px-5 py-2.5 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-60"
              >
                {checking ? (
                  <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                ) : (
                  <ShieldCheck size={16} aria-hidden="true" />
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
            </div>
          </form>
        )}
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-verdict-blocked/30 bg-verdict-blocked/10 px-4 py-3 text-sm text-verdict-blocked"
        >
          {error}
        </p>
      )}

      {mode === "generate" && candidates && candidates.length > 0 && (
        <>
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
              disabled={checking || selected.size === 0 || selected.size > balance}
              className="btn-primary rounded-xl px-5 py-2.5 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-60"
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
        </>
      )}
    </section>
  );
}
