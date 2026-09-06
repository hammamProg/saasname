"use client";

import { useEffect, useState } from "react";
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
}: {
  siteId: string;
  variants: SnippetVariant[];
  initiallyInstalled: boolean;
}) {
  const [active, setActive] = useState(variants[0]?.id);
  const [copied, setCopied] = useState(false);
  const [installed, setInstalled] = useState(initiallyInstalled);
  const [givenUp, setGivenUp] = useState(false);

  const variant = variants.find((v) => v.id === active) ?? variants[0];

  useEffect(() => {
    if (installed || givenUp) return;

    let cancelled = false;
    let attempts = 0;

    async function poll() {
      // Polling a background tab is pure waste: nobody is watching, and the
      // check costs a database round trip each time.
      if (document.visibilityState !== "visible") return;

      attempts += 1;

      // Someone who pastes the snippet sees the flip within seconds. Someone
      // who leaves this tab open for an hour should not still be polling —
      // they can reload. Fifteen minutes at five seconds.
      if (attempts > 180) {
        setGivenUp(true);
        return;
      }

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

    const timer = setInterval(poll, 5000);

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
    <div className="space-y-4 rounded-2xl border border-border bg-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="section-heading text-lg font-extrabold">Install</h2>

        {installed ? (
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            ✓ Receiving data
          </span>
        ) : givenUp ? (
          <span className="rounded-full bg-border/40 px-3 py-1 text-xs font-semibold text-muted">
            Stopped checking — reload to resume
          </span>
        ) : (
          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
            Waiting for your first pageview…
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
    </div>
  );
}
