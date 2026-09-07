/** Turning a site's traffic into something matchable against trend topics.
 *
 *  This is the half of the trend tie-in that costs nothing: no model call, no
 *  embedding, just the words already present in a site's URLs and titles. It
 *  runs first, and the semantic matcher only has to cover what it misses. */

export type AliasRow = { topicId: string; alias: string };
export type AliasHit = { topicId: string; evidence: string };

/** Path segments that appear on every site and describe none of them.
 *  Matching on these would tie every blog to whatever topic contains the word
 *  "blog", which is noise dressed as a signal. */
const STRUCTURAL = new Set([
  "blog",
  "docs",
  "doc",
  "posts",
  "post",
  "page",
  "pages",
  "article",
  "articles",
  "en",
  "index",
  "home",
  "about",
  "contact",
  "privacy",
  "terms",
  "tos",
  "login",
  "signup",
  "signin",
  "auth",
  "dashboard",
  "account",
  "settings",
  "pricing",
  "the",
  "and",
  "for",
  "with",
  "of",
  "to",
  "a",
  "an",
  "in",
  "on",
]);

/** Words from a set of paths, cleaned and deduplicated.
 *
 *  Two characters is the floor rather than three, because "ai" and "ml" are
 *  exactly the terms this product exists to notice. */
export function termsFrom(paths: string[]): string[] {
  const terms = new Set<string>();

  for (const path of paths) {
    for (const raw of path.split(/[/\-_.]+/)) {
      const term = raw.trim().toLowerCase();

      if (term.length < 2) continue;
      if (/^\d+$/.test(term)) continue;
      if (STRUCTURAL.has(term)) continue;

      terms.add(term);
    }
  }

  return [...terms];
}

/** Topics whose alias is fully present in the site's terms.
 *
 *  A multi-word alias needs every word present. Partial overlap is how "vector
 *  database" would match a site that merely mentions vectors, which produces
 *  confident-looking matches that are wrong — the worst failure mode for a
 *  feature whose whole claim is relevance. */
export function matchAliases(
  terms: string[],
  aliases: AliasRow[],
): AliasHit[] {
  const present = new Set(terms.map((t) => t.toLowerCase()));
  const hits: AliasHit[] = [];

  for (const { topicId, alias } of aliases) {
    const words = alias
      .toLowerCase()
      .split(/[\s\-_]+/)
      .filter((w) => w.length >= 2);

    if (words.length === 0) continue;
    if (!words.every((w) => present.has(w))) continue;

    hits.push({ topicId, evidence: alias.toLowerCase() });
  }

  return hits;
}

/** One string describing what a site is about, for embedding.
 *
 *  Titles first because they are written for humans; path terms are the
 *  fallback for sites whose titles say nothing. Capped so a site with hundreds
 *  of pages does not send a wall of text that averages out to nothing. */
export function siteProfile(titles: string[], terms: string[]): string {
  const source = titles.length > 0 ? titles : terms;
  if (source.length === 0) return "";

  const joined = source.join(". ");

  return joined.length <= 1000 ? joined : joined.slice(0, 1000);
}
