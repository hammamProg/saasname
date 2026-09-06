import { createClient } from "@/libs/supabase/server";
import { limitsForPlan, type PlanId } from "@/libs/plans";

/** The topics a plan cannot see in full: the N highest-scoring published
 *  topics overall.
 *
 *  Deliberately global rather than relative to a user's feed position. A
 *  per-feed rule would lock a trend for one user while leaving the same trend
 *  reachable by direct URL for another, which is not a paywall so much as an
 *  inconvenience. Computing it once here lets the feed and the detail page
 *  agree. */
export async function lockedTopicIds(plan: PlanId): Promise<Set<string>> {
  const { lockedTopN } = limitsForPlan(plan);

  if (lockedTopN <= 0) {
    return new Set();
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("topics")
    .select("id")
    .eq("editorial_status", "published")
    .order("trend_score", { ascending: false })
    .limit(lockedTopN);

  if (error) {
    // Fail closed: if we cannot determine what is locked, lock nothing rather
    // than accidentally hiding the whole feed, but surface it — a silently
    // broken paywall is a revenue bug.
    console.error("[locked-topics] Failed to resolve locked topics:", error.message);
    return new Set();
  }

  return new Set((data ?? []).map((row) => row.id as string));
}
