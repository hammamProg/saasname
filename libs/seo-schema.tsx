import config from "@/config";
import { siteUrl } from "@/libs/seo";

/**
 * JSON-LD for the landing page.
 *
 * This is the machine-readable copy of what the page says in prose. An agent
 * evaluating the product — or a search engine building a rich result — should
 * be able to answer "what is it, what does it check, what does it cost" from
 * this block without parsing the DOM.
 */
export function renderSchemaTags(faqs: Array<{ question: string; answer: string }> = []) {
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
        "Daily trend signals from Hacker News, GitHub, npm and PyPI",
        "Research and model traction from arXiv and Hugging Face",
        "Developer adoption pain from Stack Overflow questions",
        "Keyword search demand as a confirming signal",
        "Related signals clustered into named topics automatically",
        "Momentum, confidence and lifecycle stage scored nightly",
        "Personalised Discover feed with follow and hide controls",
        "An unfiltered Rising Fast column to counter filter bubbles",
        "Every trend linked to the source signals behind its score",
      ],
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
        description: "Discover feed, free for any signed-in account while in beta.",
        url: siteUrl,
      },
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
