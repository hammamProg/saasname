"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/libs/supabase/require-user";
import { getSite } from "@/libs/webstats/sites";
import {
  createGoal,
  deleteGoal,
  DuplicateGoalKeyError,
  MAX_GOAL_NAME,
  type GoalDedupe,
  type GoalType,
} from "@/libs/webstats/goals";

export type CreateGoalState = { error: string | null; done?: boolean };
export type DeleteGoalState = { error: string | null };

const GOAL_TYPES: GoalType[] = [
  "page",
  "event",
  "signup",
  "click",
  "form",
  "download",
  "outbound_link",
];

const DEDUPE_RULES: GoalDedupe[] = ["once_per_visitor", "once_per_session", "every"];

export async function createGoalAction(
  _previous: CreateGoalState,
  formData: FormData,
): Promise<CreateGoalState> {
  await requireUser();

  const siteId = String(formData.get("siteId") ?? "");
  const key = String(formData.get("key") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "") as GoalType;
  const dedupe = String(formData.get("dedupe") ?? "every") as GoalDedupe;

  if (!siteId) return { error: "Missing site." };
  if (!key) return { error: "Give the goal a key, e.g. \"signup\"." };
  if (name.length > MAX_GOAL_NAME) {
    return { error: `Keep the name under ${MAX_GOAL_NAME} characters.` };
  }
  if (!GOAL_TYPES.includes(type)) return { error: "Choose a goal type." };
  if (!DEDUPE_RULES.includes(dedupe)) return { error: "Choose a valid dedupe rule." };

  try {
    const site = await getSite(siteId);
    if (!site) return { error: "That website is no longer available." };

    await createGoal({ siteId, key, name: name || key, type, dedupe });
  } catch (error) {
    if (error instanceof DuplicateGoalKeyError) {
      return { error: `You already have a goal with the key "${error.key}".` };
    }
    if (error instanceof Error) return { error: error.message };

    console.error("[webstats] createGoal failed", error);
    return { error: "Could not create that goal. Try again." };
  }

  revalidatePath(`/dashboard/sites/${siteId}/goals`);

  return { error: null, done: true };
}

export async function deleteGoalAction(
  _previous: DeleteGoalState,
  formData: FormData,
): Promise<DeleteGoalState> {
  await requireUser();

  const siteId = String(formData.get("siteId") ?? "");
  const goalId = String(formData.get("goalId") ?? "");

  if (!siteId || !goalId) return { error: "Missing goal." };

  try {
    await deleteGoal(siteId, goalId);
  } catch (error) {
    console.error("[webstats] deleteGoal failed", error);
    return { error: "Could not delete that goal. Try again." };
  }

  revalidatePath(`/dashboard/sites/${siteId}/goals`);

  return { error: null };
}
