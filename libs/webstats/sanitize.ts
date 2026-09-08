/** Strip sensitive query parameters before a URL is ever stored.
 *
 *  Applied to every landing/referrer/page URL the new identity pipeline
 *  captures — attribution reads query params (UTMs, click ids) but nothing
 *  else about a URL should be trusted or persisted verbatim, because
 *  visitors and their own tooling put things in query strings that were
 *  never meant to be logged. */

/** Case-insensitive; matched against the param name after lowercasing, so
 *  `Token`, `TOKEN` and `token` are all caught by one entry. Configurable by
 *  the caller because a customer's own app may use a different name for the
 *  same kind of value. */
export const DEFAULT_SENSITIVE_PARAMS = [
  "token",
  "access_token",
  "refresh_token",
  "password",
  "secret",
  "authorization",
  "code",
  "session",
  "email",
];

/** Values longer than this are almost always an accidental token/blob rather
 *  than a real tracking parameter, and would otherwise bloat storage for no
 *  attribution value. */
const MAX_PARAM_VALUE = 500;

export function sanitizeUrl(
  url: string,
  extraSensitiveParams: readonly string[] = [],
): string | null {
  let parsed: URL;

  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;

  const sensitive = new Set(
    [...DEFAULT_SENSITIVE_PARAMS, ...extraSensitiveParams].map((p) =>
      p.toLowerCase()
    )
  );

  const kept: [string, string][] = [];
  for (const [key, value] of parsed.searchParams) {
    if (sensitive.has(key.toLowerCase())) continue;
    kept.push([key, value.slice(0, MAX_PARAM_VALUE)]);
  }

  parsed.search = "";
  for (const [key, value] of kept) parsed.searchParams.append(key, value);

  // The fragment never reaches a server on a normal navigation, but a caller
  // could still hand one to us directly (e.g. a hash-routed SPA's current
  // URL) — drop it, since it isn't part of what the server actually saw.
  parsed.hash = "";

  return parsed.toString();
}
