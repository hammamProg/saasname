import type { CategorySlug } from "@/libs/trends/types";

/** Hand-picked at launch, per the design doc. Each entry pairs a feed with
 *  the category its content is expected to fall under; the connector still
 *  runs through clustering, so a mis-tagged item just seeds a topic in the
 *  wrong category rather than breaking anything. */
export const RSS_FEEDS: ReadonlyArray<{ url: string; categoryHint: CategorySlug }> = [
  { url: "https://openai.com/blog/rss.xml", categoryHint: "ai" },
  { url: "https://www.anthropic.com/rss.xml", categoryHint: "ai" },
  { url: "https://vercel.com/atom", categoryHint: "dev-tools" },
  { url: "https://blog.cloudflare.com/rss/", categoryHint: "dev-tools" },
  { url: "https://stripe.com/blog/feed.rss", categoryHint: "saas" },
  { url: "https://www.saastr.com/feed/", categoryHint: "saas" },
  { url: "https://techcrunch.com/category/startups/feed/", categoryHint: "startups" },
  { url: "https://www.indiehackers.com/feed.rss", categoryHint: "startups" },
  { url: "https://blog.hubspot.com/marketing/rss.xml", categoryHint: "marketing" },
  { url: "https://shopify.engineering/blog.atom", categoryHint: "ecommerce" },
  { url: "https://github.blog/feed/", categoryHint: "dev-tools" },
  { url: "https://a16z.com/feed/", categoryHint: "startups" },
];
