import { NextResponse } from "next/server";
import type { StepId } from "@/app/types";
import { PROJECT_COLUMNS } from "@/libs/project-fields";
import type { Project } from "@/libs/projects";
import { buildResetStepUpdate } from "@/libs/reset-setup-step";
import { createClient } from "@/libs/supabase/server";
import { getAuthUser, unauthorizedResponse } from "@/libs/supabase/auth-api";

const VALID_STEP_IDS = new Set<StepId>([
  "repo",
  "supabase_project",
  "google_oauth",
  "supabase_auth",
  "email_domain",
  "email",
  "payments",
  "copy_env",
  "deploy",
  "domain",
  "analytics",
  "storage",
  "mcp",
]);

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const user = await getAuthUser();
  if (!user) return unauthorizedResponse();

  let body: { step?: string } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  if (!body.step || !VALID_STEP_IDS.has(body.step as StepId)) {
    return NextResponse.json({ error: "Invalid step id" }, { status: 400 });
  }

  const stepId = body.step as StepId;
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
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const updates = buildResetStepUpdate(stepId, (project.completed_steps ?? []) as StepId[]);

  const { data: updated, error: updateError } = await supabase
    .from("projects")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
    .select(PROJECT_COLUMNS)
    .maybeSingle();

  if (updateError || !updated) {
    console.error("[api/projects/[id]/reset-step] PATCH:", updateError?.message);
    return NextResponse.json(
      { error: updateError?.message ?? "Could not reset step" },
      { status: 400 }
    );
  }

  return NextResponse.json({ data: updated as Project });
}
