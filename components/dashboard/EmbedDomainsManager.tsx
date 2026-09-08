"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import {
  addEmbedDomainAction,
  getEmbedDomainsAction,
  removeEmbedDomainAction,
  type AddEmbedDomainState,
  type RemoveEmbedDomainState,
} from "@/app/dashboard/sites/embed-domains-actions";
import type { EmbedDomain } from "@/libs/webstats/embed-domain";

const ADD_INITIAL: AddEmbedDomainState = { error: null };
const REMOVE_INITIAL: RemoveEmbedDomainState = { error: null };

function RemoveButton({ id, onRemoved }: { id: string; onRemoved: () => void }) {
  const [state, action, pending] = useActionState(removeEmbedDomainAction, REMOVE_INITIAL);

  useEffect(() => {
    if (!state.done) return;
    const timer = setTimeout(onRemoved, 0);
    return () => clearTimeout(timer);
  }, [state.done, onRemoved]);

  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        disabled={pending}
        className="shrink-0 text-xs font-semibold text-muted transition hover:text-danger disabled:opacity-50"
      >
        {pending ? "Removing…" : "Remove"}
      </button>
    </form>
  );
}

/** Who else, besides the site's own domain, may load its public embed.
 *
 *  Loaded lazily on mount rather than passed down from the site page: the
 *  allowlist only matters while this panel is open, and fetching it for
 *  every site card on the dashboard just in case someone opens the badge
 *  panel would be N wasted queries for one that gets used. */
export default function EmbedDomainsManager({
  siteId,
  siteDomain,
}: {
  siteId: string;
  siteDomain: string;
}) {
  const [domains, setDomains] = useState<EmbedDomain[] | null>(null);
  const [addState, addAction, addPending] = useActionState(addEmbedDomainAction, ADD_INITIAL);
  const formRef = useRef<HTMLFormElement>(null);

  const refresh = useCallback(async () => {
    setDomains(await getEmbedDomainsAction(siteId));
  }, [siteId]);

  useEffect(() => {
    // Scheduled rather than called straight from the effect body — same
    // reasoning as OnlineTile's initial refresh: the state update inside
    // `refresh` only happens after an await, so it is never actually
    // synchronous, but calling it here reads as a cascading render to the
    // linter, and deferring it costs nothing.
    const timer = setTimeout(refresh, 0);
    return () => clearTimeout(timer);
  }, [refresh]);

  useEffect(() => {
    // Depends on the whole object, not `addState.done`: this form stays
    // mounted across repeated adds, and `done` would otherwise stay `true`
    // across two successes in a row, so the second add would not re-trigger
    // a refresh or reset. A fresh action result is always a new object, even
    // when its fields are the same.
    if (!addState.done) return;

    const timer = setTimeout(refresh, 0);
    formRef.current?.reset();
    return () => clearTimeout(timer);
  }, [addState, refresh]);

  return (
    <div className="space-y-3 border-t border-border pt-6">
      <div>
        <p className="text-sm font-semibold">Allowed domains</p>
        <p className="mt-1 text-xs text-muted">
          Only {siteDomain} can load this widget. Add another domain to allow it
          there too — anywhere else, the embed stays blank.
        </p>
      </div>

      <ul className="space-y-1.5">
        <li className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2 text-sm">
          <span className="truncate">{siteDomain}</span>
          <span className="shrink-0 text-xs text-muted">This site</span>
        </li>

        {domains === null ? (
          <li className="px-3 py-2 text-xs text-muted">Loading…</li>
        ) : (
          domains.map((entry) => (
            <li
              key={entry.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2 text-sm"
            >
              <span className="truncate">{entry.domain}</span>
              <RemoveButton id={entry.id} onRemoved={refresh} />
            </li>
          ))
        )}
      </ul>

      <form ref={formRef} action={addAction} className="flex gap-2">
        <input type="hidden" name="siteId" value={siteId} />
        <input
          type="text"
          name="domain"
          placeholder="staging.example.com"
          className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <button
          type="submit"
          disabled={addPending}
          className="shrink-0 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-muted transition hover:text-foreground disabled:opacity-50"
        >
          {addPending ? "Adding…" : "Add"}
        </button>
      </form>

      {addState.error ? <p className="text-xs text-danger">{addState.error}</p> : null}
    </div>
  );
}
