"use client";

import { useActionState, useState } from "react";
import {
  deleteSiteAction,
  type DeleteSiteState,
} from "@/app/dashboard/sites/actions";

const INITIAL: DeleteSiteState = { error: null };

/** Stop tracking a site.
 *
 *  Two steps rather than one. A single click is wrong for something that hides
 *  a site's whole report history, and a browser `confirm()` is worse: it cannot
 *  say what is actually lost. The second step names the site and the
 *  consequence, so the decision is made with the facts in view. */
export default function DeleteSiteButton({
  siteId,
  domain,
}: {
  siteId: string;
  domain: string;
}) {
  const [state, formAction, pending] = useActionState(deleteSiteAction, INITIAL);
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">Stop tracking this site</p>
          <p className="text-sm text-muted">
            Removes {domain} from your dashboard.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-muted transition hover:border-red-300 hover:text-red-700"
        >
          Stop tracking
        </button>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="siteId" value={siteId} />

      <div>
        <p className="text-sm font-semibold">Stop tracking {domain}?</p>
        <p className="mt-1 text-sm text-muted">
          Its reports disappear from your dashboard and the snippet stops being
          counted. You can add {domain} again later, but it starts from zero.
        </p>
      </div>

      {state.error ? (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {state.error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
        >
          {pending ? "Removing…" : `Yes, stop tracking ${domain}`}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={pending}
          className="rounded-xl px-4 py-2 text-sm font-semibold text-muted transition hover:text-foreground disabled:opacity-60"
        >
          Keep tracking
        </button>
      </div>
    </form>
  );
}
