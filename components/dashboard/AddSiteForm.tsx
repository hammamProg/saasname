"use client";

import { useActionState } from "react";
import { createSiteAction, type CreateSiteState } from "@/app/dashboard/sites/actions";

const INITIAL: CreateSiteState = { error: null };

export default function AddSiteForm() {
  const [state, formAction, pending] = useActionState(createSiteAction, INITIAL);

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-2">
        <label htmlFor="domain" className="block text-sm font-semibold">
          Website address
        </label>
        <input
          id="domain"
          name="domain"
          required
          autoFocus
          placeholder="example.com"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          aria-describedby={state.error ? "site-error" : "domain-hint"}
          className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary"
        />
        <p id="domain-hint" className="text-xs text-muted">
          Paste the address as you would type it. A full URL is fine.
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor="name" className="block text-sm font-semibold">
          Name <span className="font-normal text-muted">(optional)</span>
        </label>
        <input
          id="name"
          name="name"
          placeholder="Leave blank to use the domain"
          autoComplete="off"
          className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary"
        />
      </div>

      {state.error ? (
        <p
          id="site-error"
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
        {pending ? "Adding…" : "Add website"}
      </button>
    </form>
  );
}
