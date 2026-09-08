"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createGroupAction,
  type CreateGroupState,
} from "@/app/dashboard/groups/actions";
import { MAX_GROUP_NAME } from "@/libs/webstats/group-name";

const INITIAL: CreateGroupState = { error: null };

/** "Add website" and "New group" collapsed into one control.
 *
 *  Two different things a click here can start — adding a site is a
 *  navigation, creating a group is a dialog — so the menu just routes to
 *  whichever one the choice implies rather than trying to unify them into a
 *  single flow. */
export default function NewMenu({ canAddWebsite }: { canAddWebsite: boolean }) {
  const [open, setOpen] = useState(false);
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  const [state, formAction, pending] = useActionState(createGroupAction, INITIAL);

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

    if (groupDialogOpen && !dialog.open) dialog.showModal();
    if (!groupDialogOpen && dialog.open) dialog.close();
  }, [groupDialogOpen]);

  useEffect(() => {
    if (!state.groupId) return;

    // Deferred: this effect syncs to the create-group action's result, an
    // external system, but the setState itself is queued rather than called
    // inline in the effect body to avoid a cascading render.
    queueMicrotask(() => setGroupDialogOpen(false));
    formRef.current?.reset();
    router.refresh();
  }, [state.groupId, router]);

  const item =
    "block w-full px-4 py-2.5 text-left text-sm transition hover:bg-surface";

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="btn-gradient inline-flex items-center gap-1.5 px-5 py-2.5 text-sm"
      >
        + New
        <svg
          viewBox="0 0 24 24"
          className={`size-3.5 transition-transform ${open ? "rotate-180" : ""}`}
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
          role="menu"
          className="absolute right-0 top-11 z-20 w-52 overflow-hidden rounded-xl border border-border bg-card py-1 shadow-lg"
        >
          {canAddWebsite ? (
            <Link
              href="/dashboard/sites/new"
              role="menuitem"
              className={item}
              onClick={() => setOpen(false)}
            >
              New website
            </Link>
          ) : (
            <Link
              href="/dashboard/billing"
              role="menuitem"
              className={item}
              onClick={() => setOpen(false)}
            >
              Upgrade to add more
            </Link>
          )}

          <button
            type="button"
            role="menuitem"
            className={item}
            onClick={() => {
              setOpen(false);
              setGroupDialogOpen(true);
            }}
          >
            New group
          </button>
        </div>
      ) : null}

      <dialog
        ref={dialogRef}
        onClose={() => setGroupDialogOpen(false)}
        className="w-[min(28rem,92vw)] rounded-2xl border border-border bg-card p-0 backdrop:bg-black/40"
      >
        <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-3">
          <h2 className="section-heading text-sm font-extrabold">New group</h2>
          <button
            type="button"
            onClick={() => setGroupDialogOpen(false)}
            className="rounded-lg px-2 py-1 text-sm text-muted transition hover:text-foreground"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <form ref={formRef} action={formAction} className="space-y-4 p-5">
          <div className="space-y-2">
            <label htmlFor="new-group-name" className="block text-sm font-semibold">
              Name
            </label>
            <input
              id="new-group-name"
              name="name"
              maxLength={MAX_GROUP_NAME}
              autoFocus
              autoComplete="off"
              placeholder="Client work"
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary"
            />
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
            {pending ? "Creating…" : "Create group"}
          </button>
        </form>
      </dialog>
    </div>
  );
}
