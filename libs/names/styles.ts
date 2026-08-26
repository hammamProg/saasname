/** The naming directions a user can steer generation toward.
 *
 *  One catalogue feeds both the prompt and the UI. Splitting them would let the
 *  cards drift away from what the model is actually told, which is the exact
 *  failure this feature exists to fix.
 *
 *  NOTE: `examples` are user-facing claims about how real companies named
 *  themselves. They are illustrative, chosen because they read clearly, and
 *  several are arguable. Treat them as copy to be reviewed, not as fact. */

export type NameStyleId =
  | "invented"
  | "compound"
  | "real-word"
  | "literal"
  | "playful"
  | "mixed";

export type NameStyle = {
  id: NameStyleId;
  label: string;
  /** Shown under the label so the choice is concrete rather than abstract. */
  examples: string[];
  /** Injected verbatim into the generation prompt. Kept to one terse line —
   *  every token here is billed on every generation. */
  constraint: string;
};

/** Unconstrained generation: what the product did before styles existed.
 *  Keeping it reachable makes this feature additive rather than a replacement. */
export const DEFAULT_STYLE_ID: NameStyleId = "mixed";

export const NAME_STYLES: readonly NameStyle[] = [
  {
    id: "invented",
    label: "Invented",
    examples: ["Zapier", "Klaviyo"],
    constraint: "Coined words that are not real words. Must be pronounceable.",
  },
  {
    id: "compound",
    label: "Compound",
    examples: ["Dropbox", "Firebase"],
    constraint: "Two real words fused into one.",
  },
  {
    id: "real-word",
    label: "Real word",
    examples: ["Notion", "Stripe"],
    constraint: "An existing English word used metaphorically.",
  },
  {
    id: "literal",
    label: "Literal",
    examples: ["Calendly", "Formspree"],
    constraint: "States plainly what the product does.",
  },
  {
    id: "playful",
    label: "Playful",
    examples: ["Mailchimp", "Grammarly"],
    constraint: "Wordplay or an unexpected pairing. Memorable over serious.",
  },
  {
    id: "mixed",
    label: "Surprise me",
    examples: [],
    constraint: "Mix several naming styles across the batch.",
  },
] as const;

/** Looks up a style, degrading to {@link DEFAULT_STYLE_ID} rather than throwing.
 *
 *  A client can hold an id that has since been removed from the catalogue. That
 *  should cost the user a less specific batch, not a failed request. */
export function resolveStyle(id: NameStyleId | string | undefined): NameStyle {
  const match = NAME_STYLES.find((style) => style.id === id);
  if (match) return match;

  // The default is guaranteed present by the catalogue's own test suite.
  return NAME_STYLES.find((style) => style.id === DEFAULT_STYLE_ID)!;
}
