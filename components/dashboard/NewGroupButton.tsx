"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  createGroupAction,
  type CreateGroupState,
} from "@/app/dashboard/groups/actions";
import { MAX_GROUP_NAME } from "@/libs/webstats/group-name";

const INITIAL: CreateGroupState = { error: null };

export default function NewGroupButton() {
  const [state, formAction, pending] = useActionState(createGroupAction, INITIAL);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!state.groupId) return;

    dialogRef.current?.close();
    formRef.current?.reset();
    router.refresh();
  }, [state.groupId, router]);

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2 text-sm font-semibold text-muted transition hover:border-primary/40 hover:text-foreground"
      >
        + New group
      </button>

      <dialog
        ref={dialogRef}
        className="w-[min(28rem,92vw)] rounded-2xl border border-border bg-card p-0 backdrop:bg-black/40"
      >
        <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-3">
          <h2 className="section-heading text-sm font-extrabold">New group</h2>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
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
    </>
  );
}
