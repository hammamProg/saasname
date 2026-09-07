/** Single source of truth for the landing FAQ. The page renders it, the
 *  JSON-LD publishes it, and /llms.txt quotes it, so the three can never
 *  drift. Answers stay inside what the product actually does today — an FAQ
 *  that over-promises is the most expensive copy on the site. */
export type Faq = { question: string; answer: string };

export const LANDING_FAQS: Faq[] = [
  {
    question: "Does this use cookies?",
    answer:
      "No. Visitor identity is a daily-rotating salted hash of IP address, user agent and your domain — nothing is written to or read from the visitor's device. That's what makes a cookie banner unnecessary: there's nothing stored on their end to consent to.",
  },
  {
    question: "How do I install it?",
    answer:
      "Paste one script tag before the closing </head> tag. There are ready-made snippets for plain HTML, Next.js and WordPress, plus a prompt for AI coding agents (Cursor, Claude Code, Codex) that finds the right file in your project and adds it for you.",
  },
  {
    question: "How fast do visitors show up?",
    answer:
      "Within a couple of seconds of the first pageview. The install screen polls for your first event every two seconds and flips to \"Connected\" the moment one arrives — no waiting on a batch job.",
  },
  {
    question: "What do I actually see?",
    answer:
      "Visitors and pageviews over time, who's online right now, top pages, referrers broken into channel/direct/campaign instead of one \"unknown\" bucket, countries, browsers and devices, bounce rate and session duration.",
  },
  {
    question: "Is a visitor count actually unique, or is it pageviews?",
    answer:
      "Unique. Visitor counts are deduplicated by session — reloading a page or browsing five pages in one visit still counts as one visitor. Pageviews are reported separately, alongside it, not instead of it.",
  },
  {
    question: "Can I track more than one website?",
    answer:
      "Yes, and you can organize them into groups — client work in one section, personal projects in another — instead of one flat list once you're tracking more than a couple.",
  },
  {
    question: "What does it cost?",
    answer:
      "Nothing right now. The product is in beta: every account gets the full feature set free while it's being finished, with no card required. Pricing will be announced before beta ends, with notice.",
  },
  {
    question: "Is this GDPR-friendly?",
    answer:
      "It's built to be light on data by design: no cookies, no cross-site tracking, and the daily-rotating identity salt is destroyed after 48 hours, so once it's gone the identifier can't be reversed or re-linked even by us. That said, this isn't legal advice — check it against your own compliance requirements.",
  },
];
