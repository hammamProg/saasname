"use client";

import { useEffect, useRef, useState } from "react";
import type { SnippetVariant } from "@/libs/webstats/snippet";
import InstallSnippet from "@/components/dashboard/InstallSnippet";
import DeleteSiteButton from "@/components/dashboard/DeleteSiteButton";

type Panel = "install" | "remove" | null;

/** Per-site actions, collapsed into one control beside the domain.
 *
 *  The install snippet lives here once a site is verified. Before that it is
 *  the whole point of the page and stays in view; after, it is a thing you
 *  need about once, and leaving it as the first section pushes the actual
 *  reports below the fold forever.
 *
 *  Uses a native <dialog>, which brings focus trapping, Escape-to-close and
 *  inert backdrop content without a library or a focus-management bug of my
 *  own making. */
export default function SiteOptionsMenu({
  siteId,
  domain,
  variants,
  installed,
}: {
  siteId: string;
  domain: string;
  variants: SnippetVariant[];
  installed: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<Panel>(null);
  const [copied, setCopied] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Close on an outside click or Escape. A menu that only closes by choosing
  // something is a trap.
  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (panel && !dialog.open) dialog.showModal();
    if (!panel && dialog.open) dialog.close();
  }, [panel]);

  function choose(next: Panel) {
    setOpen(false);
    setPanel(next);
  }

  async function copySiteId() {
    setOpen(false);
    try {
      await navigator.clipboard.writeText(siteId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard is permission-gated; the id is visible in the snippet.
    }
  }

  const item =
    "block w-full px-4 py-2.5 text-left text-sm transition hover:bg-surface";

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Options for ${domain}`}
        className="flex size-9 items-center justify-center rounded-xl border border-border text-muted transition hover:border-primary/40 hover:text-foreground"
      >
        <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
          <circle cx="5" cy="12" r="1.8" fill="currentColor" />
          <circle cx="12" cy="12" r="1.8" fill="currentColor" />
          <circle cx="19" cy="12" r="1.8" fill="currentColor" />
        </svg>
      </button>

      {copied ? (
        <span className="absolute right-0 top-11 z-20 whitespace-nowrap rounded-lg bg-brand-ink px-2.5 py-1 text-xs font-semibold text-white">
          Site ID copied
        </span>
      ) : null}

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-11 z-20 w-56 overflow-hidden rounded-xl border border-border bg-card py-1 shadow-lg"
        >
          <button type="button" role="menuitem" className={item}
            onClick={() => choose("install")}>
            Install snippet
          </button>

          <a
            role="menuitem"
            href={`https://${domain}`}
            target="_blank"
            rel="noreferrer noopener"
            className={item}
            onClick={() => setOpen(false)}
          >
            Open {domain}
          </a>

          <button type="button" role="menuitem" className={item} onClick={copySiteId}>
            Copy site ID
          </button>

          <div className="my-1 border-t border-border" />

          <button
            type="button"
            role="menuitem"
            className={`${item} text-red-700 hover:bg-red-50`}
            onClick={() => choose("remove")}
          >
            Stop tracking
          </button>
        </div>
      ) : null}

      <dialog
        ref={dialogRef}
        onClose={() => setPanel(null)}
        // Native dialogs are centred by the UA and need explicit sizing; the
        // backdrop is styled in globals.css.
        className="w-[min(42rem,92vw)] rounded-2xl border border-border bg-card p-0 backdrop:bg-black/40"
      >
        <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-3">
          <h2 className="section-heading text-sm font-extrabold">
            {panel === "remove" ? "Stop tracking" : "Install"} · {domain}
          </h2>
          <button
            type="button"
            onClick={() => setPanel(null)}
            className="rounded-lg px-2 py-1 text-sm text-muted transition hover:text-foreground"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="p-5">
          {panel === "install" ? (
            <InstallSnippet
              siteId={siteId}
              variants={variants}
              initiallyInstalled={installed}
              embedded
            />
          ) : null}
          {panel === "remove" ? (
            <DeleteSiteButton siteId={siteId} domain={domain} />
          ) : null}
        </div>
      </dialog>
    </div>
  );
}
