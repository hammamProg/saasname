import { sendGAEvent } from "@next/third-parties/google";
import posthog from "posthog-js";

/** Values GA4 accepts as event parameters. */
type EventParams = Record<string, string | number | boolean>;

/** Fires a GA4 event, or does nothing when the tag was never loaded.
 *
 *  The PostHog client is initialized only when its public configuration is
 *  available, and GA is optional. Guarding here keeps every call site free of
 *  environment checks. */
function track(name: string, params: EventParams = {}): void {
  if (typeof window === "undefined") return;

  // The properties are constrained to non-sensitive values at each call site.
  // Authenticated browser sessions are identified centrally in Providers.
  if (
    process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN?.trim() &&
    process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim()
  ) {
    posthog.capture(name, params);
  }

  if (process.env.NEXT_PUBLIC_GA_ID?.trim()) {
    sendGAEvent("event", name, params);
  }
}

/** PRIVACY: never pass a candidate name into any of these.
 *
 *  A name someone types is an unlaunched product idea. `/confidentiality` and
 *  `/nda` promise we treat it that way, and Google Analytics is a third party.
 *  Send the shape of the result — verdict, counts, lengths — never the string. */

export function trackDemoCheckRun(nameLength: number): void {
  track("demo_check_run", { name_length: nameLength });
}

export function trackDemoVerdictShown(worstVerdict: string): void {
  track("demo_verdict_shown", { verdict: worstVerdict });
}

export function trackDemoExampleClicked(): void {
  track("demo_example_clicked");
}

/** Which naming directions people actually pick, and whether the picker is
 *  used at all. The style id is a fixed catalogue value, never user text. */
export function trackGenerateStyleSelected(styleId: string): void {
  track("generate_style_selected", { style: styleId });
}

export function trackNameGenerationStarted(
  styleId: string,
  targetPlatform: string,
  isRegeneration: boolean
): void {
  track("name_generation_started", {
    style: styleId,
    target_platform: targetPlatform,
    is_regeneration: isRegeneration,
  });
}

export function trackNameGenerationCompleted(
  styleId: string,
  targetPlatform: string,
  candidateCount: number
): void {
  track("name_generation_completed", {
    style: styleId,
    target_platform: targetPlatform,
    candidate_count: candidateCount,
  });
}

export function trackNameCheckStarted(
  mode: "generate" | "check",
  targetPlatform: string,
  candidateCount: number
): void {
  track("name_check_started", {
    mode,
    target_platform: targetPlatform,
    candidate_count: candidateCount,
  });
}

export function trackSignUpStarted(method: "google" | "magic_link"): void {
  track("sign_up_started", { method });
}

export function trackPurchaseStarted(priceId: string, credits: number): void {
  track("purchase_started", { price_id: priceId, credits });
}

/** Fired when Paddle redirects back with `?checkout=success`.
 *
 *  This is "the customer completed checkout", not "payment settled" — the
 *  authoritative signal is the `transaction.completed` webhook, which runs
 *  server-side and cannot reach gtag. Treat this as a funnel marker and
 *  reconcile revenue against Paddle, not against GA. */
export function trackPurchaseCompleted(): void {
  track("purchase_completed");
}

export function trackReportSharingUpdated(isPublic: boolean): void {
  track("report_sharing_updated", { is_public: isPublic });
}

export function trackReportLinkCopied(): void {
  track("report_link_copied");
}

export function trackBillingPortalOpened(): void {
  track("billing_portal_opened");
}

export function trackWaitlistJoined(): void {
  track("waitlist_joined");
}

export function trackProfileUpdated(): void {
  track("profile_updated");
}

export function trackUserSignedOut(): void {
  track("user_signed_out");
}
