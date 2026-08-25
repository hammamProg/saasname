import config from "@/config";
import { PADDLE_SETUP_PLANS, usdToPaddleAmount } from "@/libs/paddle-setup-plans";

export type PaddleBillingInterval = "day" | "week" | "month" | "year";

export type PaddleBillingCycle = {
  interval: PaddleBillingInterval;
  frequency: number;
};

export type PaddleTrialKind = "free" | "paid" | "cardless";

export type ProjectPaddlePlanTrial = {
  kind: PaddleTrialKind;
  interval: PaddleBillingInterval;
  frequency: number;
  priceUsd?: number;
};

export type ProjectPaddlePlan = {
  id: string;
  name: string;
  description: string;
  priceUsd: number;
  envKey: string;
  priceId: string | null;
  billingCycle: PaddleBillingCycle;
  trial: ProjectPaddlePlanTrial | null;
};

export const PADDLE_PLAN_NAME_MAX = 60;
export const PADDLE_PLAN_DESCRIPTION_MAX = 200;
export const PADDLE_PLANS_MAX = 10;
export const PADDLE_PRICE_USD_MIN = 1;
export const PADDLE_PRICE_USD_MAX = 99_999;
export const PADDLE_BILLING_FREQUENCY_MIN = 1;
export const PADDLE_BILLING_FREQUENCY_MAX = 999;
export const PADDLE_TRIAL_FREQUENCY_MIN = 1;
export const PADDLE_TRIAL_FREQUENCY_MAX = 999;

const BILLING_INTERVALS: PaddleBillingInterval[] = ["day", "week", "month", "year"];
const TRIAL_KINDS: PaddleTrialKind[] = ["free", "paid", "cardless"];

export function slugifyPlanEnvSuffix(name: string): string {
  const slug = name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return slug.slice(0, 40) || "PLAN";
}

export function planEnvKeyForName(name: string, index: number): string {
  const predefined = PADDLE_SETUP_PLANS[index]?.priceEnvVar;
  if (predefined) {
    return predefined;
  }
  return `NEXT_PUBLIC_PADDLE_PRICE_ID_${slugifyPlanEnvSuffix(name)}_${index + 1}`;
}

const DEFAULT_BILLING_CYCLE: PaddleBillingCycle = { interval: "month", frequency: 1 };

function isBillingInterval(value: unknown): value is PaddleBillingInterval {
  return typeof value === "string" && BILLING_INTERVALS.includes(value as PaddleBillingInterval);
}

function normalizeBillingCycle(raw: unknown): PaddleBillingCycle | null {
  if (!raw || typeof raw !== "object") {
    return DEFAULT_BILLING_CYCLE;
  }
  const record = raw as Record<string, unknown>;
  const interval = record.interval;
  const frequency = record.frequency;

  const resolvedInterval = isBillingInterval(interval) ? interval : DEFAULT_BILLING_CYCLE.interval;
  const resolvedFrequency =
    typeof frequency === "number" &&
    Number.isInteger(frequency) &&
    frequency >= PADDLE_BILLING_FREQUENCY_MIN &&
    frequency <= PADDLE_BILLING_FREQUENCY_MAX
      ? frequency
      : DEFAULT_BILLING_CYCLE.frequency;

  return { interval: resolvedInterval, frequency: resolvedFrequency };
}

function isTrialKind(value: unknown): value is PaddleTrialKind {
  return typeof value === "string" && TRIAL_KINDS.includes(value as PaddleTrialKind);
}

function normalizeTrial(raw: unknown): ProjectPaddlePlanTrial | null {
  if (raw === null || raw === undefined) {
    return null;
  }
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const record = raw as Record<string, unknown>;
  if (!isTrialKind(record.kind)) {
    return null;
  }

  const interval = isBillingInterval(record.interval) ? record.interval : "day";
  const frequency =
    typeof record.frequency === "number" &&
    Number.isInteger(record.frequency) &&
    record.frequency >= PADDLE_TRIAL_FREQUENCY_MIN &&
    record.frequency <= PADDLE_TRIAL_FREQUENCY_MAX
      ? record.frequency
      : null;

  if (frequency === null) {
    return null;
  }

  if (record.kind === "paid") {
    const priceUsd = record.priceUsd;
    if (
      typeof priceUsd !== "number" ||
      !Number.isFinite(priceUsd) ||
      priceUsd < PADDLE_PRICE_USD_MIN ||
      priceUsd > PADDLE_PRICE_USD_MAX
    ) {
      return null;
    }
    return {
      kind: "paid",
      interval,
      frequency,
      priceUsd: Math.round(priceUsd * 100) / 100,
    };
  }

  return { kind: record.kind, interval, frequency };
}

export function createDefaultPaddlePlans(): ProjectPaddlePlan[] {
  return PADDLE_SETUP_PLANS.map((plan) => ({
    id: plan.key,
    name: plan.name,
    description: plan.description,
    priceUsd: plan.priceUsd,
    envKey: plan.priceEnvVar,
    priceId: null,
    billingCycle: { ...DEFAULT_BILLING_CYCLE },
    trial: null,
  }));
}

export function normalizePaddlePlans(raw: unknown): ProjectPaddlePlan[] | null {
  if (!Array.isArray(raw)) {
    return null;
  }

  if (raw.length === 0) {
    return [];
  }

  if (raw.length > PADDLE_PLANS_MAX) {
    return null;
  }

  const plans: ProjectPaddlePlan[] = [];

  for (let index = 0; index < raw.length; index += 1) {
    const item = raw[index];
    if (!item || typeof item !== "object") {
      return null;
    }

    const record = item as Record<string, unknown>;
    const name = typeof record.name === "string" ? record.name.trim() : "";
    const description =
      typeof record.description === "string" ? record.description.trim() : "";
    const priceUsd = record.priceUsd;
    const id =
      typeof record.id === "string" && record.id.trim()
        ? record.id.trim()
        : `plan-${index + 1}`;
    const envKey =
      typeof record.envKey === "string" && record.envKey.trim()
        ? record.envKey.trim()
        : planEnvKeyForName(name, index);
    const priceId =
      record.priceId === null || record.priceId === undefined
        ? null
        : typeof record.priceId === "string"
          ? record.priceId.trim() || null
          : null;

    if (!name || name.length > PADDLE_PLAN_NAME_MAX) {
      return null;
    }

    if (description.length > PADDLE_PLAN_DESCRIPTION_MAX) {
      return null;
    }

    if (
      typeof priceUsd !== "number" ||
      !Number.isFinite(priceUsd) ||
      priceUsd < PADDLE_PRICE_USD_MIN ||
      priceUsd > PADDLE_PRICE_USD_MAX
    ) {
      return null;
    }

    if (!/^NEXT_PUBLIC_PADDLE_PRICE_ID_[A-Z0-9_]+$/.test(envKey)) {
      return null;
    }

    const billingCycle = normalizeBillingCycle(record.billingCycle);
    if (!billingCycle) {
      return null;
    }

    let trial: ProjectPaddlePlanTrial | null = null;
    if (record.trial !== undefined && record.trial !== null) {
      trial = normalizeTrial(record.trial);
      if (!trial) {
        return null;
      }
    }

    plans.push({
      id,
      name,
      description: description || `${name} subscription`,
      priceUsd: Math.round(priceUsd * 100) / 100,
      envKey,
      priceId,
      billingCycle,
      trial,
    });
  }

  const envKeys = new Set(plans.map((plan) => plan.envKey));
  if (envKeys.size !== plans.length) {
    return null;
  }

  return plans;
}

export function getEffectivePaddlePlans(
  paddlePlans: ProjectPaddlePlan[] | null | undefined
): ProjectPaddlePlan[] {
  if (paddlePlans && paddlePlans.length > 0) {
    return paddlePlans;
  }
  return createDefaultPaddlePlans();
}

export function stripPaddlePlanPriceIds(plans: ProjectPaddlePlan[]): ProjectPaddlePlan[] {
  return plans.map((plan) => ({ ...plan, priceId: null }));
}

export function mergeProvisionedPriceIds(
  plans: ProjectPaddlePlan[],
  priceIdsByPlanId: Record<string, string>
): ProjectPaddlePlan[] {
  return plans.map((plan) => ({
    ...plan,
    priceId: priceIdsByPlanId[plan.id] ?? plan.priceId,
  }));
}

export function starterAndProPriceIds(plans: ProjectPaddlePlan[]): {
  starterPriceId: string | null;
  proPriceId: string | null;
} {
  const starter =
    plans.find((plan) => plan.envKey === "NEXT_PUBLIC_PADDLE_PRICE_ID_STARTER") ?? plans[0];
  const pro =
    plans.find((plan) => plan.envKey === "NEXT_PUBLIC_PADDLE_PRICE_ID_PRO") ?? plans[1];

  return {
    starterPriceId: starter?.priceId ?? null,
    proPriceId: pro?.priceId ?? null,
  };
}

function intervalUnitLabel(interval: PaddleBillingInterval, frequency: number): string {
  const units: Record<PaddleBillingInterval, [string, string]> = {
    day: ["day", "days"],
    week: ["week", "weeks"],
    month: ["month", "months"],
    year: ["year", "years"],
  };
  const [singular, plural] = units[interval];
  return frequency === 1 ? singular : plural;
}

export function formatBillingCycleLabel(cycle: PaddleBillingCycle): string {
  const unit = intervalUnitLabel(cycle.interval, cycle.frequency);
  if (cycle.frequency === 1) {
    return `Every ${unit}`;
  }
  return `Every ${cycle.frequency} ${unit}`;
}

export function formatTrialLabel(trial: ProjectPaddlePlanTrial | null): string | null {
  if (!trial) {
    return null;
  }

  const duration = `${trial.frequency} ${intervalUnitLabel(trial.interval, trial.frequency)}`;

  switch (trial.kind) {
    case "free":
      return `${duration} free trial (card on file)`;
    case "paid":
      return `${duration} paid trial ($${trial.priceUsd?.toFixed(2) ?? "0.00"})`;
    case "cardless":
      return `${duration} cardless trial (no card upfront)`;
    default:
      return null;
  }
}

export function formatPlanBillingSummary(plan: ProjectPaddlePlan): string {
  const cycle = formatBillingCycleLabel(plan.billingCycle);
  const price = `$${plan.priceUsd.toFixed(2)}`;
  const trialLabel = formatTrialLabel(plan.trial);
  const base = `${plan.name}: ${price} · ${cycle}`;
  return trialLabel ? `${base} · ${trialLabel}` : base;
}

export type PaddlePricePayload = {
  description: string;
  product_id: string;
  unit_price: {
    amount: string;
    currency_code: "USD";
  };
  billing_cycle: {
    interval: PaddleBillingInterval;
    frequency: number;
  };
  tax_mode: "account_setting";
  trial_period?: {
    interval: PaddleBillingInterval;
    frequency: number;
    requires_payment_method?: boolean;
    unit_price?: {
      amount: string;
      currency_code: "USD";
    };
  };
};

export function buildPaddlePricePayload(
  plan: ProjectPaddlePlan,
  productId: string
): PaddlePricePayload {
  const payload: PaddlePricePayload = {
    description: plan.description,
    product_id: productId,
    unit_price: {
      amount: usdToPaddleAmount(plan.priceUsd),
      currency_code: "USD",
    },
    billing_cycle: {
      interval: plan.billingCycle.interval,
      frequency: plan.billingCycle.frequency,
    },
    tax_mode: "account_setting",
  };

  if (plan.trial) {
    const trialPeriod: NonNullable<PaddlePricePayload["trial_period"]> = {
      interval: plan.trial.interval,
      frequency: plan.trial.frequency,
    };

    if (plan.trial.kind === "paid" && plan.trial.priceUsd != null) {
      trialPeriod.unit_price = {
        amount: usdToPaddleAmount(plan.trial.priceUsd),
        currency_code: "USD",
      };
    }

    if (plan.trial.kind === "cardless") {
      trialPeriod.requires_payment_method = false;
    }

    payload.trial_period = trialPeriod;
  }

  return payload;
}

export type PaddleEnvInput = {
  env: "sandbox" | "production";
  clientToken: string | null;
  apiKey: string | null;
  webhookSecret: string | null;
  plans: ProjectPaddlePlan[];
};

export function buildPaddleEnvFile({
  env,
  clientToken,
  apiKey,
  webhookSecret,
  plans,
}: PaddleEnvInput): string {
  const lines: string[] = [
    `# Paddle (${config.appName})`,
    `NEXT_PUBLIC_PADDLE_ENV=${env}`,
  ];

  if (clientToken) {
    lines.push(`NEXT_PUBLIC_PADDLE_CLIENT_TOKEN=${clientToken}`);
  }
  if (apiKey) {
    lines.push(`PADDLE_API_KEY=${apiKey}`);
  }
  if (webhookSecret) {
    lines.push(`PADDLE_WEBHOOK_SECRET=${webhookSecret}`);
  }

  for (const plan of plans) {
    if (plan.priceId) {
      lines.push(`# ${formatPlanBillingSummary(plan)}`);
      lines.push(`${plan.envKey}=${plan.priceId}`);
    }
  }

  return `${lines.join("\n")}\n`;
}
