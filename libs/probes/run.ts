import { normalizeName } from "@/libs/names/normalize";
import { readCache, writeCache } from "@/libs/probes/cache";
import {
  ProbeError,
  type PlatformProbe,
  type ProbeResult,
  type ProbeSignals,
} from "@/libs/probes/types";

const DEFAULT_TIMEOUT_MS = 8_000;
const RETRY_BASE_MS = 200;

export type SettledCheck = {
  platform: string;
  status: "ok" | "failed";
  signals: ProbeSignals;
  evidenceUrl?: string;
  error?: string;
  /** True when the result came from platform_cache and cost no API call. */
  cached: boolean;
};

function isRetryable(error: unknown): boolean {
  // 5xx is worth one more attempt. A 4xx is a definite answer -- retrying a
  // bad request or a rejected key just burns quota.
  if (!(error instanceof ProbeError) || error.status === undefined) return false;
  return error.status >= 500;
}

async function withTimeout(
  probe: PlatformProbe,
  name: string,
  budget: number
): Promise<ProbeResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), budget);

  try {
    return await probe.run(name, { signal: controller.signal });
  } catch (error) {
    if (controller.signal.aborted) {
      throw new ProbeError(`${probe.id} timed out after ${budget}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

/** Runs one probe for one name and always resolves.
 *
 *  A probe that throws becomes a `failed` check carrying the reason, because a
 *  single bad source must never reject the whole run. `failed` is deliberately
 *  distinct from a successful check with empty signals: one means we could not
 *  look, the other means we looked and found nothing. */
export async function runProbe(
  probe: PlatformProbe,
  name: string
): Promise<SettledCheck> {
  const normalized = normalizeName(name);
  const budget = probe.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  if (normalized) {
    const hit = await readCache(probe.id, normalized);
    if (hit) {
      return {
        platform: probe.id,
        status: "ok",
        signals: hit.signals,
        evidenceUrl: hit.evidenceUrl,
        cached: true,
      };
    }
  }

  try {
    let result: ProbeResult;

    try {
      result = await withTimeout(probe, name, budget);
    } catch (error) {
      if (!isRetryable(error)) throw error;
      await new Promise((r) => setTimeout(r, RETRY_BASE_MS + Math.random() * RETRY_BASE_MS));
      result = await withTimeout(probe, name, budget);
    }

    if (normalized) {
      await writeCache(probe.id, normalized, result);
    }

    return {
      platform: probe.id,
      status: "ok",
      signals: result.signals,
      evidenceUrl: result.evidenceUrl,
      cached: false,
    };
  } catch (error) {
    return {
      platform: probe.id,
      status: "failed",
      signals: {},
      error: error instanceof Error ? error.message : String(error),
      cached: false,
    };
  }
}
