import { normalizeName } from "@/libs/names/normalize";
import {
  ProbeError,
  type PlatformProbe,
  type ProbeContext,
  type ProbeResult,
  type ProbeSignals,
} from "@/libs/probes/types";

const SCRAPE_URL = "https://api.firecrawl.dev/v2/scrape";

function redact(text: string, key: string): string {
  return key ? text.split(key).join("[redacted]") : text;
}

/** Google Play has no free official search API, so this scrapes the store
 *  search page through Firecrawl.
 *
 *  The markdown path is used deliberately: the spike measured 1 Firecrawl
 *  credit for markdown versus 5 for structured extraction, for signals we can
 *  get from the text either way. */
export const googlePlayProbe: PlatformProbe = {
  id: "google-play",
  tier: "best_effort",
  // Scraping the Play search page through Firecrawl was measured at ~1s warm
  // but timed out at 20s on a cold run. It is best-effort, so a timeout only
  // costs this one signal -- but the call is paid for either way, so give it
  // room to actually finish.
  timeoutMs: 30_000,

  async run(name: string, ctx: ProbeContext): Promise<ProbeResult> {
    const apiKey = process.env.FIRECRAWL_API_KEY?.trim();

    if (!apiKey) {
      throw new ProbeError("FIRECRAWL_API_KEY is not configured");
    }

    const target = `https://play.google.com/store/search?q=${encodeURIComponent(name)}&c=apps`;

    let body: {
      success?: boolean;
      error?: string;
      data?: { markdown?: string; metadata?: { statusCode?: number } };
    };

    try {
      const response = await fetch(SCRAPE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ url: target, formats: ["markdown"] }),
        signal: ctx.signal,
      });

      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        throw new ProbeError(
          `Firecrawl scrape returned ${response.status}: ${redact(detail, apiKey).slice(0, 200)}`,
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

    if (body.success === false) {
      throw new ProbeError(
        `Firecrawl scrape failed: ${redact(body.error ?? "unknown", apiKey)}`
      );
    }

    // The spike found Firecrawl returns 200 with a body even when the upstream
    // page 404s. The caller MUST check the upstream status, or a missing page
    // reads as an empty result set.
    const upstreamStatus = body.data?.metadata?.statusCode;

    if (upstreamStatus !== 200) {
      throw new ProbeError(
        `Google Play returned ${upstreamStatus ?? "no status"}`
      );
    }

    const markdown = body.data?.markdown ?? "";
    const target_ = normalizeName(name);

    // Play renders each result as a link whose text is the app title.
    const titles = [...markdown.matchAll(/\[([^\]\n]{2,60})\]\(/g)]
      .map((m) => m[1].trim())
      .filter(Boolean);

    const exact = titles.find((t) => {
      if (normalizeName(t) === target_) return true;
      const lead = t.split(/[:–—\-|]/)[0];
      return !!lead && normalizeName(lead) === target_;
    });

    const signals: ProbeSignals = {
      resultCount: titles.length,
      exactMatch: !!exact,
    };

    if (exact) {
      signals.topTitle = exact;
    }

    return { signals, evidenceUrl: target };
  },
};
