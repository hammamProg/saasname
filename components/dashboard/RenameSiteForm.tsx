"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  renameSiteAction,
  type RenameSiteState,
} from "@/app/dashboard/sites/actions";
import { MAX_SITE_NAME } from "@/libs/webstats/site-name";

const INITIAL: RenameSiteState = { error: null };

/** Rename a site.
 *
 *  Only the label is editable. The domain is what ingest matches beacons
 *  against and what the installed snippet is bound to, so it is shown as
 *  context rather than as a field — editing it here would silently orphan a
 *  working install. */
export default function RenameSiteForm({
  siteId,
  domain,
  name,
  onDone,
}: {
  siteId: string;
  domain: string;
  name: string;
  onDone?: () => void;
}) {
  const [state, formAction, pending] = useActionState(renameSiteAction, INITIAL);
  const router = useRouter();

  useEffect(() => {
    if (!state.done) return;

    // The action revalidates on the server; this is what makes the already
    // rendered page pick the new name up without a reload.
    router.refresh();
    onDone?.();
  }, [state.done, router, onDone]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="siteId" value={siteId} />

      <div className="space-y-2">
        <label htmlFor="site-name" className="block text-sm font-semibold">
          Name
        </label>
        <input
          id="site-name"
          name="name"
          defaultValue={name}
          maxLength={MAX_SITE_NAME}
          autoFocus
          autoComplete="off"
          aria-describedby="rename-hint"
          className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary"
        />
        <p id="rename-hint" className="text-xs text-muted">
          Only what you see in the dashboard. Traffic is still matched against{" "}
          <span className="font-medium text-foreground">{domain}</span>, so the
          snippet you installed keeps working. Leave it empty to use the domain.
        </p>
      </div>

      {state.error ? (
        <p
          role="alert"
          className="rounded-xl border border-danger-border bg-danger-soft px-4 py-3 text-sm text-danger"
        >
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="btn-gradient w-full px-6 py-3 text-sm disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save name"}
      </button>
    </form>
  );
}
