import { NextResponse } from "next/server";
import { normalizeName } from "@/libs/names/normalize";
import { runProbe } from "@/libs/probes/run";
import { appStoreProbe } from "@/libs/probes/app-store";
import { domainsProbe } from "@/libs/probes/domains";
import { trademarkProbe } from "@/libs/probes/trademark";
import { scoreCheck, type ScoredCheck } from "@/libs/scoring/verdict";
import {
  checkDemoRateLimit,
  clientIp,
  hashIp,
  recordDemoCheck,
  PER_IP_LIMIT,
} from "@/libs/demo/rate-limit";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const NAME_MAX_LENGTH = 30;

/**
 * Three of the six sources, run for anonymous visitors.
 *
 * These three are the cheapest and the most conclusive: domains and the
 * trademark register are authoritative, and the App Store is the collision
 * people forget. That is 7 outbound lookups rather than 12, which halves what
 * an unauthenticated internet can spend, and it leaves the remaining three as a
 * real reason to sign up rather than an artificial one.
 */
const DEMO_PROBES = [domainsProbe, trademarkProbe, appStoreProbe];

/** Sources deliberately held back, named so the gate is honest about what is
 *  missing rather than implying the demo is the whole product. */
export const WITHHELD = ["Google Play", "GitHub, X and LinkedIn", "Web search"];

export async function POST(request: Request) {
  let body: { name?: unknown };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const raw = typeof body.name === "string" ? body.name.trim() : "";

  if (!raw || raw.length > NAME_MAX_LENGTH) {
    return NextResponse.json(
      { error: `Enter a name of 1–${NAME_MAX_LENGTH} characters.` },
      { status: 400 }
    );
  }

  const normalized = normalizeName(raw);

  if (!normalized) {
    return NextResponse.json(
      { error: "That does not normalise to a checkable name." },
      { status: 400 }
    );
  }

  const ipHash = hashIp(clientIp(request.headers));
  const limit = await checkDemoRateLimit(ipHash);

  if (!limit.allowed) {
    return NextResponse.json(
      {
        error:
          limit.reason === "per_ip"
            ? `That is ${PER_IP_LIMIT} free checks for today. Sign up for ${PER_IP_LIMIT > 1 ? "more" : "more"} — the first few are on us.`
            : "The free demo is at capacity today. Sign up to run a check now.",
        reason: limit.reason,
      },
      { status: 429 }
    );
  }

  // Probes never reject; a failed one becomes a `failed` check carrying the
  // reason, which scores as unknown rather than as available.
  const settled = await Promise.all(
    DEMO_PROBES.map((probe) => runProbe(probe, raw))
  );

  await recordDemoCheck(ipHash, normalized);

  const checks = settled.map((check) => {
    const verdict = scoreCheck(check as ScoredCheck);
    return {
      platform: check.platform,
      status: check.status,
      verdict: verdict.verdict,
      signals: check.signals,
      evidenceUrl: check.evidenceUrl ?? null,
    };
  });

  return NextResponse.json({
    name: raw,
    checks,
    withheld: WITHHELD,
    remaining: limit.remaining,
  });
}
