import config from "@/config";
import { siteUrl } from "@/libs/seo";
import { getCreditPacks } from "@/libs/credits/packs";
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
  const packs = getCreditPacks();

  const body = `# ${config.appName}

> ${config.appDescription}

${config.appName} answers one question: is this name actually free to use?
Describe a product idea and it writes candidate names, then checks each name
against six independent sources and returns a per-name verdict with links to
the evidence behind every signal.

## What it checks, per name

- Domain availability for .com, .io, .ai, .dev and .app, read from the
  registries' own RDAP servers rather than a reseller.
- Live US trademark records for the exact wordmark, from the USPTO.
- Existing apps on the Apple App Store.
- Existing listings on Google Play.
- Handle availability on GitHub, X and LinkedIn.
- Web search presence for the exact phrase.

That is 12 outbound lookups per name. Signals roll up into one verdict per
name: clear, contested, blocked, or unknown.

## What it does not claim

- It is not legal advice, and not a trademark clearance opinion. The trademark
  check is a screening signal covering live US wordmarks only.
- A source that could not be reached is reported as unknown. Unknown never
  means available, and an unknown can never produce a "clear" verdict.
- Instagram, TikTok and similar are not checked, because they answer
  identically for a taken handle and one that never existed, so a check there
  would carry no information.
- Domain availability moves minute to minute. A result is true when read.

## Pricing

One credit checks one name across all six sources. Generating candidate names
is free. Credits are sold in one-time packs, never expire, and nothing renews.
${config.credits.signupGrant} credits are granted on signup.

${packs
  .map((pack) => `- ${pack.name}: ${pack.credits} credits. ${pack.description}`)
  .join("\n")}

Live prices are shown at ${siteUrl}/#pricing and charged by Paddle as merchant
of record.

## Confidentiality

Reports are readable only by the account that created them, enforced by
row-level security in Postgres. Sharing is opt-in per report, revocable, and
noindexed. Ideas are never sold or used to train models. Every third party that
receives any data is listed at ${siteUrl}/confidentiality, and a standing NDA is
published at ${siteUrl}/nda.

## Pages

- [Home](${siteUrl}/): what it does, how it works, pricing, FAQ.
- [Confidentiality](${siteUrl}/confidentiality): every provider that receives data, and what each receives.
- [NDA](${siteUrl}/nda): standing confidentiality undertaking, effective on use.
- [Privacy policy](${siteUrl}/privacy-policy)
- [Terms](${siteUrl}/tos)
- [Blog](${siteUrl}/blog)

Everything under /dashboard requires an account and is private to that account.
It is not crawlable and not useful to an unauthenticated agent.

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
