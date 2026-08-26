import config from "@/config";
import { siteUrl } from "@/libs/seo";
import { getCreditPacks } from "@/libs/credits/packs";

/**
 * JSON-LD for the landing page.
 *
 * This is the machine-readable copy of what the page says in prose. An agent
 * evaluating the product — or a search engine building a rich result — should
 * be able to answer "what is it, what does it check, what does it cost" from
 * this block without parsing the DOM.
 */
export function renderSchemaTags(faqs: Array<{ question: string; answer: string }> = []) {
  const packs = getCreditPacks();

  const graph: Record<string, unknown>[] = [
    {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      name: config.appName,
      description: config.appDescription,
      url: siteUrl,
      publisher: { "@id": `${siteUrl}/#organization` },
    },
    {
      "@type": "Organization",
      "@id": `${siteUrl}/#organization`,
      name: config.appName,
      url: siteUrl,
      logo: `${siteUrl}${config.brand.logo}`,
      email: config.supportEmail,
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${siteUrl}/#software`,
      name: config.appName,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: siteUrl,
      description: config.appDescription,
      featureList: [
        "Generate SaaS name candidates from a product description",
        "Domain availability across .com, .io, .ai, .dev and .app via RDAP",
        "US trademark screening against live USPTO wordmarks",
        "Apple App Store name collision check",
        "Google Play name collision check",
        "GitHub, X and LinkedIn handle availability",
        "Web search presence for the exact name",
        "Per-name verdict of clear, contested or blocked, with a score",
        "Shareable, revocable read-only reports",
      ],
      // Priced from Paddle at render time; omitted rather than guessed when a
      // pack has no configured price.
      offers: packs.map((pack) => ({
        "@type": "Offer",
        name: `${pack.name} — ${pack.credits} credits`,
        description: pack.description,
        category: "One-time credit pack",
        url: `${siteUrl}/#pricing`,
      })),
    },
  ];

  if (faqs.length > 0) {
    graph.push({
      "@type": "FAQPage",
      "@id": `${siteUrl}/#faq`,
      mainEntity: faqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: { "@type": "Answer", text: faq.answer },
      })),
    });
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({ "@context": "https://schema.org", "@graph": graph }),
      }}
    />
  );
}
