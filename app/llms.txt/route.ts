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

${config.appName} answers one question: what is gaining momentum right now that
I should know about? It ingests signals from nine public sources, clusters
related activity into named topics, scores each topic on momentum and
cross-source confirmation, and serves a personalised feed of the result.

## Sources

- Hacker News — launches and discussion.
- GitHub — newly created repositories and star velocity.
- npm — JavaScript package publication and popularity.
- PyPI — newly published Python packages.
- Curated publisher feeds — engineering blogs and changelogs.
- arXiv — new research in cs.AI, cs.CL and cs.LG.
- Hugging Face — model and dataset traction.
- Stack Overflow — developer questions, as an adoption-pain signal.
- Keyword search demand — search volume, competition and cost per click.

## How a trend is produced

1. Each connector runs on its own schedule and writes deduplicated signals.
2. Signals are embedded and clustered into topics by semantic similarity.
3. A nightly job snapshots each topic's daily activity and scores it on
   momentum, cross-source confirmation and sustained growth.
4. Each topic is assigned a stage: early signal, emerging, accelerating,
   established, or cooling.
5. A one-sentence summary is generated from the stored evidence titles only.

## What it does not claim

- Scores are arithmetic over observed public signals, not predictions. A high
  momentum reading describes what has already happened, not what will.
- A topic confirmed by a single source stays at low confidence and is labelled
  as such. Cross-source agreement is the thing being measured.
- Summaries are generated from evidence titles and are always shown with links
  to that evidence. No quantitative claim is displayed without its source.
- Coverage is limited to the nine sources above. Absence from the feed is not
  evidence that something is not happening.
- Search demand figures are supplied by a third-party keyword provider and
  reflect its estimates, not measured traffic.

## Pricing

The Discover feed is free to any signed-in account while in beta. There is no
card required and no paywalled feed.

## Confidentiality

Accounts, interests, follows and hidden topics are readable only by the account
that created them, enforced by the database below the application rather than by
application code. Every category of recipient is listed at
${siteUrl}/confidentiality, and a standing NDA is published at ${siteUrl}/nda.

## Pages

- [Home](${siteUrl}/): what it does, the sources, how trends are scored, FAQ.
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
