/**
 * Throwaway spike. Delete once findings are recorded.
 * Findings: docs/spikes/2026-08-25-external-apis.md -> "## Google Play"
 *
 * Run: npx tsx scripts/spikes/google-play.ts
 *
 * NOTE: this repo's .env.local has NO FIRECRAWL_API_KEY. The probes recorded in
 * the spike doc were executed through the Firecrawl MCP server (which carries
 * its own credentials) using exactly the request shape below. Supply a key to
 * reproduce them against the REST API directly.
 */

const KEY = process.env.FIRECRAWL_API_KEY;

const SEARCH_URL = (term: string) =>
  `https://play.google.com/store/search?q=${encodeURIComponent(term)}&c=apps`;

const DETAIL_URL = (packageId: string) =>
  `https://play.google.com/store/apps/details?id=${encodeURIComponent(packageId)}`;

/**
 * v2 note: structured extraction is declared as an OBJECT inside `formats`
 * (`{ type: "json", prompt, schema }`). The v1-style top-level `jsonOptions`
 * key is rejected with HTTP 400 "Unrecognized key in body".
 */
type ScrapeFormat = string | { type: "json"; prompt: string; schema: Record<string, unknown> };

type ScrapeBody = {
  url: string;
  formats: ScrapeFormat[];
  onlyMainContent?: boolean;
};

async function scrape(label: string, body: ScrapeBody): Promise<void> {
  const res = await fetch("https://api.firecrawl.dev/v2/scrape", {
    method: "POST",
    headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const json: unknown = await res.json();
  console.log(`\n=== ${label} -> HTTP ${res.status} ===`);
  console.log(JSON.stringify(json).slice(0, 3000));
}

// The five signals the scoring rollup needs, as a Firecrawl JSON schema.
const SIGNAL_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    developer: { type: "string" },
    ratingAverage: { type: "number" },
    ratingCount: { type: "string" },
    installBand: { type: "string" },
    updatedOn: { type: "string" },
  },
  required: ["title", "developer"],
};

async function main(): Promise<void> {
  if (!KEY) {
    console.error(
      "FIRECRAWL_API_KEY is not set. Add it to .env.local (or run the probes " +
        "through the Firecrawl MCP server, which is how the recorded findings " +
        "were produced).",
    );
    process.exitCode = 1;
    return;
  }

  // Probe 1: search results page. Yields title + developer only. Not sufficient.
  await scrape("search/slack (markdown)", {
    url: SEARCH_URL("slack"),
    formats: ["markdown"],
    onlyMainContent: true,
  });

  // Probe 2: app detail page as markdown. Carries all five signals.
  await scrape("detail/com.Slack (markdown)", {
    url: DETAIL_URL("com.Slack"),
    formats: ["markdown"],
    onlyMainContent: true,
  });

  // Probe 3: same page via structured JSON extraction (production shape).
  await scrape("detail/com.Slack (json)", {
    url: DETAIL_URL("com.Slack"),
    formats: [
      {
        type: "json",
        prompt:
          "Extract the app's title, developer name, rating average (numeric), " +
          "rating/review count as displayed, install band as displayed, and the " +
          "'Updated on' date.",
        schema: SIGNAL_SCHEMA,
      },
    ],
  });

  // Probe 4: unknown/delisted package id, to confirm 404 handling.
  await scrape("detail/unknown-package (markdown)", {
    url: DETAIL_URL("com.saasname.doesnotexist12345"),
    formats: ["markdown"],
    onlyMainContent: true,
  });
}

void main();

export {};
