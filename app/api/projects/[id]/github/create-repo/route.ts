import { NextResponse } from "next/server";
import type { StepId } from "@/app/types";
import { createGitHubRepository, getGitHubConnection } from "@/libs/composio-github";
import { isComposioConfigured } from "@/libs/composio";
import type { Project } from "@/libs/projects";
import { createClient } from "@/libs/supabase/server";
import { getAuthUser, unauthorizedResponse } from "@/libs/supabase/auth-api";

import { PROJECT_COLUMNS } from "@/libs/project-fields";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const user = await getAuthUser();

  if (!user) {
    return unauthorizedResponse();
  }

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
    console.error("[api/projects/github/create-repo] GET project:", fetchError.message);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  if (project.github_repo_url) {
    return NextResponse.json({
      data: project as Project,
      alreadyLinked: true,
    });
  }

  const github = await getGitHubConnection(user.id);

  if (!github) {
    return NextResponse.json(
      {
        error: "Connect GitHub first in Integrations before creating a repository.",
        code: "GITHUB_NOT_CONNECTED",
      },
      { status: 400 }
    );
  }

  const repoResult = await createGitHubRepository(user.id, github.connectionId, {
    name: project.slug,
    description: project.description ?? `SaaS project ${project.name} — created with ShipNow`,
    private: false,
  });

  if ("error" in repoResult) {
    return NextResponse.json({ error: repoResult.error }, { status: 400 });
  }

  const completedSteps = new Set<StepId>((project.completed_steps ?? []) as StepId[]);
  completedSteps.add("repo");

  const { data: updated, error: updateError } = await supabase
    .from("projects")
    .update({
      github_repo_url: repoResult.htmlUrl,
      github_repo_full_name: repoResult.fullName,
      completed_steps: Array.from(completedSteps),
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select(PROJECT_COLUMNS)
    .maybeSingle();

  if (updateError) {
    console.error("[api/projects/github/create-repo] PATCH:", updateError.message);
    return NextResponse.json({ error: "Repository created but failed to save project" }, { status: 500 });
  }

  if (!updated) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  return NextResponse.json({ data: updated as Project });
}
