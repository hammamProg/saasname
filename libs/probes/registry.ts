import { appStoreProbe } from "@/libs/probes/app-store";
import { domainsProbe } from "@/libs/probes/domains";
import { webSerpProbe } from "@/libs/probes/web-serp";
import { googlePlayProbe } from "@/libs/probes/google-play";
import { socialsProbe } from "@/libs/probes/socials";
import { trademarkProbe } from "@/libs/probes/trademark";
import type { PlatformProbe } from "@/libs/probes/types";

/** Probes whose failure fails the candidate and refunds its credit. */
export const CORE_PROBES: readonly PlatformProbe[] = [
  appStoreProbe,
  domainsProbe,
  webSerpProbe,
];

/** Failure here yields unknown and never sinks the report, and never costs the
 *  user a credit. */
export const BEST_EFFORT_PROBES: readonly PlatformProbe[] = [
  trademarkProbe,
  googlePlayProbe,
  socialsProbe,
];

export const ALL_PROBES: readonly PlatformProbe[] = [
  ...CORE_PROBES,
  ...BEST_EFFORT_PROBES,
];
