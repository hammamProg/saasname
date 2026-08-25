import {
  executeComposioTool,
  extractComposioArray,
  generateDbPassword,
  unwrapPayload,
} from "@/libs/composio-execute";

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

export async function listSupabaseOrganizations(
  userId: string,
  connectionId: string
): Promise<SupabaseOrganization[] | { error: string }> {
  const orgResult = await executeComposioTool("SUPABASE_LIST_ALL_ORGANIZATIONS", {
    userId,
    connectionId,
    arguments: {},
  });

  if ("error" in orgResult) {
    return { error: orgResult.error };
  }

  const orgItems = extractComposioArray(orgResult.data, ["organizations", "items", "data"]);
  const orgs = orgItems
    .map((record) => {
      const id = record.id ?? record.organization_id;
      if (typeof id !== "string") return null;
      const name = record.name ?? record.slug;
      return { id, name: typeof name === "string" ? name : id };
    })
    .filter((item): item is SupabaseOrganization => item !== null);

  if (orgs.length > 0) {
    return orgs;
  }

  const projectsResult = await executeComposioTool("SUPABASE_LIST_ALL_PROJECTS", {
    userId,
    connectionId,
    arguments: {},
  });

  if ("error" in projectsResult) {
    return { error: projectsResult.error };
  }

  const projectItems = extractComposioArray(projectsResult.data, ["projects", "items", "data"]);
  const seen = new Set<string>();
  for (const record of projectItems) {
    const orgId = record.organization_id ?? record.organizationId;
    if (typeof orgId === "string" && orgId.trim() && !seen.has(orgId)) {
      seen.add(orgId);
      orgs.push({ id: orgId.trim(), name: orgId.trim() });
    }
  }

  return orgs;
}

export async function resolveSupabaseOrganizationId(
  userId: string,
  connectionId: string,
  explicitId?: string | null
): Promise<{ id: string; name?: string } | { error: string }> {
  if (explicitId?.trim()) {
    return { id: explicitId.trim() };
  }

  const fromEnv = process.env.SUPABASE_ORGANIZATION_ID?.trim();
  if (fromEnv) {
    return { id: fromEnv };
  }

  const orgs = await listSupabaseOrganizations(userId, connectionId);
  if ("error" in orgs) {
    return { error: orgs.error };
  }
  if (orgs.length === 0) {
    return { error: "No Supabase organization found on this account." };
  }
  return { id: orgs[0].id, name: orgs[0].name };
}

export async function getSupabaseProjectRemote(
  userId: string,
  connectionId: string,
  projectRef: string
): Promise<{ exists: true; status: string } | { exists: false } | { error: string }> {
  const result = await executeComposioTool("SUPABASE_GET_PROJECT", {
    userId,
    connectionId,
    arguments: { ref: projectRef },
  });
  if ("error" in result) {
    const message = result.error.toLowerCase();
    if (message.includes("not found") || message.includes("404")) {
      return { exists: false };
    }
    return { error: result.error };
  }
  const payload = unwrapPayload(result.data);
  return { exists: true, status: parseProjectStatus(payload) };
}

export async function createSupabaseProjectRemote(
  userId: string,
  connectionId: string,
  params: { slug: string; organizationId: string }
): Promise<{ projectRef: string } | { error: string }> {
  const createResult = await executeComposioTool("SUPABASE_CREATE_A_PROJECT", {
    userId,
    connectionId,
    arguments: {
      name: supabaseProjectName(params.slug),
      organization_id: params.organizationId,
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
  return { projectRef };
}
