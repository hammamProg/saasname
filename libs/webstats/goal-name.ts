/** Goal type/constant definitions usable from client components.
 *
 *  Its own module because both server actions and client components need
 *  these, and `goals.ts` imports the server-scoped Supabase client — pulling
 *  this from there into a client component drags `next/headers` with it and
 *  the build fails with no type error to warn you. Same split as
 *  site-name.ts / group-name.ts. */

export type GoalType =
  | "page"
  | "event"
  | "signup"
  | "click"
  | "form"
  | "download"
  | "outbound_link";

export type GoalDedupe = "once_per_visitor" | "once_per_session" | "every";

export type Goal = {
  id: string;
  siteId: string;
  key: string;
  name: string;
  type: GoalType;
  match: Record<string, unknown>;
  dedupe: GoalDedupe;
  createdAt: string;
};

/** Longer than this is not a name, it is a sentence, and it truncates in
 *  every place a goal is listed. */
export const MAX_GOAL_NAME = 60;

export class DuplicateGoalKeyError extends Error {
  constructor(public readonly key: string) {
    super(`A goal with the key "${key}" already exists`);
    this.name = "DuplicateGoalKeyError";
  }
}
