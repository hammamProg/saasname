"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
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
  const [isPending, startTransition] = useTransition();

  function toggleFollow() {
    const next = !isFollowed;
    setIsFollowed(next);
    startTransition(async () => {
      await fetch(`/api/trends/${trend.id}/follow`, { method: next ? "POST" : "DELETE" });
    });
  }

  function hide() {
    setIsHidden(true);
    startTransition(async () => {
      await fetch(`/api/trends/${trend.id}/hide`, { method: "POST" });
    });
  }

  if (isHidden) return null;

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
    </div>
  );
}
