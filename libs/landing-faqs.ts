import config from "@/config";

/** Single source of truth for the landing FAQ. The page renders it, and the
 *  JSON-LD publishes it, so the two can never drift. */
export type Faq = { question: string; answer: string };

export const LANDING_FAQS: Faq[] = [
  {
    question: "What does one credit buy?",
    answer:
      "One candidate name, checked against every source: domain registries for .com, .io, .ai, .dev and .app, the US trademark register, the App Store, Google Play, GitHub, X, LinkedIn, and web search. Generating candidate names from your idea is free — you only spend credits when you check one.",
  },
  {
    question: "Is this legal advice?",
    answer:
      "No. The trademark check is a screening signal: it tells you whether a live US mark matching the name is on the register, with a link to the record. It does not clear a class, cover other jurisdictions, or replace a trademark attorney. Use it to eliminate obvious problems before you pay someone to look at the rest.",
  },
  {
    question: "How accurate is domain availability?",
    answer:
      "Domain answers come from the registries' own RDAP servers, not a reseller. If a registry cannot be reached, the result is reported as unknown rather than guessed as available. Availability changes minute to minute, so register anything you care about the same day you check it.",
  },
  {
    question: "Why aren't Instagram and TikTok checked?",
    answer:
      "Because they answer identically for a taken handle and a name that has never existed, so a check there cannot tell you anything. We only report platforms where the response genuinely distinguishes the two, and mark everything else as unknown rather than inventing a result.",
  },
  {
    question: "Do credits expire?",
    answer:
      "No. Credits are bought in one-time packs, never expire, and nothing renews. There is no subscription to cancel. If a check fails on our side, the credit for that name goes back to your balance.",
  },
  {
    question: "Who can see the ideas I type in?",
    answer:
      "You, and nobody else. Reports are readable only by your own account — enforced by the database, not just by our code — and they stay private until you choose to share one. We do not sell your ideas or use them to train anything. Checking a name does mean sending that name to the registries, registers, stores and search engines being checked, and generating names sends your idea description to the model that writes them; every provider that receives anything is listed on our Confidentiality page, and our NDA covers the whole lot in writing.",
  },
  {
    question: "Can I share a report?",
    answer:
      "Yes, and only if you choose to. Reports are private by default; sharing is opt-in per report and generates a link you can revoke. Shared pages are marked noindex so they stay out of search results.",
  },
  {
    question: "What do I get for free?",
    answer: `Signing up grants ${config.credits.signupGrant} credits — enough to run a real report on a shortlist before deciding whether the product is worth paying for.`,
  },
];
