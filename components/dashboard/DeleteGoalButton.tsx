"use client";

import { useActionState } from "react";
import { deleteGoalAction, type DeleteGoalState } from "@/app/dashboard/sites/[id]/goals/actions";

const INITIAL: DeleteGoalState = { error: null };

export default function DeleteGoalButton({
  siteId,
  goalId,
}: {
  siteId: string;
  goalId: string;
}) {
  const [state, formAction, pending] = useActionState(deleteGoalAction, INITIAL);

  return (
    <form action={formAction}>
      <input type="hidden" name="siteId" value={siteId} />
      <input type="hidden" name="goalId" value={goalId} />
      <button
        type="submit"
        disabled={pending}
        className="text-sm font-semibold text-muted transition hover:text-danger disabled:opacity-60"
      >
        {pending ? "Removing…" : "Remove"}
      </button>
      {state.error ? <p className="mt-1 text-xs text-danger">{state.error}</p> : null}
    </form>
  );
}
