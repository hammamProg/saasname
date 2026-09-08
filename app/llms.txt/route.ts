import config from "@/config";
import { siteUrl } from "@/libs/seo";
import { LANDING_FAQS } from "@/libs/landing-faqs";

/**
 * `/llms.txt` — a machine-readable summary of the product, following the
 * llmstxt.org convention.
 *
 * An agent landing here should be able to decide whether this service answers
 * its user's question, what it costs, and what it deliberately does not claim,
 * without rendering a marketing page. Everything is derived from config or from
 * the same data the page renders, so it cannot drift into being a second,
 * staler description of the product.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const body = `# ${config.appName}

> ${config.appDescription}

${config.appName} is cookieless website analytics. Add one script tag and see
visitors, referrers, countries, devices and who is on the site right now,
without asking the visitor's browser for consent first.

## How identity works

- A visitor is identified by a keyed hash of IP address, user agent and the
  tracked domain, salted with a value that rotates daily and is destroyed
  after 48 hours.
- Nothing is written to or read from the visitor's device — no cookies, no
  localStorage, no fingerprinting beyond headers already sent on every
  request.
- Because no state lives on the visitor's device, there is nothing there to
  ask consent for.

## What it reports

- Unique visitors and pageviews over time, deduplicated by session rather
  than counted per pageview.
- Who is on the site in roughly the last 30 minutes.
- Referrers split into channel, direct traffic and campaign, plus top pages,
  countries, browsers and devices.
- Bounce rate and session duration.

## Install

One script tag, generated per site with a real site id. Ready-made variants
exist for plain HTML, Next.js and WordPress, plus a single natural-language
prompt for AI coding agents (Cursor, Claude Code, Codex, and similar) that
lets the agent find the right file in a project and add the tag itself.

## What it does not claim

- Visitor counts are anonymous, not merely pseudonymous: the salt that
  produces them is destroyed after 48 hours, after which the identifier
  cannot be reversed or re-linked, including by us.
- The same person on two different devices, or behind a shared/rotating IP,
  can register as more than one visitor. This is the standard tradeoff of not
  using cookies, not a bug.
- This page is not legal advice. Whether cookieless analytics satisfies a
  given jurisdiction's requirements is for the site owner to confirm.

## Pricing

Free to any signed-in account while the product is in beta. No card is
required. Pricing will be announced before beta ends, with notice.

## Pages

- [Home](${siteUrl}/): what it does, how identity works, install, FAQ.
- [Privacy policy](${siteUrl}/privacy-policy)
- [Terms](${siteUrl}/tos)

Everything under /dashboard requires an account and is private to that
account. It is not crawlable and not useful to an unauthenticated agent.

## Frequently asked

${LANDING_FAQS.map((faq) => `### ${faq.question}\n\n${faq.answer}`).join("\n\n")}

## Contact

${config.supportEmail}
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600",
    },
  });
}
