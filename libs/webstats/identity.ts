/** Cookieless visitor identity.
 *
 *  Nothing is written to or read from the visitor's device, so ePrivacy Art.
 *  5(3) is never engaged and customers do not need a consent banner for this
 *  product. That claim only holds while the inputs stay as they are:
 *
 *      session = H(salt, ip || user-agent || site domain)
 *
 *  IP and User-Agent are headers the browser sends on every request anyway, so
 *  combining them is passive processing rather than "gaining access to
 *  information stored in terminal equipment". Every additional client-supplied
 *  dimension — screen size, timezone, fonts — moves this toward fingerprinting
 *  and weakens the argument. Do not add any.
 *
 *  The salt is 16 random bytes rotated daily and destroyed after 48 hours, so
 *  once it is gone the identifier cannot be reversed or re-linked even by us.
 *  That destruction is what makes the value anonymous rather than merely
 *  pseudonymous. Two salts are live at once so a session spanning a rotation
 *  resolves to one visitor instead of two.
 *
 *  Note this is deliberately NOT Umami's scheme, which derives its salt as
 *  `sha512(dateString)` — publicly computable, therefore no brute-force
 *  resistance — and rotates monthly by default, which is a month-stable device
 *  identifier and hard to call anonymous. */

import { createHash, createHmac } from "node:crypto";

/** How long one visit lasts before a new one begins.
 *
 *  Bucketed rather than idle-based: the visit id is derived from the session
 *  and the window the event falls into, so no per-beacon read is needed to
 *  decide whether the previous visit is still open. The cost is that a visit
 *  spanning a boundary splits in two rather than extending. Umami makes the
 *  same trade with hour-long buckets; 30 minutes matches the industry-standard
 *  session definition more closely. Revisit if visit counts look inflated. */
export const VISIT_WINDOW_MS = 30 * 60 * 1000;

export type IdentityInput = {
  ip: string;
  userAgent: string;
  /** The tracked site's domain, so the same person on two customers' sites is
   *  two unrelated visitors. Cross-site linkage is the thing this product is
   *  built not to do. */
  domain: string;
};

/** Format 16 bytes of digest as a UUID string, so it can live in a `uuid`
 *  column. The version and variant nibbles are not set — this is a hash, not
 *  an RFC 4122 identifier, and pretending otherwise would be misleading. */
function asUuid(digest: Buffer): string {
  const hex = digest.subarray(0, 16).toString("hex");

  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join("-");
}

/** Derive the per-day visitor identifier. Keyed HMAC rather than a plain hash
 *  of salt-then-value, so the salt cannot be attacked by length extension. */
export function deriveSessionId(salt: Buffer, input: IdentityInput): string {
  const mac = createHmac("sha256", salt);

  // Null-separated so ("ab", "c") and ("a", "bc") cannot collide.
  mac.update(input.ip);
  mac.update("\0");
  mac.update(input.userAgent);
  mac.update("\0");
  mac.update(input.domain.toLowerCase());

  return asUuid(mac.digest());
}

/** Derive the visit identifier for an event at a given time. */
export function deriveVisitId(sessionId: string, at: Date): string {
  const window = Math.floor(at.getTime() / VISIT_WINDOW_MS);

  return asUuid(
    createHash("sha256").update(`${sessionId}\0${window}`).digest(),
  );
}
