import { normalizeName } from "@/libs/names/normalize";
import { resolveRdapBase, SUPPORTED_TLDS } from "@/libs/probes/rdap-tlds";
import {
  ProbeError,
  type PlatformProbe,
  type ProbeContext,
  type ProbeResult,
  type ProbeSignals,
} from "@/libs/probes/types";

type Availability = "available" | "taken" | "unknown";

type RdapDomain = {
  events?: Array<{ eventAction?: string; eventDate?: string }>;
};

function eventDate(body: RdapDomain, action: string): string | null {
  return (
    body.events?.find((e) => e.eventAction === action)?.eventDate ?? null
  );
}

async function checkTld(
  normalized: string,
  tld: string,
  signal?: AbortSignal
): Promise<{ status: Availability; body: RdapDomain | null }> {
  const base = resolveRdapBase(tld);

  // No server for this TLD. Reporting "available" here would be a guess, and
  // the guess that matters most to get right.
  if (!base) {
    return { status: "unknown", body: null };
  }

  try {
    const response = await fetch(`${base}domain/${normalized}.${tld}`, {
      headers: { Accept: "application/rdap+json" },
      signal,
    });

    if (response.status === 404) {
      return { status: "available", body: null };
    }

    if (response.ok) {
      return { status: "taken", body: (await response.json()) as RdapDomain };
    }

    // 5xx, rate limit, anything else: we do not know.
    return { status: "unknown", body: null };
  } catch {
    return { status: "unknown", body: null };
  }
}

/** Domain availability across the TLDs that give a real answer.
 *
 *  Every TLD is queried in parallel and failures are isolated, so one flaky
 *  registry costs one row rather than the whole check. A TLD we cannot resolve
 *  or reach is reported `unknown`; it is never reported available. */
export const domainsProbe: PlatformProbe = {
  id: "domains",
  tier: "core",

  async run(name: string, ctx: ProbeContext): Promise<ProbeResult> {
    const normalized = normalizeName(name);

    if (!normalized) {
      throw new ProbeError(`Name does not normalize to a domain label: ${name}`);
    }

    const results = await Promise.all(
      SUPPORTED_TLDS.map(async (tld) => ({
        tld,
        ...(await checkTld(normalized, tld, ctx.signal)),
      }))
    );

    const signals: ProbeSignals = {};

    for (const { tld, status, body } of results) {
      signals[tld] = status;

      // The .com registration age is the strongest recency signal Phase 4 has
      // for an incumbent, so it is recorded now rather than re-fetched later.
      if (tld === "com" && body) {
        const registered = eventDate(body, "registration");
        const expires = eventDate(body, "expiration");
        if (registered) signals.comRegisteredAt = registered;
        if (expires) signals.comExpiresAt = expires;
      }
    }

    if (results.every((r) => r.status === "unknown")) {
      throw new ProbeError("No registry could be reached for any TLD");
    }

    return { signals };
  },
};
