/** Goal completion deduplication.
 *
 *  The dedupe rule decides what `webstats_goal_completions`'s
 *  `unique (site_id, goal_id, dedupe_key)` constraint actually enforces:
 *
 *    once_per_visitor — dedupe_key is the visitor_id. A second `goal()` call
 *      for the same goal from the same visitor, ever, is a no-op.
 *    once_per_session — dedupe_key is the session_id. The same goal can
 *      complete again in a later session, but not twice within one.
 *    every            — dedupe_key is the client-supplied event_id, which is
 *      unique per call, so every occurrence is stored — except a genuine
 *      retry of the exact same call, which carries the exact same event_id
 *      and is still deduplicated. That is the difference between "every
 *      occurrence counts" and "a flaky network doubles the count". */

export type GoalDedupe = "once_per_visitor" | "once_per_session" | "every";

export function dedupeKeyFor(
  rule: GoalDedupe,
  ids: { visitorId: string; sessionId: string; eventId: string },
): string {
  if (rule === "once_per_visitor") return ids.visitorId;
  if (rule === "once_per_session") return ids.sessionId;
  return ids.eventId;
}
