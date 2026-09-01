import type { CategorySlug } from "@/libs/trends/types";

/** Search/query terms per category, used by connectors that need a query
 *  (GitHub, Stack Exchange, DataForSEO) rather than a firehose (HN, RSS).
 *  Hand-picked at launch; expanding this list is the cheapest way to widen
 *  coverage without adding a new connector. */
export const CATEGORY_SEED_QUERIES: Record<CategorySlug, string[]> = {
  ai: ["artificial intelligence", "llm agent", "machine learning"],
  saas: ["saas", "b2b software"],
  "mobile-apps": ["mobile app", "ios app", "android app"],
  "dev-tools": ["developer tools", "cli tool"],
  startups: ["startup", "indie hacker"],
  productivity: ["productivity tool", "workflow automation"],
  marketing: ["marketing automation", "growth tool"],
  "creator-economy": ["creator tools", "content creator"],
  ecommerce: ["ecommerce", "online store"],
  "consumer-tech": ["consumer tech", "gadget"],
  communities: ["community platform", "online community"],
  "future-of-work": ["remote work", "future of work"],
};
