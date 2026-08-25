import config from "@/config";

export type CreditPack = {
  id: string;
  name: string;
  credits: number;
  priceId: string;
  description: string;
  features: { name: string }[];
  isFeatured?: boolean;
};

/** Packs with a configured Paddle price ID. An unconfigured pack is hidden
 *  rather than rendered as a broken checkout button. */
export function getCreditPacks(): CreditPack[] {
  return config.credits.packs.filter((pack) => pack.priceId.trim().length > 0);
}

/** Maps a Paddle price ID to its credit quantity.
 *  Returns null for anything unrecognised — the webhook must not guess. */
export function creditsForPriceId(priceId: string): number | null {
  if (!priceId.trim()) {
    return null;
  }

  const pack = config.credits.packs.find((p) => p.priceId === priceId);
  return pack ? pack.credits : null;
}
