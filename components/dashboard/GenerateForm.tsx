"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldCheck, Sparkles } from "lucide-react";
import apiClient, { ApiError } from "@/libs/api";
import {
  TARGET_PLATFORMS,
  type GeneratedCandidate,
  type TargetPlatform,
} from "@/libs/names/generate";
import CandidateList from "@/components/dashboard/CandidateList";

const PLATFORM_LABELS: Record<TargetPlatform, string> = {
  ios: "iOS",
  android: "Android",
  web: "Web",
  cross: "Web + mobile",
};

const IDEA_MIN_LENGTH = 10;
const IDEA_MAX_LENGTH = 500;
const SEED_MAX_LENGTH = 50;

export default function GenerateForm() {
  const router = useRouter();
  const [idea, setIdea] = useState("");
  const [seedName, setSeedName] = useState("");
  const [targetPlatform, setTargetPlatform] = useState<TargetPlatform>("web");
  const [candidates, setCandidates] = useState<GeneratedCandidate[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const tooShort = idea.trim().length < IDEA_MIN_LENGTH;

  async function handleSubmit(event: React.FormEvent) {
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

  async function handleCheck() {
    if (!candidates) return;

    setChecking(true);
    setError(null);

    try {
      const { searchId } = await apiClient.post<{ searchId: string }>("/searches", {
        mode: "generate",
        ideaText: idea.trim(),
        seedName: seedName.trim() || undefined,
        targetPlatform,
        candidates: candidates
          .filter((c) => selected.has(c.normalizedName))
          .map((c) => ({ name: c.name, rationale: c.rationale })),
      });

      router.push(`/dashboard/searches/${searchId}`);
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
      setChecking(false);
    }
  }

  return (
    <section className="space-y-6">
      <form onSubmit={handleSubmit} className="card space-y-4 p-6">
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
            className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm"
          />
          <p className="text-xs text-muted">
            {idea.trim().length}/{IDEA_MAX_LENGTH}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="seedName" className="text-sm font-semibold">
              A name you already like <span className="text-muted">(optional)</span>
            </label>
            <input
              id="seedName"
              value={seedName}
              onChange={(event) => setSeedName(event.target.value)}
              maxLength={SEED_MAX_LENGTH}
              className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="platform" className="text-sm font-semibold">
              Target platform
            </label>
            <select
              id="platform"
              value={targetPlatform}
              onChange={(event) =>
                setTargetPlatform(event.target.value as TargetPlatform)
              }
              className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm"
            >
              {TARGET_PLATFORMS.map((platform) => (
                <option key={platform} value={platform}>
                  {PLATFORM_LABELS[platform]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || tooShort}
          className="btn-primary flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <Loader2 size={16} className="animate-spin" aria-hidden="true" />
          ) : (
            <Sparkles size={16} aria-hidden="true" />
          )}
          {loading ? "Generating…" : "Generate names"}
        </button>
      </form>

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-verdict-blocked/30 bg-verdict-blocked/10 px-4 py-3 text-sm text-verdict-blocked"
        >
          {error}
        </p>
      )}

      {candidates && candidates.length > 0 && (
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
              onClick={handleCheck}
              disabled={checking || selected.size === 0}
              className="btn-primary flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-60"
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
            <p className="text-xs text-muted">
              Costs 1 credit per name. Refunded if a check cannot be completed.
            </p>
          </div>
        </>
      )}
    </section>
  );
}
