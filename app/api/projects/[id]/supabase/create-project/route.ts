import { NextResponse } from "next/server";
import type { StepId } from "@/app/types";
import { isComposioConfigured } from "@/libs/composio";
import { createSupabaseProjectRef, getSupabaseConnection } from "@/libs/composio-supabase";
import { getUserIntegration } from "@/libs/user-integrations";
import { SUPABASE_PROVIDER } from "@/libs/composio-supabase-sync";
import { PROJECT_COLUMNS } from "@/libs/project-fields";
import type { Project } from "@/libs/projects";
import { createClient } from "@/libs/supabase/server";
import { getAuthUser, unauthorizedResponse } from "@/libs/supabase/auth-api";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const user = await getAuthUser();
  if (!user) return unauthorizedResponse();

  if (!isComposioConfigured()) {
    return NextResponse.json(
      { error: "COMPOSIO_API_KEY is not configured. Add it to your .env.local file." },
      { status: 503 }
    );
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
  if (project.supabase_project_ref) {
    return NextResponse.json({ data: project as Project, alreadyLinked: true });
  }

  const connection = await getSupabaseConnection(user.id);
  if (!connection) {
    return NextResponse.json(
      { error: "Connect Supabase first in Integrations.", code: "SUPABASE_NOT_CONNECTED" },
      { status: 400 }
    );
  }

  const integration = await getUserIntegration(user.id, SUPABASE_PROVIDER).catch(() => null);

  const created = await createSupabaseProjectRef(user.id, connection.connectionId, {
    slug: project.slug,
    organizationId: integration?.organization_id ?? undefined,
  });
  if ("error" in created) {
    return NextResponse.json({ error: created.error }, { status: 400 });
  }

  const completedSteps = new Set<StepId>((project.completed_steps ?? []) as StepId[]);
  completedSteps.add("supabase_project");

  const { data: updated, error: updateError } = await supabase
    .from("projects")
    .update({
      supabase_project_ref: created.projectRef,
      supabase_project_url: created.projectUrl,
      completed_steps: Array.from(completedSteps),
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select(PROJECT_COLUMNS)
    .maybeSingle();

  if (updateError || !updated) {
    return NextResponse.json({ error: "Project created but failed to save" }, { status: 500 });
  }

  return NextResponse.json({ data: updated as Project });
}
