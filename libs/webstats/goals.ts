/** Goal configuration. Reads and writes go through the user-scoped Supabase
 *  client, so ownership is enforced by RLS — see
 *  036_webstats_identity_attribution.sql. */

import { createClient } from "@/libs/supabase/server";
import { DuplicateGoalKeyError, type Goal, type GoalDedupe, type GoalType } from "./goal-name";

export {
  MAX_GOAL_NAME,
  DuplicateGoalKeyError,
  type Goal,
  type GoalDedupe,
  type GoalType,
} from "./goal-name";

/** A key is what `analytics.goal(key, props)` sends — kept URL/identifier
 *  safe so it is never ambiguous in a query string or a dashboard filter. */
const KEY_PATTERN = /^[a-z0-9][a-z0-9_-]{0,59}$/;

type GoalRow = {
  id: string;
  site_id: string;
  key: string;
  name: string;
  type: GoalType;
  match: Record<string, unknown>;
  dedupe: GoalDedupe;
  created_at: string;
};

function toGoal(row: GoalRow): Goal {
  return {
    id: row.id,
    siteId: row.site_id,
    key: row.key,
    name: row.name,
    type: row.type,
    match: row.match,
    dedupe: row.dedupe,
    createdAt: row.created_at,
  };
}

export async function listGoals(siteId: string): Promise<Goal[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("webstats_goals")
    .select("id, site_id, key, name, type, match, dedupe, created_at")
    .eq("site_id", siteId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to list goals: ${error.message}`);

  return (data ?? []).map(toGoal);
}

export async function createGoal(params: {
  siteId: string;
  key: string;
  name: string;
  type: GoalType;
  match?: Record<string, unknown>;
  dedupe?: GoalDedupe;
}): Promise<Goal> {
  const key = params.key.trim().toLowerCase();
  if (!KEY_PATTERN.test(key)) {
    throw new Error(
      "Goal key must be lowercase letters, numbers, - or _, up to 60 characters.",
    );
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("webstats_goals")
    .insert({
      site_id: params.siteId,
      key,
      name: params.name.trim() || key,
      type: params.type,
      match: params.match ?? {},
      dedupe: params.dedupe ?? "every",
    })
    .select("id, site_id, key, name, type, match, dedupe, created_at")
    .single();

  if (error?.code === "23505") throw new DuplicateGoalKeyError(key);
  if (error) throw new Error(`Failed to create goal: ${error.message}`);

  return toGoal(data);
}

export async function deleteGoal(siteId: string, goalId: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("webstats_goals")
    .delete()
    .eq("site_id", siteId)
    .eq("id", goalId);

  if (error) throw new Error(`Failed to delete goal: ${error.message}`);
}
