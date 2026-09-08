"use client";

import { useState } from "react";
import LiveVisitorsWidget from "@/components/dashboard/LiveVisitorsWidget";

/** A "Powered by" footer badge, paste-ready.
 *
 *  The live preview below is real JSX mirroring the copied HTML exactly —
 *  not a rendering of the string itself — so what the customer sees here is
 *  provably what they get, without reaching for dangerouslySetInnerHTML for
 *  a value that never needs to be arbitrary HTML in the first place. */
export default function BadgeSnippet({
  siteId,
  domain,
  href,
  iconUrl,
  appName,
  snippet,
}: {
  siteId: string;
  domain: string;
  href: string;
  iconUrl: string;
  appName: string;
  snippet: string;
}) {
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
    <div className="space-y-4">
      <p className="text-sm text-muted">
        A small credit link for {domain}&apos;s footer. Clicks are UTM-tagged,
        so they show up as attributed traffic in your own Acquisition report.
      </p>

      <LiveVisitorsWidget siteId={siteId} active />

      <div className="flex items-center justify-center rounded-xl border border-dashed border-border bg-background p-6">
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

      <p className="text-xs text-muted">Paste it anywhere in your site&apos;s footer.</p>
    </div>
  );
}
