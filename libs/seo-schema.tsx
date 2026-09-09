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
        "One script tag install, no configuration",
        "Cookieless visitor tracking with no consent banner required",
        "Live visitor count updated in real time",
        "Referrer and traffic source breakdown",
        "Country-level visitor location",
        "Embeddable live-visitors badge for any site",
      ],
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
        description: "Free while in beta.",
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

/** JSON-LD for a single blog post — the machine-readable version of the
 *  title/author/date already on the page, so a post can surface as a rich
 *  result instead of a bare blue link. */
export function renderBlogPostSchema(article: {
  slug: string;
  title: string;
  description: string;
  author: string;
  publishedAt: string;
}) {
  const url = `${siteUrl}/blog/${article.slug}`;

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          "@id": `${url}/#article`,
          headline: article.title,
          description: article.description,
          image: `${siteUrl}${config.brand.logo}`,
          datePublished: article.publishedAt,
          author: { "@type": "Organization", name: article.author, url: siteUrl },
          publisher: { "@id": `${siteUrl}/#organization` },
          mainEntityOfPage: { "@type": "WebPage", "@id": url },
        }),
      }}
    />
  );
}
