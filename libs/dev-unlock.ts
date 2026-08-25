/**
 * Development-only paywall bypass.
 *
 * Set DEV_UNLOCK_PAYMENTS=true in .env.local to treat every signed-in user as
 * having a paid subscription, so gated surfaces can be exercised without a real
 * Paddle checkout.
 *
 * Double-gated on purpose: the flag is ignored outright in production builds,
 * so shipping it set is inert rather than a billing hole.
 */
export function isPaywallBypassEnabled(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  return process.env.DEV_UNLOCK_PAYMENTS === "true";
}
