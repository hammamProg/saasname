import type { StepId } from "@/app/types";
import {
  createSupabaseProjectRemote,
  getSupabaseProjectRemote,
  resolveSupabaseOrganizationId,
} from "@/libs/composio-supabase-remote";
import {
  fetchSupabaseProjectKeys,
  waitForProjectReady,
} from "@/libs/composio-supabase-create";
import { setupSupabaseAuth, buildSupabaseAuthUrls } from "@/libs/composio-supabase";
import { syncSupabaseIntegrationMetadata } from "@/libs/composio-supabase-sync";

export type SupabaseProvisionStepId =
  | "verify"
  | "resolve_org"
  | "check_remote"
  | "create"
  | "provision"
  | "keys"
  | "auth"
  | "done";

export type SupabaseProvisionStepStatus = "pending" | "running" | "done" | "skipped" | "error";

export type SupabaseProvisionStep = {
  id: SupabaseProvisionStepId;
  label: string;
  status: SupabaseProvisionStepStatus;
  detail?: string;
};

export type SupabaseProvisionResult = {
  projectRef: string;
  projectUrl: string;
  anonKey: string;
  serviceRoleKey: string;
  authConfigured: boolean;
  callbackUrl: string;
  siteUrl: string;
  redirectUrls: string[];
  steps: SupabaseProvisionStep[];
};

type StepTracker = {
  steps: SupabaseProvisionStep[];
  set: (id: SupabaseProvisionStepId, status: SupabaseProvisionStepStatus, detail?: string) => void;
};

const STEP_LABELS: Record<SupabaseProvisionStepId, string> = {
  verify: "Verify Supabase connection",
  resolve_org: "Resolve organization",
  check_remote: "Check existing project",
  create: "Create Supabase project",
  provision: "Wait for project to be ready",
  keys: "Fetch API keys",
  auth: "Configure Email + Google auth",
  done: "Complete",
};

function createStepTracker(): StepTracker {
  const steps: SupabaseProvisionStep[] = (
    ["verify", "resolve_org", "check_remote", "create", "provision", "keys", "auth", "done"] as const
  ).map((id) => ({
    id,
    label: STEP_LABELS[id],
    status: "pending" as SupabaseProvisionStepStatus,
  }));

  return {
    steps,
    set(id, status, detail) {
      const step = steps.find((item) => item.id === id);
      if (step) {
        step.status = status;
        step.detail = detail;
      }
    },
  };
}

export async function provisionSupabaseProject(params: {
  userId: string;
  connectionId: string;
  slug: string;
  storedOrganizationId?: string | null;
  existingProjectRef?: string | null;
  authAlreadyConfigured?: boolean;
  googleClientId?: string | null;
  googleClientSecret?: string | null;
  existingSiteUrl?: string | null;
  existingRedirectUrls?: string[];
  existingCallbackUrl?: string | null;
}): Promise<SupabaseProvisionResult | { error: string; steps: SupabaseProvisionStep[] }> {
  const tracker = createStepTracker();

  tracker.set("verify", "running");
  await syncSupabaseIntegrationMetadata(params.userId, params.connectionId).catch(() => undefined);
  tracker.set("verify", "done");

  tracker.set("resolve_org", "running");
  const org = await resolveSupabaseOrganizationId(
    params.userId,
    params.connectionId,
    params.storedOrganizationId
  );
  if ("error" in org) {
    tracker.set("resolve_org", "error", org.error);
    return { error: org.error, steps: tracker.steps };
  }
  tracker.set("resolve_org", "done", org.name ?? org.id);

  let projectRef = params.existingProjectRef?.trim() || "";

  tracker.set("check_remote", "running");
  if (projectRef) {
    const remote = await getSupabaseProjectRemote(params.userId, params.connectionId, projectRef);
    if ("error" in remote) {
      tracker.set("check_remote", "error", remote.error);
      return { error: remote.error, steps: tracker.steps };
    }
    if (remote.exists) {
      tracker.set("check_remote", "done", `Found ${projectRef} on Supabase`);
      tracker.set("create", "skipped", "Already linked");
    } else {
      tracker.set("check_remote", "done", "Not found on Supabase — will recreate");
      projectRef = "";
    }
  } else {
    tracker.set("check_remote", "skipped", "No project linked yet");
  }

  if (!projectRef) {
    tracker.set("create", "running");
    const created = await createSupabaseProjectRemote(params.userId, params.connectionId, {
      slug: params.slug,
      organizationId: org.id,
    });
    if ("error" in created) {
      tracker.set("create", "error", created.error);
      return { error: created.error, steps: tracker.steps };
    }
    projectRef = created.projectRef;
    tracker.set("create", "done", projectRef);

    tracker.set("provision", "running");
    const ready = await waitForProjectReady(params.userId, params.connectionId, projectRef);
    if (ready.error) {
      tracker.set("provision", "error", ready.error);
      return { error: ready.error, steps: tracker.steps };
    }
    tracker.set("provision", "done");
  } else {
    tracker.set("create", "skipped", "Using linked project");
    tracker.set("provision", "skipped", "Project already active");
  }

  tracker.set("keys", "running");
  const keys = await fetchSupabaseProjectKeys(params.userId, params.connectionId, projectRef);
  if ("error" in keys) {
    tracker.set("keys", "error", keys.error);
    return { error: keys.error, steps: tracker.steps };
  }
  tracker.set("keys", "done");

  let authConfigured = Boolean(params.authAlreadyConfigured);
  let callbackUrl = `https://${projectRef}.supabase.co/auth/v1/callback`;
  let siteUrl = "";
  let redirectUrls: string[] = [];

  if (authConfigured) {
    tracker.set("auth", "skipped", "Already configured");
    const urls = buildSupabaseAuthUrls(projectRef);
    callbackUrl = params.existingCallbackUrl ?? urls.callbackUrl;
    siteUrl = params.existingSiteUrl ?? urls.siteUrl;
    redirectUrls =
      params.existingRedirectUrls && params.existingRedirectUrls.length > 0
        ? params.existingRedirectUrls
        : urls.redirectUrls;
  } else {
    tracker.set("auth", "running");
    const authSetup = await setupSupabaseAuth(params.userId, params.connectionId, {
      projectRef,
      googleClientId: params.googleClientId,
      googleClientSecret: params.googleClientSecret,
    });
    if ("error" in authSetup) {
      tracker.set("auth", "error", authSetup.error);
      return { error: authSetup.error, steps: tracker.steps };
    }
    authConfigured = true;
    callbackUrl = authSetup.callbackUrl;
    siteUrl = authSetup.siteUrl;
    redirectUrls = authSetup.redirectUrls;
    tracker.set("auth", "done");
  }

  tracker.set("done", "done");

  return {
    projectRef: keys.projectRef,
    projectUrl: keys.projectUrl,
    anonKey: keys.anonKey,
    serviceRoleKey: keys.serviceRoleKey,
    authConfigured,
    callbackUrl,
    siteUrl,
    redirectUrls,
    steps: tracker.steps,
  };
}

export function completedStepsAfterProvision(current: StepId[]): StepId[] {
  const next = new Set<StepId>(current);
  next.add("supabase_project");
  next.add("supabase_auth");
  return Array.from(next);
}
