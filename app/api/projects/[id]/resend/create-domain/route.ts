import { NextResponse } from "next/server";
import type { StepId } from "@/app/types";
import { isComposioConfigured } from "@/libs/composio";
import { createResendDomain, getResendConnection } from "@/libs/composio-resend";
import { PROJECT_COLUMNS } from "@/libs/project-fields";
import type { Project } from "@/libs/projects";
import {
  buildResendFromEmail,
  isValidEmail,
  isValidResendDomain,
  normalizeResendDomain,
  RESEND_REGIONS,
} from "@/libs/resend-domain";
import { createClient } from "@/libs/supabase/server";
import { getAuthUser, unauthorizedResponse } from "@/libs/supabase/auth-api";

type RouteContext = { params: Promise<{ id: string }> };

const VALID_REGIONS = new Set(RESEND_REGIONS.map((item) => item.value));

export async function POST(request: Request, context: RouteContext) {
  const user = await getAuthUser();
  if (!user) return unauthorizedResponse();

  if (!isComposioConfigured()) {
    return NextResponse.json(
      { error: "COMPOSIO_API_KEY is not configured. Add it to your .env.local file." },
      { status: 503 }
    );
  }

  const { id } = await context.params;
  let body: {
    domain?: string;
    region?: string;
    from_name?: string;
    support_email?: string;
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

  if (typedProject.resend_domain_added && typedProject.resend_domain_id) {
    return NextResponse.json({ data: typedProject, alreadyAdded: true });
  }

  const region = body.region?.trim() || typedProject.resend_region || "us-east-1";
  const fromName = body.from_name?.trim() || typedProject.resend_from_name?.trim() || typedProject.name;
  const supportEmail = body.support_email?.trim() || typedProject.resend_support_email?.trim() || "";

  if (!VALID_REGIONS.has(region as (typeof RESEND_REGIONS)[number]["value"])) {
    return NextResponse.json({ error: "Invalid Resend region." }, { status: 400 });
  }

  if (!fromName.trim()) {
    return NextResponse.json({ error: "From name is required." }, { status: 400 });
  }

  if (!supportEmail || !isValidEmail(supportEmail)) {
    return NextResponse.json({ error: "A valid support email is required." }, { status: 400 });
  }

  const domainSource = body.domain?.trim() || typedProject.resend_domain || "";
  const domain = normalizeResendDomain(domainSource);
  if (!isValidResendDomain(domain)) {
    return NextResponse.json({ error: "Enter a valid sending domain (e.g. mail.yourdomain.com)." }, { status: 400 });
  }

  const connection = await getResendConnection(user.id);
  if (!connection) {
    return NextResponse.json(
      { error: "Connect Resend first in Integrations.", code: "RESEND_NOT_CONNECTED" },
      { status: 400 }
    );
  }

  const created = await createResendDomain(user.id, connection.connectionId, {
    name: domain,
    region,
  });

  if ("error" in created) {
    return NextResponse.json({ error: created.error }, { status: 400 });
  }

  const completedSteps = new Set<StepId>((typedProject.completed_steps ?? []) as StepId[]);
  completedSteps.add("email");
  completedSteps.delete("email_domain");

  const { data: updated, error: updateError } = await supabase
    .from("projects")
    .update({
      resend_region: region,
      resend_from_name: fromName,
      resend_support_email: supportEmail,
      resend_domain: domain,
      resend_domain_id: created.id,
      resend_domain_status: created.status,
      resend_dns_records: created.records,
      resend_domain_added: true,
      completed_steps: Array.from(completedSteps),
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select(PROJECT_COLUMNS)
    .maybeSingle();

  if (updateError || !updated) {
    return NextResponse.json({ error: "Domain created but failed to save" }, { status: 500 });
  }

  return NextResponse.json({
    data: updated as Project,
    fromEmail: buildResendFromEmail(fromName, domain),
  });
}
