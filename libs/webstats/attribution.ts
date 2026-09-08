/** Traffic-source capture, normalization and channel classification.
 *
 *  Everything here is pure — no database, no request object — so the rules
 *  are unit-testable directly and the exact priority order is readable in
 *  one place instead of scattered across the ingest handler.
 *
 *  Source-detection priority, applied in order, first match wins:
 *
 *    1. Explicit UTM parameters (utm_source/medium/campaign/term/content)
 *    2. Supported alt tracking parameters (ref, source, via)
 *    3. Advertising click identifiers (gclid, gbraid, wbraid, fbclid,
 *       msclkid, ttclid)
 *    4. External referrer (hostname of the Referer header/document.referrer)
 *    5. Direct — no referrer, no params
 *
 *  This only decides `source`/`medium`/`campaign`/`term`/`content`. Channel
 *  (Organic Search, Paid Social, ...) is a second, separate classification
 *  over the result — see `classifyChannel`. */

export type ClickIds = {
  gclid: string | null;
  gbraid: string | null;
  wbraid: string | null;
  fbclid: string | null;
  msclkid: string | null;
  ttclid: string | null;
};

export type Channel =
  | "Organic Search"
  | "Paid Search"
  | "Organic Social"
  | "Paid Social"
  | "Email"
  | "Referral"
  | "Affiliate"
  | "Display"
  | "Direct"
  | "Unknown";

/** Exactly what was present in the URL, before any fallback/synthesis. Kept
 *  distinct from the resolved `source`/`medium` below — those get synthesized
 *  from a click id or referrer when there is no UTM, and that synthesis
 *  should never be mistaken for what the link actually said. */
export type RawSource = {
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmTerm: string | null;
  utmContent: string | null;
  ref: string | null;
  altSource: string | null;
  via: string | null;
};

export type SourceInfo = {
  source: string;
  medium: string;
  campaign: string | null;
  term: string | null;
  content: string | null;
  channel: Channel;
  referrerHostname: string | null;
  referrerUrl: string | null;
  clickIds: ClickIds;
  raw: RawSource;
};

export type AttributionSnapshot = SourceInfo & {
  landingUrl: string;
  landingPath: string;
};

const CLICK_ID_PARAMS = [
  "gclid",
  "gbraid",
  "wbraid",
  "fbclid",
  "msclkid",
  "ttclid",
] as const;

/** Which advertiser a click id belongs to, for naming the source when no UTM
 *  was also set — a `gclid` with no `utm_source` is still unambiguously a
 *  Google Ads click. */
const CLICK_ID_SOURCE: Record<(typeof CLICK_ID_PARAMS)[number], string> = {
  gclid: "google",
  gbraid: "google",
  wbraid: "google",
  fbclid: "facebook",
  msclkid: "bing",
  ttclid: "tiktok",
};

const SEARCH_ENGINE_HOSTNAMES =
  /(^|\.)(google|bing|yahoo|duckduckgo|baidu|yandex|ecosia|ask|aol|naver|seznam)\.[a-z.]+$/i;

const SOCIAL_HOSTNAMES =
  /(^|\.)(facebook|instagram|twitter|x|t\.co|linkedin|tiktok|pinterest|reddit|snapchat|threads|youtube|discord|telegram|whatsapp|mastodon)\.[a-z.]+$/i;

const EMAIL_HOSTNAMES = /(^|\.)(mail\.google|outlook\.live|outlook\.office)\.[a-z.]+$/i;

function trim(value: string | null | undefined, max = 255): string | null {
  if (!value) return null;
  const clean = value.trim().slice(0, max);
  return clean || null;
}

function bareHost(hostname: string): string {
  return hostname.toLowerCase().replace(/^www\./, "");
}

function extractClickIds(params: URLSearchParams): ClickIds {
  const ids = {} as Record<(typeof CLICK_ID_PARAMS)[number], string | null>;
  for (const key of CLICK_ID_PARAMS) ids[key] = trim(params.get(key), 200);
  return ids as ClickIds;
}

function firstClickId(ids: ClickIds): (typeof CLICK_ID_PARAMS)[number] | null {
  for (const key of CLICK_ID_PARAMS) if (ids[key]) return key;
  return null;
}

/** Channel classification, over an already-resolved SourceInfo.
 *
 *  Order matters: a paid signal (click id, or utm_medium naming a paid
 *  channel) always wins over what the referrer/UTM source name alone would
 *  suggest, so a Google Ads click through an organic-looking utm_source
 *  still lands in Paid Search rather than Organic Search. */
export function classifyChannel(input: {
  source: string;
  medium: string;
  hasClickId: boolean;
  referrerHostname: string | null;
}): Channel {
  const medium = input.medium.toLowerCase();
  const source = input.source.toLowerCase();

  if (source === "direct" && medium === "none") return "Direct";

  if (medium === "affiliate" || source === "affiliate") return "Affiliate";
  if (medium === "email" || medium === "newsletter") return "Email";

  const referrerHost = input.referrerHostname ? bareHost(input.referrerHostname) : null;
  const isSearchHost = referrerHost ? SEARCH_ENGINE_HOSTNAMES.test(referrerHost) : false;
  const isSocialHost = referrerHost ? SOCIAL_HOSTNAMES.test(referrerHost) : false;
  const isEmailHost = referrerHost ? EMAIL_HOSTNAMES.test(referrerHost) : false;

  // Checked as their own group, ahead of the generic "any paid medium"
  // fallback below — a medium of exactly "paid-social"/"paid social" must
  // resolve to Paid Social, not fall through to the Display catch-all the
  // way it did before this was split out.
  const isPaidSocialMedium = /^paid.?social$/.test(medium);
  const isPaidSearchMedium = /^(cpc|ppc|paid.?search)$/.test(medium);
  const isDisplayMedium = /^(display|cpm|banner)$/.test(medium);

  if (input.hasClickId || isPaidSearchMedium || isPaidSocialMedium) {
    if (isSocialHost || isPaidSocialMedium) return "Paid Social";
    return "Paid Search";
  }

  if (medium === "social" || isSocialHost) return "Organic Social";
  if (medium === "organic" || isSearchHost) return "Organic Search";
  if (isEmailHost) return "Email";

  if (isDisplayMedium) return "Display";

  if (referrerHost) return "Referral";

  return "Unknown";
}

export type DeriveSourceInput = {
  /** The page's own URL, already sanitized — its query string is what UTM,
   *  click id and alt tracking params are read from. */
  pageUrl: string;
  /** document.referrer / the Referer header, or null. */
  referrerUrl: string | null;
  /** This site's own bare domain — a referrer from here is internal
   *  navigation, never a new source. */
  siteDomain: string;
  /** Extra hostnames to also treat as internal (SSO, checkout, etc.). */
  ignoredReferrerDomains?: readonly string[];
};

/** Resolve source/medium/campaign/channel for one page load, following the
 *  documented priority order. Returns null referrer fields when the referrer
 *  is internal or ignored — internal navigation must never look like a new
 *  traffic source. */
export function deriveSource(input: DeriveSourceInput): SourceInfo {
  let params: URLSearchParams;
  try {
    params = new URL(input.pageUrl).searchParams;
  } catch {
    params = new URLSearchParams();
  }

  const clickIds = extractClickIds(params);
  const clickIdKey = firstClickId(clickIds);

  let referrerHostname: string | null = null;
  let referrerUrl: string | null = null;

  if (input.referrerUrl) {
    try {
      const parsed = new URL(input.referrerUrl);
      const bare = bareHost(parsed.hostname);
      const ignored = new Set(
        [input.siteDomain, ...(input.ignoredReferrerDomains ?? [])].map((d) =>
          bareHost(d)
        )
      );

      if (!ignored.has(bare)) {
        referrerHostname = bare;
        referrerUrl = input.referrerUrl;
      }
    } catch {
      // Unparsable referrer is the same as no referrer.
    }
  }

  const utmSource = trim(params.get("utm_source"));
  const utmMedium = trim(params.get("utm_medium"));
  const utmCampaign = trim(params.get("utm_campaign"));
  const utmTerm = trim(params.get("utm_term"));
  const utmContent = trim(params.get("utm_content"));

  const altRef = trim(params.get("ref"));
  const altSource = trim(params.get("source"));
  const altVia = trim(params.get("via"));

  let source: string;
  let medium: string;
  const campaign = utmCampaign;
  const term = utmTerm;
  const content = utmContent;

  if (utmSource) {
    // Priority 1: explicit UTM. Medium defaults to "referral" rather than
    // guessing, so an incomplete UTM link (source but no medium) still
    // reports honestly instead of inventing a value.
    source = utmSource;
    medium = utmMedium ?? "referral";
  } else if (altSource || altRef || altVia) {
    // Priority 2: supported alt tracking parameters.
    source = altSource ?? altRef ?? altVia ?? "unknown";
    medium = "referral";
  } else if (clickIdKey) {
    // Priority 3: advertising click identifiers.
    source = CLICK_ID_SOURCE[clickIdKey];
    medium = "paid";
  } else if (referrerHostname) {
    // Priority 4: external referrer.
    if (SEARCH_ENGINE_HOSTNAMES.test(referrerHostname)) {
      source = referrerHostname;
      medium = "organic";
    } else if (SOCIAL_HOSTNAMES.test(referrerHostname)) {
      source = referrerHostname;
      medium = "social";
    } else {
      source = referrerHostname;
      medium = "referral";
    }
  } else {
    // Priority 5: direct.
    source = "direct";
    medium = "none";
  }

  const channel = classifyChannel({
    source,
    medium,
    hasClickId: clickIdKey !== null,
    referrerHostname,
  });

  return {
    source,
    medium,
    campaign,
    term,
    content,
    channel,
    referrerHostname,
    referrerUrl,
    clickIds,
    raw: {
      utmSource,
      utmMedium,
      utmCampaign,
      utmTerm,
      utmContent,
      ref: altRef,
      altSource,
      via: altVia,
    },
  };
}

export function deriveAttribution(input: DeriveSourceInput): AttributionSnapshot {
  const sourceInfo = deriveSource(input);

  let landingPath = "/";
  try {
    landingPath = new URL(input.pageUrl).pathname || "/";
  } catch {
    // Unparsable page URL: keep the default "/" rather than failing capture.
  }

  return {
    ...sourceInfo,
    landingUrl: input.pageUrl,
    landingPath,
  };
}
