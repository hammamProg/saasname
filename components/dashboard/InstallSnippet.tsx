"use client";

import { useEffect, useRef, useState } from "react";
import type { SnippetVariant } from "@/libs/webstats/snippet";

/** Install snippet with framework tabs, copy-to-clipboard, and a live check
 *  for the first incoming event.
 *
 *  The polling half matters more than it looks: without it the user pastes a
 *  script, sees an empty dashboard, and cannot tell an install mistake from a
 *  site with no traffic yet. */
export default function InstallSnippet({
  siteId,
  variants,
  initiallyInstalled,
  embedded = false,
}: {
  siteId: string;
  variants: SnippetVariant[];
  initiallyInstalled: boolean;
  /** Rendered inside the options dialog, which already supplies a heading and
   *  a surface. Repeating both gives "Install · domain" above a second
   *  "Install", and a card border inside a card. */
  embedded?: boolean;
}) {
  const [active, setActive] = useState(variants[0]?.id);
  const [copied, setCopied] = useState(false);
  const [installed, setInstalled] = useState(initiallyInstalled);
  const [givenUp, setGivenUp] = useState(false);
  /* Completed checks. Drives the visible count and re-keys the sweep ring, so
     one revolution is one real request rather than a decorative loop. Kept out
     of the effect's dependencies on purpose — it must not restart the timer. */
  const [checks, setChecks] = useState(0);
  const attemptsRef = useRef(0);

  const variant = variants.find((v) => v.id === active) ?? variants[0];

  useEffect(() => {
    if (installed || givenUp) return;

    let cancelled = false;

    async function poll() {
      // Polling a background tab is pure waste: nobody is watching, and the
      // check costs a database round trip each time.
      if (document.visibilityState !== "visible") return;

      attemptsRef.current += 1;

      // Someone who pastes the snippet sees the flip within seconds. Someone
      // who leaves this tab open for an hour should not still be polling —
      // they can reload. Fifteen minutes at two seconds.
      if (attemptsRef.current > 450) {
        setGivenUp(true);
        return;
      }

      if (!cancelled) setChecks((n) => n + 1);

      try {
        const response = await fetch(`/api/webstats/sites/${siteId}/status`, {
          cache: "no-store",
        });
        if (!response.ok) return;

        const body = (await response.json()) as { installed?: boolean };
        if (!cancelled && body.installed) setInstalled(true);
      } catch {
        // A failed poll is not worth surfacing; the next one will retry.
      }
    }

    // Fire the first check immediately instead of waiting out the interval —
    // someone who just pasted the snippet and reloaded their site often
    // already has an event sitting in the database by the time this effect
    // runs, and a 5s wait before even asking makes a genuinely fast pipeline
    // feel slow.
    poll();
    const timer = setInterval(poll, 2000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [siteId, installed, givenUp]);

  async function copy() {
    if (!variant) return;

    try {
      await navigator.clipboard.writeText(variant.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard is permission-gated; the code is on screen to select.
    }
  }

  if (!variant) return null;

  return (
    <div
      className={
        embedded
          ? "space-y-4"
          : "space-y-4 rounded-2xl border border-border bg-card p-6"
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        {embedded ? (
          <span className="sr-only">Install status</span>
        ) : (
          <h2 className="section-heading text-lg font-extrabold">Install</h2>
        )}

        {installed ? (
          <span className="animate-popup inline-flex items-center gap-2 rounded-full bg-success-soft px-3 py-1.5 text-xs font-semibold text-success">
            <svg viewBox="0 0 24 24" className="size-3.5" aria-hidden="true">
              <path
                d="M4 12.5l5.2 5.2L20 7"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Receiving data
          </span>
        ) : givenUp ? (
          <span className="inline-flex items-center gap-2 rounded-full bg-surface px-3 py-1.5 text-xs font-semibold text-muted">
            <span className="size-1.5 rounded-full bg-muted" aria-hidden="true" />
            Paused — reload to keep checking
          </span>
        ) : (
          <span
            className="inline-flex items-center gap-2 rounded-full bg-accent-soft px-3 py-1.5 text-xs font-semibold text-accent"
            aria-live="polite"
          >
            {/* One revolution is one request. `key` restarts the sweep on each
                real check, so the arc is a readout of the polling loop rather
                than an idle animation running beside it. */}
            <svg viewBox="0 0 24 24" className="size-3.5 -rotate-90" aria-hidden="true">
              <circle
                cx="12"
                cy="12"
                r="9"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                opacity="0.2"
              />
              <circle
                key={checks}
                className="animate-poll-sweep"
                cx="12"
                cy="12"
                r="9"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray="56.5"
              />
            </svg>
            Listening for your first pageview
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {variants.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => setActive(v.id)}
            className={
              v.id === active
                ? "rounded-full bg-primary-soft px-3 py-1.5 text-xs font-semibold text-primary"
                : "rounded-full px-3 py-1.5 text-xs font-semibold text-muted hover:text-foreground"
            }
          >
            {v.label}
          </button>
        ))}
      </div>

      <p className="text-sm text-muted">{variant.hint}</p>

      <div className="relative">
        {/* bg-brand-ink, not bg-ink: the theme token in globals.css is
            `--color-brand-ink`. An undefined utility silently renders no
            background, which put white text on a white card. */}
        <pre className="overflow-x-auto rounded-xl bg-brand-ink p-4 pr-20 text-xs leading-relaxed text-white">
          <code className="whitespace-pre-wrap break-all">{variant.code}</code>
        </pre>
        <button
          type="button"
          onClick={copy}
          className="absolute right-3 top-3 rounded-lg bg-white/10 px-2.5 py-1 text-xs font-semibold text-white hover:bg-white/20"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      {/* The count is what makes the ring believable. An animation alone can
          keep moving after the loop behind it has died; a number that climbs
          cannot. */}
      {!installed && !givenUp && checks > 0 ? (
        <p className="text-xs text-muted">
          Checked {checks} {checks === 1 ? "time" : "times"} · paste the snippet
          and load any page on your site
        </p>
      ) : null}

      {installed ? (
        <p className="text-xs text-muted">
          Your first pageview arrived. Reports build from here.
        </p>
      ) : null}
    </div>
  );
}
