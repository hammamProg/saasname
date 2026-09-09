"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createSiteAction, type CreateSiteState } from "@/app/dashboard/sites/actions";
import type { SiteGroup } from "@/libs/webstats/group-name";

const INITIAL: CreateSiteState = { error: null };

/** Custom listbox rather than a native <select> — a native dropdown's open
 *  popup is OS-rendered chrome that can't pick up the app's border radius,
 *  surface colour or hover states, so it always looks like a foreign control
 *  dropped onto the page even once the closed trigger is themed correctly. */
function GroupField({ groups }: { groups: SiteGroup[] }) {
  const [open, setOpen] = useState(false);
  const [groupId, setGroupId] = useState<string>("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
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

  const selected = groups.find((group) => group.id === groupId);

  const option = (active: boolean) =>
    active
      ? "block w-full rounded-lg bg-primary-soft px-3 py-2 text-left text-sm font-semibold text-primary"
      : "block w-full rounded-lg px-3 py-2 text-left text-sm text-foreground transition hover:bg-surface";

  return (
    <div className="space-y-2">
      <label htmlFor="group-trigger" className="block text-sm font-semibold">
        Group <span className="font-normal text-muted">(optional)</span>
      </label>

      <div className="relative" ref={containerRef}>
        <input type="hidden" name="groupId" value={groupId} />

        <button
          id="group-trigger"
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="listbox"
          aria-expanded={open}
          className="flex w-full items-center justify-between gap-2 rounded-xl border border-border bg-background px-4 py-3 text-left text-sm outline-none focus:border-primary"
        >
          <span className={selected ? "text-foreground" : "text-muted"}>
            {selected ? selected.name : "No group"}
          </span>
          <svg
            viewBox="0 0 24 24"
            className={`size-4 shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`}
            aria-hidden="true"
          >
            <path
              d="M6 9l6 6 6-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {open ? (
          <div
            role="listbox"
            className="absolute inset-x-0 top-full z-20 mt-2 space-y-1 rounded-xl border border-border bg-card p-1.5 shadow-lg"
          >
            <button
              type="button"
              role="option"
              aria-selected={groupId === ""}
              className={option(groupId === "")}
              onClick={() => {
                setGroupId("");
                setOpen(false);
              }}
            >
              No group
            </button>

            {groups.map((group) => (
              <button
                key={group.id}
                type="button"
                role="option"
                aria-selected={groupId === group.id}
                className={option(groupId === group.id)}
                onClick={() => {
                  setGroupId(group.id);
                  setOpen(false);
                }}
              >
                {group.name}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function AddSiteForm({
  groups,
  domain,
}: {
  groups: SiteGroup[];
  /** Pre-fill from the landing page's hero form (?domain=… carried through
   *  sign-in as the `next` redirect target), so a visitor who already typed
   *  their domain doesn't have to type it again after auth. */
  domain?: string;
}) {
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
          defaultValue={domain ?? ""}
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

      {groups.length > 0 ? <GroupField groups={groups} /> : null}

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
