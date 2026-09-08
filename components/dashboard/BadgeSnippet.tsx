"use client";

import { useState } from "react";
import LiveVisitorsCard from "@/components/webstats/LiveVisitorsCard";

function CopyBlock({ snippet }: { snippet: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard is permission-gated; the code is on screen to select.
    }
  }

  return (
    <div className="relative">
      <pre className="overflow-x-auto rounded-xl bg-brand-ink p-4 pr-20 text-xs leading-relaxed text-white">
        <code className="whitespace-pre-wrap break-words">{snippet}</code>
      </pre>
      <button
        type="button"
        onClick={copy}
        className="absolute right-3 top-3 rounded-lg bg-white/10 px-2.5 py-1 text-xs font-semibold text-white hover:bg-white/20"
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

/** Two paste-ready things, in order of what most people actually want:
 *
 *  1. The live widget — online count, 30-minute shape and country breakdown,
 *     with the "Powered by" credit tucked small in its own corner rather
 *     than boxed out separately. The preview above it is the dashboard-
 *     scoped version of the exact same component the iframe embeds (see
 *     components/webstats/LiveVisitorsCard and app/embed/live/[id]), so
 *     what's shown here is what gets pasted, not a mockup of it.
 *  2. Just the credit link on its own, for a footer — this one is a
 *     standalone badge rather than a corner credit, since there's no widget
 *     for it to sit inside. Clicks on either are UTM-tagged, so they show up
 *     as attributed traffic in your own Acquisition report. */
export default function BadgeSnippet({
  siteId,
  domain,
  href,
  iconUrl,
  appName,
  snippet,
  liveEmbedSnippet,
}: {
  siteId: string;
  domain: string;
  href: string;
  iconUrl: string;
  appName: string;
  snippet: string;
  liveEmbedSnippet: string;
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <p className="text-sm text-muted">
          A live &quot;who&apos;s online&quot; widget for {domain} — visitor
          count, the last 30 minutes of activity, and where people are
          visiting from. Paste it anywhere; it keeps polling on its own.
        </p>

        <LiveVisitorsCard
          endpoint={`/api/webstats/sites/${siteId}/live`}
          badge={{ href, iconUrl, appName }}
        />

        <CopyBlock snippet={liveEmbedSnippet} />
        <p className="text-xs text-muted">
          Paste it anywhere on your site. It updates itself every 15 seconds.
        </p>
      </div>

      <div className="space-y-3 border-t border-border pt-6">
        <p className="text-sm text-muted">
          Or just the credit link, for your footer.
        </p>
        <div className="flex justify-start">
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full bg-[#1A1A1A] px-3 py-1.5 font-sans text-[13px] font-semibold leading-none text-white no-underline"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={iconUrl} alt="" width={14} height={14} className="block rounded-[3px]" />
            Powered by {appName}
          </a>
        </div>
        <CopyBlock snippet={snippet} />
      </div>
    </div>
  );
}
