import { appStoreProbe } from "@/libs/probes/app-store";
import { domainsProbe } from "@/libs/probes/domains";
import { webSerpProbe } from "@/libs/probes/web-serp";
import type { PlatformProbe } from "@/libs/probes/types";

/** Probes whose failure fails the candidate and refunds its credit. */
export const CORE_PROBES: readonly PlatformProbe[] = [
  appStoreProbe,
  domainsProbe,
  webSerpProbe,
];

/** Best-effort probes land here in Phase 5. Their failure yields unknown and
 *  never sinks the report. */
export const BEST_EFFORT_PROBES: readonly PlatformProbe[] = [];

export const ALL_PROBES: readonly PlatformProbe[] = [
  ...CORE_PROBES,
  ...BEST_EFFORT_PROBES,
];
