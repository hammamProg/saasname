import config from "@/config";

export type PaddlePlanDefinition = {
  key: "starter" | "pro";
  name: string;
  description: string;
  priceUsd: number;
  priceEnvVar: string;
};

export const PADDLE_SETUP_PLANS: PaddlePlanDefinition[] = [
  {
    key: "starter",
    name: config.pricing.plans[0]?.name ?? "Starter",
    description: config.pricing.plans[0]?.description ?? "Perfect for small projects",
    priceUsd: config.pricing.plans[0]?.price ?? 79,
    priceEnvVar: "NEXT_PUBLIC_PADDLE_PRICE_ID_STARTER",
  },
  {
    key: "pro",
    name: config.pricing.plans[1]?.name ?? "Advanced",
    description: config.pricing.plans[1]?.description ?? "You need more power",
    priceUsd: config.pricing.plans[1]?.price ?? 99,
    priceEnvVar: "NEXT_PUBLIC_PADDLE_PRICE_ID_PRO",
  },
];

export function usdToPaddleAmount(dollars: number): string {
  return String(Math.round(dollars * 100));
}

export function inferPaddleEnvFromClientToken(token: string): "sandbox" | "production" {
  return token.startsWith("test_") ? "sandbox" : "production";
}
