"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setSiteGroupAction } from "@/app/dashboard/sites/actions";
import { createGroupAction } from "@/app/dashboard/groups/actions";
import { MAX_GROUP_NAME, type SiteGroup } from "@/libs/webstats/group-name";

/** Move a site into a group, or create one on the spot.
 *
 *  Two server actions chained by hand rather than one form: creating a group
 *  and moving a site into it are separate mutations with separate RLS
 *  policies, and the second one needs the id the first just generated. A
 *  single combined action would have to do both writes itself, duplicating
 *  what createGroupAction and setSiteGroupAction already do. */
export default function GroupPicker({
  siteId,
  groups,
  currentGroupId,
  onDone,
}: {
  siteId: string;
  groups: SiteGroup[];
  currentGroupId: string | null;
  onDone?: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const router = useRouter();

  function moveTo(groupId: string | null) {
    setError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("siteId", siteId);
      if (groupId) formData.set("groupId", groupId);

      const result = await setSiteGroupAction({ error: null }, formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
      onDone?.();
    });
  }

  function createAndMove() {
    const trimmed = newName.trim();
    if (!trimmed) return;

    setError(null);
    startTransition(async () => {
      const createFormData = new FormData();
      createFormData.set("name", trimmed);

      const created = await createGroupAction({ error: null }, createFormData);
      if (created.error || !created.groupId) {
        setError(created.error ?? "Could not create that group.");
        return;
      }

      const moveFormData = new FormData();
      moveFormData.set("siteId", siteId);
      moveFormData.set("groupId", created.groupId);

      const moved = await setSiteGroupAction({ error: null }, moveFormData);
      if (moved.error) {
        setError(moved.error);
        return;
      }
      router.refresh();
      onDone?.();
    });
  }

  const option = (active: boolean) =>
    active
      ? "block w-full rounded-lg bg-primary-soft px-3 py-2 text-left text-sm font-semibold text-primary"
      : "block w-full rounded-lg px-3 py-2 text-left text-sm text-foreground transition hover:bg-surface";

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <button
          type="button"
          onClick={() => moveTo(null)}
          disabled={pending}
          className={option(currentGroupId === null)}
        >
          No group
        </button>

        {groups.map((group) => (
          <button
            key={group.id}
            type="button"
            onClick={() => moveTo(group.id)}
            disabled={pending}
            className={option(currentGroupId === group.id)}
          >
            {group.name}
          </button>
        ))}
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-xl border border-danger-border bg-danger-soft px-4 py-3 text-sm text-danger"
        >
          {error}
        </p>
      ) : null}

      {creating ? (
        <div className="flex gap-2">
          <input
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            maxLength={MAX_GROUP_NAME}
            placeholder="Group name"
            autoFocus
            autoComplete="off"
            className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <button
            type="button"
            onClick={createAndMove}
            disabled={pending || !newName.trim()}
            className="btn-gradient shrink-0 px-4 py-2 text-sm disabled:opacity-60"
          >
            {pending ? "Adding…" : "Create"}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="text-sm font-semibold text-primary hover:underline"
        >
          + New group
        </button>
      )}
    </div>
  );
}
