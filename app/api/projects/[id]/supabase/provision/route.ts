import { NextResponse } from "next/server";
import { isComposioConfigured } from "@/libs/composio";
import { getSupabaseConnection } from "@/libs/composio-supabase";
import {
  completedStepsAfterProvision,
  provisionSupabaseProject,
} from "@/libs/composio-supabase-provision";
import { PROJECT_COLUMNS } from "@/libs/project-fields";
import type { Project } from "@/libs/projects";
import { getUserIntegration } from "@/libs/user-integrations";
import { SUPABASE_PROVIDER } from "@/libs/composio-supabase-sync";
import { createClient } from "@/libs/supabase/server";
import { getAuthUser, unauthorizedResponse } from "@/libs/supabase/auth-api";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const user = await getAuthUser();
  if (!user) return unauthorizedResponse();

  if (!isComposioConfigured()) {
    return NextResponse.json(
      { error: "COMPOSIO_API_KEY is not configured. Add it to your .env.local file." },
      { status: 503 }
    );
  }

  let body: { google_client_id?: string; google_client_secret?: string } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const { id } = await context.params;
  const supabase = await createClient();
  const { data: project, error: fetchError } = await supabase
    .from("projects")
    .select(PROJECT_COLUMNS)
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const connection = await getSupabaseConnection(user.id);
  if (!connection) {
    return NextResponse.json(
      { error: "Connect Supabase first in Integrations.", code: "SUPABASE_NOT_CONNECTED" },
      { status: 400 }
    );
  }

  const integration = await getUserIntegration(user.id, SUPABASE_PROVIDER).catch(() => null);

  const googleClientId = body.google_client_id?.trim() || project.google_oauth_client_id;
  const googleClientSecret =
    body.google_client_secret?.trim() || project.google_oauth_client_secret;

  const provisioned = await provisionSupabaseProject({
    userId: user.id,
    connectionId: connection.connectionId,
    slug: project.slug,
    storedOrganizationId: integration?.organization_id,
    existingProjectRef: project.supabase_project_ref,
    authAlreadyConfigured: project.supabase_auth_configured,
    googleClientId,
    googleClientSecret,
    existingSiteUrl: project.supabase_site_url,
    existingRedirectUrls: project.supabase_redirect_urls ?? [],
    existingCallbackUrl: project.supabase_auth_callback_url,
  });

  if ("error" in provisioned) {
    return NextResponse.json(
      { error: provisioned.error, steps: provisioned.steps },
      { status: 400 }
    );
  }

  const { data: updated, error: updateError } = await supabase
    .from("projects")
    .update({
      supabase_project_ref: provisioned.projectRef,
      supabase_project_url: provisioned.projectUrl,
      supabase_anon_key: provisioned.anonKey,
      supabase_service_role_key: provisioned.serviceRoleKey || null,
      supabase_auth_configured: provisioned.authConfigured,
      supabase_auth_callback_url: provisioned.callbackUrl,
      supabase_site_url: provisioned.siteUrl,
      supabase_redirect_urls: provisioned.redirectUrls,
      google_oauth_client_id: googleClientId || null,
      google_oauth_client_secret: googleClientSecret || null,
      completed_steps: completedStepsAfterProvision(project.completed_steps ?? []),
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select(PROJECT_COLUMNS)
    .maybeSingle();

  if (updateError || !updated) {
    return NextResponse.json(
      { error: "Provisioned on Supabase but failed to save", steps: provisioned.steps },
      { status: 500 }
    );
  }

  return NextResponse.json({
    data: updated as Project,
    steps: provisioned.steps,
    organizationId: integration?.organization_id ?? null,
  });
}
