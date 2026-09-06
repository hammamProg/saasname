/** Validation for the beacon body.
 *
 *  Keys are single letters because this is sent on every pageview from every
 *  customer's site — the payload is the one part of the product whose byte
 *  count is paid by someone else's users.
 *
 *  The policy throughout: reject what cannot be interpreted, truncate what is
 *  merely too long. A 300-character event name is a caller being sloppy and
 *  losing the event would hide real traffic; a non-http URL is a caller doing
 *  something we will not store. */

export type EventType = 1 | 2 | 3;

export type BeaconPayload = {
  siteId: string;
  url: string;
  referrer: string | null;
  title: string | null;
  screen: string | null;
  language: string | null;
  eventType: EventType;
  eventName: string | null;
  engagedMs: number | null;
};

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const SCREEN = /^\d{1,5}x\d{1,5}$/;

/** Plausible's cap, and generous: a URL longer than this is a tracking
 *  parameter dump, not a page someone reads. */
const MAX_URL = 2000;
const MAX_NAME = 120;
const MAX_TITLE = 500;

/** An hour. A tab left open overnight must not report as a night-long visit. */
const MAX_ENGAGED_MS = 3_600_000;

function text(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;

  const clean = value.trim().slice(0, max);
  return clean || null;
}

function eventTypeFor(raw: unknown): EventType {
  if (raw === "engagement") return 3;
  if (raw === "event") return 2;

  return 1;
}

/** Parse and validate a raw request body.
 *
 *  @returns the payload, or `null` when the body cannot be trusted. Callers
 *  answer success regardless — a rejected beacon must be indistinguishable
 *  from an accepted one so misbehaving clients do not retry in a loop. */
export function parsePayload(body: string): BeaconPayload | null {
  let raw: unknown;

  try {
    raw = JSON.parse(body);
  } catch {
    return null;
  }

  // Arrays are objects too, and would otherwise pass the property checks with
  // everything undefined.
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return null;
  }

  const data = raw as Record<string, unknown>;

  const siteId = typeof data.s === "string" ? data.s.trim() : "";
  if (!UUID.test(siteId)) return null;

  const url = typeof data.u === "string" ? data.u.trim() : "";
  if (!url || url.length > MAX_URL) return null;

  // Anything other than http(s) is not a page we can attribute: `file:` is a
  // local document and `javascript:` is someone probing.
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return null;
  }
  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    return null;
  }

  const screen = text(data.sc, 11);

  let engagedMs: number | null = null;
  if (typeof data.e === "number" && Number.isFinite(data.e) && data.e > 0) {
    engagedMs = Math.min(Math.round(data.e), MAX_ENGAGED_MS);
  }

  return {
    siteId,
    url,
    referrer: text(data.r, MAX_URL),
    title: text(data.ti, MAX_TITLE),
    screen: screen && SCREEN.test(screen) ? screen : null,
    language: text(data.l, 35),
    eventType: eventTypeFor(data.t),
    eventName: text(data.n, MAX_NAME),
    engagedMs,
  };
}
