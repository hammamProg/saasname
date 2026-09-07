"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  deleteGroupAction,
  renameGroupAction,
  type DeleteGroupState,
  type RenameGroupState,
} from "@/app/dashboard/groups/actions";
import { MAX_GROUP_NAME } from "@/libs/webstats/group-name";

const RENAME_INITIAL: RenameGroupState = { error: null };
const DELETE_INITIAL: DeleteGroupState = { error: null };

type Panel = "rename" | "remove" | null;

/** Rename or delete a group. Deleting only removes the label — its sites fall
 *  back to Ungrouped, they are never touched (ON DELETE SET NULL on
 *  group_id, see 035_webstats_site_groups.sql), so this skips the two-step
 *  confirm DeleteSiteButton uses for an action that actually loses data. */
export default function GroupOptionsMenu({
  groupId,
  name,
}: {
  groupId: string;
  name: string;
}) {
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<Panel>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const router = useRouter();

  const [renameState, renameAction, renamePending] = useActionState(
    renameGroupAction,
    RENAME_INITIAL,
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteGroupAction,
    DELETE_INITIAL,
  );

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

  useEffect(() => {
    if (!renameState.done) return;
    router.refresh();
    setPanel(null);
  }, [renameState.done, router]);

  useEffect(() => {
    if (!deleteState.done) return;
    router.refresh();
    setPanel(null);
  }, [deleteState.done, router]);

  function choose(next: Panel) {
    setOpen(false);
    setPanel(next);
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
        aria-label={`Options for ${name}`}
        className="flex size-8 items-center justify-center rounded-lg text-muted transition hover:bg-surface hover:text-foreground"
      >
        <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
          <circle cx="5" cy="12" r="1.8" fill="currentColor" />
          <circle cx="12" cy="12" r="1.8" fill="currentColor" />
          <circle cx="19" cy="12" r="1.8" fill="currentColor" />
        </svg>
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-9 z-20 w-48 overflow-hidden rounded-xl border border-border bg-card py-1 shadow-lg"
        >
          <button type="button" role="menuitem" className={item}
            onClick={() => choose("rename")}>
            Rename group
          </button>
          <button
            type="button"
            role="menuitem"
            className={`${item} text-danger hover:bg-danger-soft`}
            onClick={() => choose("remove")}
          >
            Delete group
          </button>
        </div>
      ) : null}

      <dialog
        ref={dialogRef}
        onClose={() => setPanel(null)}
        className="w-[min(28rem,92vw)] rounded-2xl border border-border bg-card p-0 backdrop:bg-black/40"
      >
        <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-3">
          <h2 className="section-heading text-sm font-extrabold">
            {panel === "remove" ? "Delete group" : "Rename group"} · {name}
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
          {panel === "rename" ? (
            <form action={renameAction} className="space-y-4">
              <input type="hidden" name="groupId" value={groupId} />
              <input
                name="name"
                defaultValue={name}
                maxLength={MAX_GROUP_NAME}
                autoFocus
                autoComplete="off"
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary"
              />
              {renameState.error ? (
                <p
                  role="alert"
                  className="rounded-xl border border-danger-border bg-danger-soft px-4 py-3 text-sm text-danger"
                >
                  {renameState.error}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={renamePending}
                className="btn-gradient w-full px-6 py-3 text-sm disabled:opacity-60"
              >
                {renamePending ? "Saving…" : "Save name"}
              </button>
            </form>
          ) : null}

          {panel === "remove" ? (
            <form action={deleteAction} className="space-y-4">
              <input type="hidden" name="groupId" value={groupId} />
              <p className="text-sm text-muted">
                Removes the "{name}" group. Its websites are not deleted —
                they move back to Ungrouped.
              </p>
              {deleteState.error ? (
                <p
                  role="alert"
                  className="rounded-xl border border-danger-border bg-danger-soft px-4 py-3 text-sm text-danger"
                >
                  {deleteState.error}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={deletePending}
                className="rounded-xl bg-danger px-4 py-2 text-sm font-semibold text-background transition hover:opacity-90 disabled:opacity-60"
              >
                {deletePending ? "Deleting…" : `Delete "${name}"`}
              </button>
            </form>
          ) : null}
        </div>
      </dialog>
    </div>
  );
}
