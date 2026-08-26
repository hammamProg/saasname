import { AlertTriangle, AtSign, Globe, MinusCircle, Scale, Search } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  AppleIcon,
  GithubIcon,
  GooglePlayIcon,
  LinkedinIcon,
  XIcon,
} from "@/components/icons/BrandIcons";
import { cn } from "@/libs/cn";
import VerdictBadge from "@/components/dashboard/VerdictBadge";
import type { Verdict } from "@/libs/scoring/verdict";

export type CheckRow = {
  platform: string;
  status: "pending" | "ok" | "failed" | "skipped";
  signals: Record<string, unknown>;
  verdict: Verdict | null;
  strength: number | null;
  evidence_url: string | null;
  error: string | null;
};

const PLATFORM_LABELS: Record<string, string> = {
  "app-store": "App Store",
  domains: "Domains",
  "web-serp": "Web search",
  "google-play": "Google Play",
  trademark: "US trademark",
  socials: "Social handles",
};

/** The mark a reader already associates with the source. A generic magnifier
 *  on all six rows made every source look like the same source. */
const PLATFORM_ICONS: Record<
  string,
  LucideIcon | ((props: { size?: number; className?: string }) => React.ReactElement)
> = {
  "app-store": AppleIcon,
  "google-play": GooglePlayIcon,
  domains: Globe,
  "web-serp": Search,
  trademark: Scale,
  socials: AtSign,
};

/** Rendered under best-effort platforms so their limits are stated where the
 *  result is read, not buried in a footnote. */
const PLATFORM_CAVEATS: Record<string, string> = {
  trademark: "US only, exact wordmark. Not legal advice.",
  socials: "Indicative only.",
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

  if (platform === "google-play") {
    return s.exactMatch
      ? [`"${String(s.topTitle)}" is already listed.`]
      : [`No app with this exact name (${Number(s.resultCount) || 0} results).`];
  }

  if (platform === "trademark") {
    const live = Number(s.liveMarks) || 0;
    const dead = Number(s.deadMarks) || 0;

    if (live === 0) {
      return dead > 0
        ? [`No live mark. ${dead} dead or cancelled ${dead === 1 ? "mark" : "marks"}.`]
        : ["No exact wordmark on file."];
    }

    const lines = [`${live} live ${live === 1 ? "mark" : "marks"} for this exact wordmark.`];
    if (s.liveInSoftwareClass) lines.push("At least one is in a software class.");
    else lines.push("None in a software class.");
    if (s.topOwner) lines.push(`e.g. ${String(s.topOwner)}`);
    return lines;
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

const SOCIAL_PLATFORMS = [
  { key: "github", name: "GitHub", Icon: GithubIcon },
  { key: "x", name: "X", Icon: XIcon },
  { key: "linkedin", name: "LinkedIn", Icon: LinkedinIcon },
] as const;

/** Handles render as rows rather than sentences, so each one carries the mark
 *  of the site it was actually checked on. */
function SocialRows({ signals }: { signals: Record<string, unknown> }) {
  const rows = SOCIAL_PLATFORMS.filter(
    (platform) => typeof signals[platform.key] === "string"
  );

  return (
    <ul className="mt-2 space-y-1">
      {rows.map((platform) => {
        const state = String(signals[platform.key]);

        return (
          <li key={platform.key} className="flex items-center gap-2 text-sm text-muted">
            <platform.Icon size={13} className="shrink-0" />
            <span>{platform.name}</span>
            <span
              className={cn(
                "font-medium",
                state === "available"
                  ? "text-verdict-clear"
                  : state === "taken"
                    ? "text-verdict-blocked"
                    : "text-verdict-unknown"
              )}
            >
              {state === "available"
                ? "free"
                : state === "taken"
                  ? "taken"
                  : "could not check"}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export default function CheckCard({ check }: { check: CheckRow }) {
  const label = PLATFORM_LABELS[check.platform] ?? check.platform;
  const Icon = PLATFORM_ICONS[check.platform] ?? Search;

  // failed and skipped are deliberately distinct from a successful check with
  // nothing to report. "We could not look" and "we looked and found nothing"
  // are different claims and must not look the same.
  if (check.status === "failed") {
    return (
      <div className="rounded-xl border border-verdict-blocked/25 bg-verdict-blocked/5 p-4">
        <p className="flex items-center gap-2 text-sm font-semibold text-verdict-blocked">
          <Icon size={15} className="shrink-0" />
          {label} — check failed
          <AlertTriangle size={14} aria-hidden="true" className="shrink-0" />
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
          <Icon size={15} className="shrink-0" />
          {label} — {check.status === "pending" ? "not run yet" : "skipped"}
          <MinusCircle size={14} aria-hidden="true" className="shrink-0" />
        </p>
        <p className="mt-1 text-xs text-muted">No result for this platform.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <Icon size={15} className="shrink-0 text-muted" />
          {label}
        </p>
        {check.verdict && <VerdictBadge verdict={check.verdict} size="sm" />}
      </div>
      {check.platform === "socials" ? (
        <SocialRows signals={check.signals} />
      ) : (
        <ul className="mt-2 space-y-1">
          {describe(check.platform, check.signals).map((line) => (
            <li key={line} className="text-sm text-muted">
              {line}
            </li>
          ))}
        </ul>
      )}
      {PLATFORM_CAVEATS[check.platform] && (
        <p className="mt-2 text-xs italic text-muted">
          {PLATFORM_CAVEATS[check.platform]}
        </p>
      )}
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
