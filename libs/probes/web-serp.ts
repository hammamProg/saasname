import { normalizeName } from "@/libs/names/normalize";
import { SUPPORTED_TLDS } from "@/libs/probes/rdap-tlds";
import {
  ProbeError,
  type PlatformProbe,
  type ProbeContext,
  type ProbeResult,
  type ProbeSignals,
} from "@/libs/probes/types";

const SEARCH_URL = "https://api.firecrawl.dev/v2/search";
const LIMIT = 10;

type WebResult = { title?: string; url?: string };

function redact(text: string, key: string): string {
  return key ? text.split(key).join("[redacted]") : text;
}

/** Does any result URL sit on the exact-name domain, rather than merely
 *  containing the name? `nameloopstudios.com` is not `nameloop.com`. */
function hasExactDomain(urls: string[], normalized: string): boolean {
  const wanted = new Set(SUPPORTED_TLDS.map((tld) => `${normalized}.${tld}`));

  return urls.some((raw) => {
    try {
      const host = new URL(raw).hostname.toLowerCase().replace(/^www\./, "");
      return wanted.has(host);
    } catch {
      return false;
    }
  });
}

/** Web presence via Firecrawl search.
 *
 *  Searches the quoted name so the engine returns exact-phrase hits rather
 *  than loosely related pages. Emits counts and whether the exact-name domain
 *  is already live; deciding what that means is the Phase 4 rollup's job. */
export const webSerpProbe: PlatformProbe = {
  id: "web-serp",
  tier: "core",
  // Measured ~5.5s on a live query; 8s leaves no headroom.
  timeoutMs: 15_000,

  async run(name: string, ctx: ProbeContext): Promise<ProbeResult> {
    const apiKey = process.env.FIRECRAWL_API_KEY?.trim();

    if (!apiKey) {
      throw new ProbeError("FIRECRAWL_API_KEY is not configured");
    }

    let body: { success?: boolean; data?: { web?: WebResult[] }; error?: string };

    try {
      const response = await fetch(SEARCH_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          query: `"${name}"`,
          limit: LIMIT,
          sources: ["web"],
        }),
        signal: ctx.signal,
      });

      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        throw new ProbeError(
          `Firecrawl search returned ${response.status}: ${redact(detail, apiKey).slice(0, 200)}`,
          response.status
        );
      }

      body = (await response.json()) as typeof body;
    } catch (error) {
      if (error instanceof ProbeError) throw error;
      throw new ProbeError(
        redact(error instanceof Error ? error.message : String(error), apiKey)
      );
    }

    // Firecrawl can report failure inside a 200.
    if (body.success === false) {
      throw new ProbeError(
        `Firecrawl search failed: ${redact(body.error ?? "unknown", apiKey)}`
      );
    }

    const results = body.data?.web ?? [];
    const normalized = normalizeName(name);
    const urls = results.map((r) => r.url ?? "").filter(Boolean);

    const signals: ProbeSignals = {
      resultCount: results.length,
      exactTitleMatches: results.filter(
        (r) => normalizeName(r.title ?? "") === normalized
      ).length,
      hasExactDomain: hasExactDomain(urls, normalized),
      topUrl: urls[0] ?? null,
    };

    return { signals, evidenceUrl: urls[0] };
  },
};
