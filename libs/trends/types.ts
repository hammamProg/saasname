/** Matches the `source_type` check constraint in `signals`. */
export type SourceType =
  | "search"
  | "social"
  | "news"
  | "launch"
  | "app"
  | "review"
  | "code"
  | "commerce"
  | "research";

export const CATEGORY_SLUGS = [
  "ai",
  "saas",
  "mobile-apps",
  "dev-tools",
  "startups",
  "productivity",
  "marketing",
  "creator-economy",
  "ecommerce",
  "consumer-tech",
  "communities",
  "future-of-work",
] as const;

export type CategorySlug = (typeof CATEGORY_SLUGS)[number];

/** One piece of evidence from a connector, before dedupe/normalization
 *  assigns a content_hash. `categoryHint` is the connector's best guess at
 *  which category this belongs to; clustering uses it to seed a new topic's
 *  category, not to gate matching against existing topics. */
export interface RawSignal {
  sourceProvider: string;
  sourceType: SourceType;
  externalId: string;
  canonicalUrl: string;
  publishedAt: string;
  title: string;
  textExcerpt?: string;
  language?: string;
  countryOrRegion?: string;
  engagementMetrics?: Record<string, number>;
  rawMetrics?: Record<string, unknown>;
  categoryHint?: CategorySlug;
}

/** Every connector implements this. `id` matches the `source_provider`
 *  value written to `signals` and the env flag name
 *  (`INGEST_<ID upper snake>_ENABLED`). */
export interface Connector {
  id: string;
  fetchSignals(): Promise<RawSignal[]>;
}
