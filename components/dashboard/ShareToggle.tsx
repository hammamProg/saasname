"use client";

import { useState } from "react";
import { Check, Link2, Loader2 } from "lucide-react";
import apiClient, { ApiError } from "@/libs/api";

export default function ShareToggle({
  searchId,
  initialToken,
}: {
  searchId: string;
  initialToken: string | null;
}) {
  const [token, setToken] = useState(initialToken);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const shareUrl = token
    ? `${typeof window === "undefined" ? "" : window.location.origin}/r/${token}`
    : null;

  async function toggle(next: boolean) {
    setBusy(true);
    setError(null);

    try {
      const { shareToken } = await apiClient.post<{ shareToken: string | null }>(
        `/searches/${searchId}/share`,
        { isPublic: next }
      );
      setToken(shareToken);
      setCopied(false);
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : "Could not update sharing."
      );
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="card space-y-3 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">Share this report</p>
          <p className="text-xs text-muted">
            {token
              ? "Anyone with the link can read it. No sign-in needed."
              : "Private. Only you can see this."}
          </p>
        </div>

        <button
          type="button"
          onClick={() => toggle(!token)}
          disabled={busy}
          className="btn-primary flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold disabled:opacity-60"
        >
          {busy ? (
            <Loader2 size={14} className="animate-spin" aria-hidden="true" />
          ) : (
            <Link2 size={14} aria-hidden="true" />
          )}
          {token ? "Stop sharing" : "Create link"}
        </button>
      </div>

      {shareUrl && (
        <div className="flex items-center gap-2">
          <input
            readOnly
            value={shareUrl}
            onFocus={(e) => e.currentTarget.select()}
            className="min-w-0 flex-1 rounded-xl border border-border bg-surface px-3 py-2 text-xs"
          />
          <button
            type="button"
            onClick={copy}
            className="flex shrink-0 items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-bold hover:bg-surface"
          >
            {copied ? <Check size={13} aria-hidden="true" /> : null}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      )}

      {token && (
        <p className="text-xs text-muted">
          Stopping sharing deletes the link. Anyone still holding it loses
          access immediately.
        </p>
      )}

      {error && (
        <p role="alert" className="text-xs text-verdict-blocked">
          {error}
        </p>
      )}
    </div>
  );
}
