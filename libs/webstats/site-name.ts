/** Site-name constraints.
 *
 *  Its own module because both a server action and a client form need it, and
 *  `sites.ts` imports the server-scoped Supabase client — pulling this from
 *  there into a client component drags `next/headers` with it and the page
 *  fails at runtime with no type error to warn you. */

/** Longer than this is not a name, it is a sentence, and it truncates in every
 *  place a site is listed. */
export const MAX_SITE_NAME = 60;
