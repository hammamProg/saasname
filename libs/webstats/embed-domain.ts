/** Embed-allowlist type and constraints.
 *
 *  Its own module because client components (the allowlist manager in the
 *  badge panel) need the type without dragging in `embed-domains.ts`, which
 *  imports the server-scoped Supabase client — same split as group-name.ts. */

export type EmbedDomain = {
  id: string;
  domain: string;
  createdAt: string;
};

/** Past this, the list itself becomes the thing that needs scrolling and
 *  managing — an owner adding a dozen domains almost certainly wants a
 *  wildcard or a different mechanism, not a longer list. */
export const MAX_EMBED_DOMAINS = 10;

/** Raised when a domain is already on the site's allowlist. */
export class DuplicateEmbedDomainError extends Error {
  constructor(public readonly domain: string) {
    super(`${domain} is already allowed`);
    this.name = "DuplicateEmbedDomainError";
  }
}

/** Raised when the allowlist is already at MAX_EMBED_DOMAINS. */
export class EmbedDomainLimitError extends Error {
  constructor() {
    super(`You can allow up to ${MAX_EMBED_DOMAINS} domains.`);
    this.name = "EmbedDomainLimitError";
  }
}
