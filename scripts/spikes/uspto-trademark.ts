/**
 * Throwaway spike. Delete once findings are recorded in
 * docs/spikes/2026-08-25-external-apis.md.
 *
 * Run: npx tsx scripts/spikes/uspto-trademark.ts
 *
 * Question: does the USPTO Open Data Portal (the replacement for the
 * Developer Hub decommissioned 2026-06-05) expose a trademark *search*
 * endpoint? If not, is the public tmsearch.uspto.gov backend usable
 * server-side without auth?
 */

const KEY = process.env.USPTO_API_KEY;

/**
 * The ODP sits behind AWS API Gateway, which distinguishes the two failure
 * modes for us:
 *   401 {"message":"Unauthorized"}                -> route EXISTS, needs a key
 *   403 {"message":"Missing Authentication Token"} -> route DOES NOT EXIST
 * So we can map the surface without ever holding an API key.
 */
const ODP_CANDIDATES = [
  "https://api.uspto.gov/api/v1/trademark/applications/search",
  "https://api.uspto.gov/api/v1/trademarks/search",
  "https://api.uspto.gov/api/v1/trademark/search",
  "https://api.uspto.gov/api/v1/trademarks/applications/search",
  "https://api.uspto.gov/api/v1/trademark",
  "https://api.uspto.gov/api/v1/trademark/casedocuments/search",
  "https://api.uspto.gov/api/v1/tm/search",
  // Controls:
  "https://api.uspto.gov/api/v1/patent/applications/search", // known-good route
  "https://api.uspto.gov/api/v1/zzzz/nonexistent", // known-bad route
];

async function probeOdp(url: string) {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "X-API-KEY": KEY ?? "", "Content-Type": "application/json" },
      body: JSON.stringify({ q: "slack", pagination: { offset: 0, limit: 5 } }),
    });
    const text = await res.text();
    const verdict =
      res.status === 403 && text.includes("Missing Authentication Token")
        ? "ROUTE DOES NOT EXIST"
        : res.status === 401
          ? "route exists, needs API key"
          : res.status === 200
            ? "OK"
            : "?";
    console.log(`${res.status} [${verdict}] ${url}`);
    console.log(`     ${text.slice(0, 200)}`);
  } catch (err) {
    console.log(`ERROR ${url}:`, (err as Error).message);
  }
}

/**
 * Fallback: the public Trademark Search SPA (tmsearch.uspto.gov) is a static
 * Angular app on S3. Its backend base URL is published in plaintext at
 * https://tmsearch.uspto.gov/configuration.json as `serviceUrlSearchElastic`.
 * The endpoint accepts a raw Elasticsearch query DSL body and, as of this
 * spike, requires NO auth, NO cookie and NO AWS WAF token.
 */
const TMSEARCH_URL = "https://tmsearch.uspto.gov/prod-stage-v1-0-0/tmsearch";

/** WM = wordmark, PM = pseudo-mark. Mirrors what the SPA itself sends. */
function buildQuery(term: string, size = 5) {
  return {
    query: {
      bool: {
        must: [
          {
            bool: {
              should: [
                { match_phrase: { WM: { query: term, boost: 5 } } },
                { match: { WM: { query: term, boost: 2 } } },
                { match_phrase: { PM: { query: term, boost: 2 } } },
              ],
            },
          },
        ],
      },
    },
    size,
    from: 0,
    track_total_hits: true,
    _source: [
      "wordmark",
      "ownerName",
      "registrationId",
      "internationalClass",
      "filedDate",
      "registrationDate",
      "alive",
      "markType",
      "goodsAndServices",
    ],
    aggs: { alive: { terms: { field: "alive" } } },
  };
}

async function probeTmsearch(term: string) {
  const res = await fetch(TMSEARCH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildQuery(term)),
  });
  const text = await res.text();
  console.log(`${res.status} ${TMSEARCH_URL}  (term="${term}", no auth)`);
  console.log(`     ${text.slice(0, 400)}`);
}

async function main() {
  console.log("=== 1. USPTO Open Data Portal (api.uspto.gov) ===");
  for (const url of ODP_CANDIDATES) await probeOdp(url);

  console.log("\n=== 2. Public tmsearch backend (no auth) ===");
  await probeTmsearch("slack");
}

main();

export {};
