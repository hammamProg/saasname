import config from "@/config";
import { siteUrl } from "@/libs/seo";

/** JSON-LD structured data for rich snippets — add to marketing pages */
export function renderSchemaTags() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: config.appName,
    description: config.appDescription,
    url: siteUrl,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
