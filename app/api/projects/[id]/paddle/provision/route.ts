import { NextResponse } from "next/server";
import type { StepId } from "@/app/types";
import {
  getEffectivePaddlePlans,
  mergeProvisionedPriceIds,
  normalizePaddlePlans,
  starterAndProPriceIds,
} from "@/libs/paddle-plans";
import { provisionPaddleForProject } from "@/libs/paddle-provision";
import { resolveWebhookBaseUrl } from "@/libs/paddle-webhook-url";
import { PROJECT_COLUMNS } from "@/libs/project-fields";
import type { Project } from "@/libs/projects";
import { createClient } from "@/libs/supabase/server";
import { getAuthUser, unauthorizedResponse } from "@/libs/supabase/auth-api";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const user = await getAuthUser();
  if (!user) return unauthorizedResponse();

  const { id } = await context.params;
  let body: {
    site_url?: string;
    webhook_base_url?: string;
    webhook_url?: string;
    paddle_plans?: unknown;
  } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

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

  const typedProject = project as Project;
  if (typedProject.paddle_provisioned) {
    return NextResponse.json({ data: typedProject, alreadyProvisioned: true });
  }

  const webhookBase = resolveWebhookBaseUrl({
    webhook_base_url: body.webhook_base_url,
    webhook_url: body.webhook_url,
    site_url: body.site_url,
  });
  if ("error" in webhookBase) {
    return NextResponse.json({ error: webhookBase.error, code: "INVALID_WEBHOOK_URL" }, { status: 400 });
  }

  let plansFromBody: ReturnType<typeof normalizePaddlePlans> | undefined;
  if (body.paddle_plans !== undefined) {
    plansFromBody = normalizePaddlePlans(body.paddle_plans);
    if (plansFromBody === null) {
      return NextResponse.json({ error: "Invalid paddle_plans" }, { status: 400 });
    }
  }

  const plans = getEffectivePaddlePlans(
    plansFromBody !== undefined ? plansFromBody : typedProject.paddle_plans
  );

  const provisioned = await provisionPaddleForProject({
    userId: user.id,
    projectName: typedProject.name,
    siteUrl: webhookBase.baseUrl,
    plans,
  });

  if ("error" in provisioned) {
    const status = provisioned.error.toLowerCase().includes("not connected") ? 400 : 502;
    return NextResponse.json(
      {
        error: provisioned.error,
        code: provisioned.error.toLowerCase().includes("not connected")
          ? "PADDLE_NOT_CONNECTED"
          : "PADDLE_PROVISION_FAILED",
      },
      { status }
    );
  }

  const savedPlans = mergeProvisionedPriceIds(plans, provisioned.planPriceIds);
  const { starterPriceId, proPriceId } = starterAndProPriceIds(savedPlans);

  const completedSteps = new Set<StepId>((typedProject.completed_steps ?? []) as StepId[]);
  completedSteps.add("payments");

  const { data: updated, error: updateError } = await supabase
    .from("projects")
    .update({
      paddle_provisioned: true,
      paddle_client_token: provisioned.clientToken,
      paddle_api_key: provisioned.apiKey,
      paddle_webhook_secret: provisioned.webhookSecret,
      paddle_webhook_url: provisioned.webhookUrl,
      paddle_starter_price_id: starterPriceId,
      paddle_pro_price_id: proPriceId,
      paddle_plans: savedPlans,
      paddle_notification_setting_id: provisioned.notificationSettingId,
      completed_steps: Array.from(completedSteps),
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select(PROJECT_COLUMNS)
    .maybeSingle();

  if (updateError || !updated) {
    return NextResponse.json(
      { error: "Paddle resources created but failed to save project state." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    data: updated as Project,
    env: provisioned.env,
  });
}
