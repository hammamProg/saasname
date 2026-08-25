import type { StepId } from "@/app/types";

/** Steps 1–6: local development & integrations setup */
export const DEVELOPMENT_STEP_IDS: StepId[] = [
  "repo",
  "supabase_project",
  "google_oauth",
  "supabase_auth",
  "email",
  "payments",
];

/** Bridge step between dev and production */
export const COPY_ENV_STEP_ID = "copy_env" satisfies StepId;

/** Steps 8–12: deploy & go-live */
export const PRODUCTION_STEP_IDS: StepId[] = [
  "deploy",
  "domain",
  "analytics",
  "storage",
  "mcp",
];

export const SETUP_STEP_ORDER: StepId[] = [
  ...DEVELOPMENT_STEP_IDS,
  COPY_ENV_STEP_ID,
  ...PRODUCTION_STEP_IDS,
];

export const SETUP_TOTAL_STEPS = SETUP_STEP_ORDER.length;

export type SetupStepGroupId = "development" | "copy_env" | "production";

export type SetupStepGroup = {
  id: SetupStepGroupId;
  label: string | null;
  stepIds: StepId[];
  dividerBefore: boolean;
  dividerAfter: boolean;
};

export const SETUP_STEP_GROUPS: SetupStepGroup[] = [
  {
    id: "development",
    label: "Development steps",
    stepIds: DEVELOPMENT_STEP_IDS,
    dividerBefore: false,
    dividerAfter: false,
  },
  {
    id: "copy_env",
    label: null,
    stepIds: [COPY_ENV_STEP_ID],
    dividerBefore: true,
    dividerAfter: true,
  },
  {
    id: "production",
    label: "Production steps",
    stepIds: PRODUCTION_STEP_IDS,
    dividerBefore: false,
    dividerAfter: false,
  },
];

export function isDevelopmentStep(stepId: StepId): boolean {
  return DEVELOPMENT_STEP_IDS.includes(stepId);
}

export function isProductionStep(stepId: StepId): boolean {
  return PRODUCTION_STEP_IDS.includes(stepId);
}
