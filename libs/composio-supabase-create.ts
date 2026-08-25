import {
  executeComposioTool,
  extractComposioArray,
  generateDbPassword,
  sleep,
  unwrapPayload,
} from "@/libs/composio-execute";
import { fetchSupabaseProjectKeys as fetchKeysFromComposio } from "@/libs/composio-supabase-keys";

export type SupabaseOrganization = {
  id: string;
  name: string;
};

function supabaseProjectName(slug: string): string {
  return slug.replace(/\./g, "-").slice(0, 40);
}

function parseProjectRef(payload: Record<string, unknown>): string | null {
  const ref = payload.ref ?? payload.id ?? payload.project_ref;
  return typeof ref === "string" ? ref : null;
}

function parseProjectStatus(payload: Record<string, unknown>): string {
  const status = payload.status;
  return typeof status === "string" ? status.toLowerCase() : "";
}

export type SupabaseProjectKeys = {
  projectRef: string;
  projectUrl: string;
  anonKey: string;
  serviceRoleKey: string;
};

async function fetchProjectApiKeys(
  userId: string,
  connectionId: string,
  projectRef: string
): Promise<{ anonKey: string; serviceRoleKey: string } | { error: string }> {
  return fetchKeysFromComposio(userId, connectionId, projectRef);
}

export async function waitForProjectReady(
  userId: string,
  connectionId: string,
  projectRef: string
): Promise<{ error?: string }> {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const result = await executeComposioTool("SUPABASE_GET_PROJECT", {
      userId,
      connectionId,
      arguments: { ref: projectRef },
    });
    if ("error" in result) return { error: result.error };
    const payload = unwrapPayload(result.data);
    const status = parseProjectStatus(payload);
    if (status.includes("active") || status.includes("healthy")) return {};
    await sleep(5000);
  }
  return { error: "Supabase project is still provisioning. Try again in a minute." };
}

async function resolveOrganizationId(
  userId: string,
  connectionId: string,
  explicitId?: string | null
): Promise<{ id: string; name?: string } | { error: string }> {
  const fromEnv = process.env.SUPABASE_ORGANIZATION_ID?.trim();
  if (explicitId?.trim()) {
    return { id: explicitId.trim() };
  }
  if (fromEnv) {
    return { id: fromEnv };
  }

  const orgResult = await executeComposioTool("SUPABASE_LIST_ALL_ORGANIZATIONS", {
    userId,
    connectionId,
    arguments: {},
  });

  if (!("error" in orgResult)) {
    const orgItems = extractComposioArray(orgResult.data, ["organizations", "items", "data"]);
    const orgs = orgItems
      .map((record) => {
        const id = record.id ?? record.organization_id;
        if (typeof id !== "string") return null;
        const name = record.name ?? record.slug;
        return { id, name: typeof name === "string" ? name : id };
      })
      .filter((item): item is { id: string; name: string } => item !== null);

    if (orgs.length > 0) {
      return { id: orgs[0].id, name: orgs[0].name };
    }
  }

  const projectsResult = await executeComposioTool("SUPABASE_LIST_ALL_PROJECTS", {
    userId,
    connectionId,
    arguments: {},
  });

  if (!("error" in projectsResult)) {
    const projectItems = extractComposioArray(projectsResult.data, ["projects", "items", "data"]);
    for (const record of projectItems) {
      const orgId = record.organization_id ?? record.organizationId;
      if (typeof orgId === "string" && orgId.trim()) {
        return { id: orgId.trim() };
      }
    }
  }

  const orgError = "error" in orgResult ? orgResult.error : null;
  const projectsError = "error" in projectsResult ? projectsResult.error : null;

  return {
    error:
      orgError ??
      projectsError ??
      "No Supabase organization found. Create one at supabase.com or set SUPABASE_ORGANIZATION_ID in .env.local.",
  };
}

export type SupabaseProjectRef = {
  projectRef: string;
  projectUrl: string;
};

export async function createSupabaseProjectRef(
  userId: string,
  connectionId: string,
  params: { slug: string; organizationId?: string }
): Promise<SupabaseProjectRef | { error: string }> {
  const org = await resolveOrganizationId(userId, connectionId, params.organizationId);
  if ("error" in org) {
    return { error: org.error };
  }

  const createResult = await executeComposioTool("SUPABASE_CREATE_A_PROJECT", {
    userId,
    connectionId,
    arguments: {
      name: supabaseProjectName(params.slug),
      organization_id: org.id,
      db_pass: generateDbPassword(),
      region: "us-east-1",
    },
  });
  if ("error" in createResult) return { error: createResult.error };

  const created = unwrapPayload(createResult.data);
  let projectRef = parseProjectRef(created);
  if (!projectRef) {
    const projects = extractComposioArray(createResult.data, ["projects", "items", "data"]);
    projectRef = projects.length > 0 ? parseProjectRef(projects[0]) : null;
  }
  if (!projectRef) {
    return { error: "Supabase project was created but the reference ID was missing." };
  }

  return {
    projectRef,
    projectUrl: `https://${projectRef}.supabase.co`,
  };
}

export async function fetchSupabaseProjectKeys(
  userId: string,
  connectionId: string,
  projectRef: string
): Promise<SupabaseProjectKeys | { error: string }> {
  const keys = await fetchProjectApiKeys(userId, connectionId, projectRef);
  if ("error" in keys) return { error: keys.error };
  return {
    projectRef,
    projectUrl: `https://${projectRef}.supabase.co`,
    anonKey: keys.anonKey,
    serviceRoleKey: keys.serviceRoleKey,
  };
}

export async function createSupabaseProject(
  userId: string,
  connectionId: string,
  params: { slug: string; organizationId?: string }
): Promise<SupabaseProjectKeys | { error: string }> {
  const created = await createSupabaseProjectRef(userId, connectionId, params);
  if ("error" in created) return { error: created.error };

  const ready = await waitForProjectReady(userId, connectionId, created.projectRef);
  if (ready.error) return { error: ready.error };

  const keys = await fetchProjectApiKeys(userId, connectionId, created.projectRef);
  if ("error" in keys) return { error: keys.error };

  return {
    projectRef: created.projectRef,
    projectUrl: created.projectUrl,
    anonKey: keys.anonKey,
    serviceRoleKey: keys.serviceRoleKey,
  };
}
