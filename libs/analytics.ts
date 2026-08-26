import { sendGAEvent } from "@next/third-parties/google";

/** Values GA4 accepts as event parameters. */
type EventParams = Record<string, string | number | boolean>;

/** Fires a GA4 event, or does nothing when the tag was never loaded.
 *
 *  `NEXT_PUBLIC_GA_ID` is unset in development and preview, so `sendGAEvent`
 *  would queue into a dataLayer nobody reads. Guarding here keeps every call
 *  site free of environment checks. */
function track(name: string, params: EventParams = {}): void {
  if (typeof window === "undefined") return;
  if (!process.env.NEXT_PUBLIC_GA_ID?.trim()) return;

  sendGAEvent("event", name, params);
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
  track("purchase", {});
}
