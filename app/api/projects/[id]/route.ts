import { NextResponse } from "next/server";
import type { StepId } from "@/app/types";
import { createClient } from "@/libs/supabase/server";
import { getAuthUser, unauthorizedResponse } from "@/libs/supabase/auth-api";
import {
  PROJECT_DESCRIPTION_MAX,
  PROJECT_NAME_MAX,
  type Project,
} from "@/libs/projects";
import { isValidResendDomain, normalizeResendDomain } from "@/libs/resend-domain";
import { PROJECT_COLUMNS } from "@/libs/project-fields";
import { normalizePaddlePlans } from "@/libs/paddle-plans";
import { PROJECT_IMAGE_BUCKET } from "@/libs/project-image";

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

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const user = await getAuthUser();

  if (!user) {
    return unauthorizedResponse();
  }

  const { id } = await context.params;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select(PROJECT_COLUMNS)
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("[api/projects/[id]] GET:", error.message);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  return NextResponse.json({ data: data as Project });
}

export async function PATCH(request: Request, context: RouteContext) {
  const user = await getAuthUser();

  if (!user) {
    return unauthorizedResponse();
  }

  const { id } = await context.params;

  let body: {
    name?: string;
    description?: string | null;
    completed_steps?: string[];
    google_oauth_client_id?: string | null;
    google_oauth_client_secret?: string | null;
    resend_domain?: string | null;
    paddle_plans?: unknown;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};

  if (body.name !== undefined) {
    const name = body.name.trim();

    if (!name) {
      return NextResponse.json({ error: "Project name cannot be empty" }, { status: 400 });
    }

    if (name.length > PROJECT_NAME_MAX) {
      return NextResponse.json(
        { error: `Project name must be ${PROJECT_NAME_MAX} characters or fewer` },
        { status: 400 }
      );
    }

    updates.name = name;
  }

  if (body.description !== undefined) {
    const description =
      body.description === null ? null : body.description.trim() || null;

    if (description && description.length > PROJECT_DESCRIPTION_MAX) {
      return NextResponse.json(
        { error: `Description must be ${PROJECT_DESCRIPTION_MAX} characters or fewer` },
        { status: 400 }
      );
    }

    updates.description = description;
  }

  if (body.google_oauth_client_id !== undefined) {
    const clientId = body.google_oauth_client_id?.trim() || null;
    updates.google_oauth_client_id = clientId;
  }

  if (body.google_oauth_client_secret !== undefined) {
    const clientSecret = body.google_oauth_client_secret?.trim() || null;
    updates.google_oauth_client_secret = clientSecret;
  }

  if (body.resend_domain !== undefined) {
    if (body.resend_domain === null) {
      updates.resend_domain = null;
    } else {
      const domain = normalizeResendDomain(body.resend_domain);
      if (!isValidResendDomain(domain)) {
        return NextResponse.json({ error: "Invalid email domain" }, { status: 400 });
      }
      updates.resend_domain = domain;
    }
  }

  if (body.completed_steps !== undefined) {
    if (!Array.isArray(body.completed_steps)) {
      return NextResponse.json({ error: "completed_steps must be an array" }, { status: 400 });
    }

    const steps = body.completed_steps.filter(
      (step): step is StepId => typeof step === "string" && VALID_STEP_IDS.has(step as StepId)
    );

    updates.completed_steps = steps;
  }


  if (body.paddle_plans !== undefined) {
    const normalized = normalizePaddlePlans(body.paddle_plans);
    if (normalized === null) {
      return NextResponse.json({ error: "Invalid paddle_plans" }, { status: 400 });
    }

    const supabaseForPlans = await createClient();
    const { data: existing, error: existingError } = await supabaseForPlans
      .from("projects")
      .select("paddle_provisioned")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingError) {
      return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
    }
    if (!existing) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    if (existing.paddle_provisioned) {
      return NextResponse.json(
        { error: "Cannot update billing plans after Paddle is provisioned" },
        { status: 400 }
      );
    }

    updates.paddle_plans = normalized;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
    .select(PROJECT_COLUMNS)
    .maybeSingle();

  if (error) {
    console.error("[api/projects/[id]] PATCH:", error.message);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  return NextResponse.json({ data: data as Project });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const user = await getAuthUser();

  if (!user) {
    return unauthorizedResponse();
  }

  const { id } = await context.params;
  const supabase = await createClient();

  const folderPath = `${user.id}/${id}`;
  const { data: storedFiles } = await supabase.storage.from(PROJECT_IMAGE_BUCKET).list(folderPath);
  if (storedFiles?.length) {
    await supabase.storage
      .from(PROJECT_IMAGE_BUCKET)
      .remove(storedFiles.map((file) => `${folderPath}/${file.name}`));
  }

  const { error, count } = await supabase
    .from("projects")
    .delete({ count: "exact" })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("[api/projects/[id]] DELETE:", error.message);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }

  if (!count) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
