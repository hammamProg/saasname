/** The 30-minute inactivity window that ends a session.
 *
 *  Session lifecycle is decided client-side, in the SDK (`public/js/s.js`) —
 *  the server trusts whatever session_id it is sent and simply upserts it,
 *  the same way GA4 and most analytics SDKs work, because only the client
 *  knows about tab-level idle time. This constant and function exist so the
 *  threshold is documented and unit-testable in one place; the SDK embeds
 *  the same 30-minute value directly, since it cannot import from here. */

export const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

export function shouldStartNewSession(
  lastActivityAt: number,
  now: number = Date.now(),
): boolean {
  return now - lastActivityAt >= SESSION_TIMEOUT_MS;
}
