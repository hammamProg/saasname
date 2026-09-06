/** URL and referrer parsing for incoming beacons. */

export type Utm = {
  source: string | null;
  medium: string | null;
  campaign: string | null;
  content: string | null;
  term: string | null;
};

export type LocationInfo = {
  path: string;
  query: string | null;
  utm: Utm;
};

export type ReferrerInfo = {
  domain: string;
  path: string;
};

/** Values longer than this are almost certainly generated junk, and storing
 *  them would let one visitor bloat a dimension rollup. */
const MAX_VALUE = 255;

function trim(value: string | null): string | null {
  if (!value) return null;

  const clean = value.trim().slice(0, MAX_VALUE);
  return clean || null;
}

/** Strip a leading `www.` so one source does not split across two rows. */
function bareHost(hostname: string): string {
  return hostname.toLowerCase().replace(/^www\./, "");
}

export function parseLocation(url: string): LocationInfo {
  let parsed: URL;

  try {
    parsed = new URL(url);
  } catch {
    // A beacon with an unusable URL is still a pageview worth counting; it
    // just has no page. Discarding it entirely would undercount visitors.
    return {
      path: "/",
      query: null,
      utm: { source: null, medium: null, campaign: null, content: null, term: null },
    };
  }

  const params = parsed.searchParams;

  return {
    // The fragment never reaches a server on a normal navigation, and hash
    // routes are normalised into the path by the tracker before sending.
    path: parsed.pathname || "/",
    query: parsed.search ? parsed.search.slice(1) : null,
    utm: {
      source: trim(params.get("utm_source")),
      medium: trim(params.get("utm_medium")),
      campaign: trim(params.get("utm_campaign")),
      content: trim(params.get("utm_content")),
      term: trim(params.get("utm_term")),
    },
  };
}

/** Parse a referrer, suppressing self-referrals.
 *
 *  Internal navigation is not a traffic source. Left in, the site itself would
 *  be the top referrer on every dashboard, which is both wrong and useless.
 *  The comparison is made on the bare host so `www.example.com` linking to
 *  `example.com` is still recognised as internal. */
export function parseReferrer(
  referrer: string | null | undefined,
  siteDomain: string,
): ReferrerInfo | null {
  if (!referrer) return null;

  let parsed: URL;

  try {
    parsed = new URL(referrer);
  } catch {
    return null;
  }

  const domain = bareHost(parsed.hostname);

  if (!domain || domain === bareHost(siteDomain)) {
    return null;
  }

  return {
    domain: domain.slice(0, MAX_VALUE),
    path: (parsed.pathname || "/").slice(0, MAX_VALUE),
  };
}
