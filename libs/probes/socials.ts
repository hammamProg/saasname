import { normalizeName } from "@/libs/names/normalize";
import {
  ProbeError,
  type PlatformProbe,
  type ProbeContext,
  type ProbeResult,
  type ProbeSignals,
} from "@/libs/probes/types";

/** A desktop UA is required; the default fetch agent is more likely to be
 *  challenged by these hosts. */
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

/** Only platforms where a 404 genuinely distinguishes a free handle.
 *  Instagram and TikTok are deliberately absent: both return 200 with a
 *  byte-identical wall for existing and non-existent handles, so neither can
 *  answer the question, and Firecrawl refuses both domains. */
export const SOCIAL_PLATFORMS = [
  { key: "github", url: (handle: string) => `https://github.com/${handle}` },
  { key: "x", url: (handle: string) => `https://x.com/${handle}` },
  {
    key: "linkedin",
    url: (handle: string) => `https://www.linkedin.com/company/${handle}`,
  },
] as const;

async function checkHandle(
  url: string,
  signal?: AbortSignal
): Promise<"taken" | "available" | "unknown"> {
  try {
    const response = await fetch(url, {
      method: "GET",
      // LinkedIn answers 301 for alias handles (/company/slack ->
      // /company/tiny-spec-inc), which still means taken. Following the
      // redirect would lose that signal.
      redirect: "manual",
      headers: { "User-Agent": USER_AGENT },
      signal,
    });

    if (response.status === 404) return "available";
    if (response.status >= 200 && response.status < 400) return "taken";

    // 403, 429, 5xx: we were blocked or throttled, not told the handle is free.
    return "unknown";
  } catch {
    return "unknown";
  }
}

/** Handle availability on GitHub, X and LinkedIn.
 *
 *  Best-effort by design. These are unofficial endpoints that can change
 *  without notice, so a failure degrades that one platform to `unknown` and
 *  never reports `available`. A false "available" is the worst outcome this
 *  probe can produce. */
export const socialsProbe: PlatformProbe = {
  id: "socials",
  tier: "best_effort",
  timeoutMs: 12_000,

  async run(name: string, ctx: ProbeContext): Promise<ProbeResult> {
    const handle = normalizeName(name);

    if (!handle) {
      throw new ProbeError(`Name does not normalize to a handle: ${name}`);
    }

    const results = await Promise.all(
      SOCIAL_PLATFORMS.map(async (platform) => ({
        key: platform.key,
        state: await checkHandle(platform.url(handle), ctx.signal),
      }))
    );

    const signals: ProbeSignals = { handle };

    for (const { key, state } of results) {
      signals[key] = state;
    }

    if (results.every((r) => r.state === "unknown")) {
      throw new ProbeError("No social platform could be reached");
    }

    return { signals };
  },
};
