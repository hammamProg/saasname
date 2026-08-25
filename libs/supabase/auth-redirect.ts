import config from "@/config";

/** Redirect target after Supabase OAuth or magic link completes. */
export function getAuthCallbackUrl(next?: string, origin?: string): string {
  const base = origin ?? (typeof window !== "undefined" ? window.location.origin : process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000");
  const destination = next ?? config.auth.callbackUrl;
  return `${base}/auth/callback?next=${encodeURIComponent(destination)}`;
}
