"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Lock } from "lucide-react";
import type { TrendCardData } from "@/libs/trends/feed";

const STAGE_LABELS: Record<string, string> = {
  early_signal: "Early signal",
  emerging: "Emerging",
  accelerating: "Accelerating",
  established: "Established",
  cooling: "Cooling",
};

export default function TrendCard({ trend }: { trend: TrendCardData }) {
  const [isFollowed, setIsFollowed] = useState(trend.isFollowed);
  const [isHidden, setIsHidden] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggleFollow() {
    const next = !isFollowed;
    // Optimistic, but reverted below if the write is refused — a follow that
    // silently didn't happen is worse than a slower button.
    setIsFollowed(next);
    setError(null);

    startTransition(async () => {
      try {
        const response = await fetch(`/api/trends/${trend.id}/follow`, {
          method: next ? "POST" : "DELETE",
        });

        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as {
            error?: string;
          };
          setIsFollowed(!next);
          setError(body.error ?? "Could not save that. Try again.");
        }
      } catch {
        setIsFollowed(!next);
        setError("Could not save that. Try again.");
      }
    });
  }

  function hide() {
    setIsHidden(true);
    startTransition(async () => {
      await fetch(`/api/trends/${trend.id}/hide`, { method: "POST" });
    });
  }

  if (isHidden) return null;

  // Locked cards arrive already redacted from the server — the blur is
  // presentation only, never the access control.
  if (trend.isLocked) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-primary/25 bg-card p-6">
        <div aria-hidden className="select-none blur-sm">
          <p className="text-lg font-bold">{trend.name}</p>
          <p className="mt-1 text-sm text-muted">{trend.description}</p>
          <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted">
            <span>Trend score {Math.round(trend.trendScore)}</span>
            <span>
              {trend.sourceCount} {trend.sourceCount === 1 ? "source" : "sources"}
            </span>
          </div>
        </div>

        <div className="mt-5 flex flex-col items-start gap-3 border-t border-border pt-5">
          <span className="inline-flex items-center gap-2 text-sm font-bold">
            <Lock size={15} className="shrink-0 text-primary" aria-hidden />
            One of the strongest trends right now
          </span>
          <p className="text-xs leading-relaxed text-muted">
            {trend.categoryName
              ? `A high-scoring opportunity in ${trend.categoryName}.`
              : "A high-scoring opportunity in your categories."}{" "}
            Pro unlocks the trend, the evidence, and why it&apos;s moving.
          </p>
          <Link
            href="/dashboard/billing"
            className="btn-gradient px-5 py-2.5 text-xs"
          >
            Unlock with Pro
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href={`/dashboard/trends/${trend.slug}`} className="text-lg font-bold hover:underline">
            {trend.name}
          </Link>
          {trend.description && <p className="mt-1 text-sm text-muted">{trend.description}</p>}
        </div>
        <span className="shrink-0 rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary">
          {STAGE_LABELS[trend.stage] ?? trend.stage}
        </span>
      </div>

      {trend.categoryName && (
        <span className="mt-2 inline-block text-xs font-semibold uppercase tracking-wide text-muted">
          {trend.categoryName}
        </span>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted">
        <span>Trend score {Math.round(trend.trendScore)}</span>
        <span>Confidence {Math.round(trend.confidenceScore)}</span>
        <span>Momentum {Math.round(trend.momentum)}</span>
        <span>
          {trend.sourceCount} {trend.sourceCount === 1 ? "source" : "sources"}
        </span>
      </div>

      <p className="mt-2 text-xs text-muted">{trend.whyRecommended}</p>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          disabled={isPending}
          onClick={toggleFollow}
          className={
            isFollowed
              ? "rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white"
              : "rounded-lg border border-border px-4 py-2 text-xs font-bold"
          }
        >
          {isFollowed ? "Following" : "Follow"}
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={hide}
          className="rounded-lg px-4 py-2 text-xs font-semibold text-muted"
        >
          Hide
        </button>
      </div>

      {error && <p className="mt-3 text-xs text-red-600">{error}</p>}
    </div>
  );
}
