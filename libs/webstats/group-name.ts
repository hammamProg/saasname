/** Group type and name constraints.
 *
 *  Its own module because both server actions and client components need
 *  these, and `groups.ts` imports the server-scoped Supabase client — pulling
 *  this from there into a client component drags `next/headers` with it and
 *  the page fails at runtime with no type error to warn you. Same split as
 *  site-name.ts. */

export type SiteGroup = {
  id: string;
  name: string;
  createdAt: string;
};

/** Longer than this is not a label, it is a sentence, and it wraps in every
 *  place a group is listed. */
export const MAX_GROUP_NAME = 40;

/** Raised when a group with this name (case-insensitive) already exists. */
export class DuplicateGroupError extends Error {
  constructor(public readonly groupName: string) {
    super(`A group named "${groupName}" already exists`);
    this.name = "DuplicateGroupError";
  }
}
