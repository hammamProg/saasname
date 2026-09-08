/** Validation for the new identity/attribution/goal collection endpoint.
 *
 *  Same policy as libs/webstats/payload.ts, which this deliberately mirrors
 *  rather than importing zod for: reject what cannot be interpreted,
 *  truncate what is merely too long. Short keys for the same reason — this
 *  is sent on every page view and event from every customer's site. */

export type CollectType = "page" | "track" | "goal" | "identify";

export type CollectPayload = {
  siteId: string;
  type: CollectType;
  visitorId: string;
  sessionId: string;
  userId: string | null;
  eventId: string;
  clientTimestamp: number;
  url: string;
  referrer: string | null;
  /** Event name for `track`, goal key for `goal`. Unused for `page`/`identify`. */
  name: string | null;
  /** Safe custom properties from track()/goal() calls. */
  properties: Record<string, unknown> | null;
  /** True when the SDK has decided this call starts a new session — only
   *  then is source captured, matching "on the first page of every session". */
  newSession: boolean;
};

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const MAX_URL = 2000;
const MAX_NAME = 120;
const MAX_USER_ID = 200;
/** Bytes, measured on the serialized JSON — a caller sending more than this
 *  in custom properties is either misusing the API or attaching something
 *  that was never meant to be analytics data. */
const MAX_PROPERTIES_BYTES = 4096;
const MAX_PROPERTY_KEYS = 40;

function text(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const clean = value.trim().slice(0, max);
  return clean || null;
}

function typeOf(raw: unknown): CollectType | null {
  if (raw === "page" || raw === "track" || raw === "goal" || raw === "identify") {
    return raw;
  }
  return null;
}

/** Keeps only JSON-primitive values one level deep. Custom properties are
 *  display data (`{ plan: "pro" }`), never nested objects a caller might use
 *  to smuggle something larger through. */
function safeProperties(raw: unknown): Record<string, unknown> | null {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null;

  const entries = Object.entries(raw as Record<string, unknown>).slice(
    0,
    MAX_PROPERTY_KEYS,
  );

  const out: Record<string, unknown> = {};
  for (const [key, value] of entries) {
    if (typeof key !== "string" || key.length > 100) continue;

    if (typeof value === "string") {
      out[key] = value.slice(0, 500);
    } else if (typeof value === "number" && Number.isFinite(value)) {
      out[key] = value;
    } else if (typeof value === "boolean" || value === null) {
      out[key] = value;
    }
    // Objects, arrays and functions are silently dropped rather than
    // rejecting the whole payload — a caller passing one bad value should
    // not lose the rest of an otherwise-useful event.
  }

  if (Buffer.byteLength(JSON.stringify(out), "utf8") > MAX_PROPERTIES_BYTES) {
    return null;
  }

  return out;
}

export function parseCollectPayload(body: string): CollectPayload | null {
  let raw: unknown;
  try {
    raw = JSON.parse(body);
  } catch {
    return null;
  }

  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null;
  const data = raw as Record<string, unknown>;

  const siteId = typeof data.s === "string" ? data.s.trim() : "";
  if (!UUID.test(siteId)) return null;

  const type = typeOf(data.t);
  if (!type) return null;

  const visitorId = typeof data.v === "string" ? data.v.trim() : "";
  if (!UUID.test(visitorId)) return null;

  const sessionId = typeof data.ss === "string" ? data.ss.trim() : "";
  if (!UUID.test(sessionId)) return null;

  const eventId = typeof data.e === "string" ? data.e.trim() : "";
  if (!UUID.test(eventId)) return null;

  const url = typeof data.url === "string" ? data.url.trim() : "";
  if (!url || url.length > MAX_URL) return null;

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
  } catch {
    return null;
  }

  const clientTimestamp =
    typeof data.ts === "number" && Number.isFinite(data.ts) ? data.ts : Date.now();

  return {
    siteId,
    type,
    visitorId,
    sessionId,
    userId: text(data.u, MAX_USER_ID),
    eventId,
    clientTimestamp,
    url,
    referrer: text(data.ref, MAX_URL),
    name: text(data.n, MAX_NAME),
    properties: safeProperties(data.p),
    newSession: data.new === true,
  };
}
