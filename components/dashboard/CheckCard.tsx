import { AlertTriangle, MinusCircle, Search } from "lucide-react";
import { cn } from "@/libs/cn";

export type CheckRow = {
  platform: string;
  status: "pending" | "ok" | "failed" | "skipped";
  signals: Record<string, unknown>;
  evidence_url: string | null;
  error: string | null;
};

const PLATFORM_LABELS: Record<string, string> = {
  "app-store": "App Store",
  domains: "Domains",
  "web-serp": "Web search",
};

function daysSince(iso: unknown): number | null {
  if (typeof iso !== "string") return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  return Math.floor((Date.now() - then) / (1000 * 60 * 60 * 24));
}

/** Plain-language lines for a successful check.
 *  These are observations, never judgements — no verdict exists until Phase 4. */
function describe(platform: string, s: Record<string, unknown>): string[] {
  if (platform === "app-store") {
    if (!s.exactMatch) {
      return [`No app with this exact name (${Number(s.resultCount) || 0} similar results).`];
    }
    const age = daysSince(s.topLastUpdated);
    const lines = [
      `"${String(s.topTrackName)}" by ${String(s.topSeller)}.`,
      `${Number(s.topRatingCount).toLocaleString()} ratings, ${Number(s.topRatingAverage).toFixed(1)} average.`,
    ];
    if (age !== null) {
      lines.push(
        age > 730
          ? `Last updated ${Math.floor(age / 365)} years ago.`
          : `Last updated ${age} days ago.`
      );
    }
    return lines;
  }

  if (platform === "domains") {
    const tlds = ["com", "io", "ai", "dev", "app"];
    return tlds
      .filter((t) => typeof s[t] === "string")
      .map((t) => {
        const state = String(s[t]);
        const label = state === "available" ? "available" : state === "taken" ? "taken" : "could not check";
        return `.${t} — ${label}`;
      });
  }

  if (platform === "web-serp") {
    const lines = [`${Number(s.resultCount) || 0} results for the exact phrase.`];
    if (s.hasExactDomain) lines.push("The exact-name domain is already live.");
    if (Number(s.exactTitleMatches) > 0) {
      lines.push(`${Number(s.exactTitleMatches)} page titled exactly this name.`);
    }
    return lines;
  }

  return Object.entries(s).map(([k, v]) => `${k}: ${String(v)}`);
}

export default function CheckCard({ check }: { check: CheckRow }) {
  const label = PLATFORM_LABELS[check.platform] ?? check.platform;

  // failed and skipped are deliberately distinct from a successful check with
  // nothing to report. "We could not look" and "we looked and found nothing"
  // are different claims and must not look the same.
  if (check.status === "failed") {
    return (
      <div className="rounded-xl border border-verdict-blocked/25 bg-verdict-blocked/5 p-4">
        <p className="flex items-center gap-2 text-sm font-semibold text-verdict-blocked">
          <AlertTriangle size={15} aria-hidden="true" />
          {label} — check failed
        </p>
        <p className="mt-1 text-xs text-muted">
          This was not checked, so nothing here says the name is free.
          {check.error ? ` (${check.error})` : ""}
        </p>
      </div>
    );
  }

  if (check.status === "skipped" || check.status === "pending") {
    return (
      <div className="rounded-xl border border-border bg-surface p-4">
        <p className="flex items-center gap-2 text-sm font-semibold text-verdict-unknown">
          <MinusCircle size={15} aria-hidden="true" />
          {label} — {check.status === "pending" ? "not run yet" : "skipped"}
        </p>
        <p className="mt-1 text-xs text-muted">No result for this platform.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <Search size={15} className="text-muted" aria-hidden="true" />
        {label}
      </p>
      <ul className="mt-2 space-y-1">
        {describe(check.platform, check.signals).map((line) => (
          <li key={line} className="text-sm text-muted">
            {line}
          </li>
        ))}
      </ul>
      {check.evidence_url && (
        <a
          href={check.evidence_url}
          target="_blank"
          rel="noopener noreferrer"
          className={cn("mt-2 inline-block text-xs font-semibold text-primary hover:underline")}
        >
          See the evidence →
        </a>
      )}
    </div>
  );
}
