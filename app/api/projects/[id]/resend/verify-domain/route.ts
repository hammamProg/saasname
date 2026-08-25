import { NextResponse } from "next/server";
import { isComposioConfigured } from "@/libs/composio";
import { getResendConnection, retrieveResendDomain, verifyResendDomain } from "@/libs/composio-resend";
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

  const typedProject = project as Project;
  if (!typedProject.resend_domain_id) {
    return NextResponse.json({ error: "Add the domain to Resend first." }, { status: 400 });
  }

  const connection = await getResendConnection(user.id);
  if (!connection) {
    return NextResponse.json(
      { error: "Connect Resend first in Integrations.", code: "RESEND_NOT_CONNECTED" },
      { status: 400 }
    );
  }

  const verified = await verifyResendDomain(
    user.id,
    connection.connectionId,
    typedProject.resend_domain_id
  );

  if ("error" in verified) {
    return NextResponse.json({ error: verified.error }, { status: 400 });
  }

  const refreshed = await retrieveResendDomain(
    user.id,
    connection.connectionId,
    typedProject.resend_domain_id
  );

  const status = "error" in refreshed ? verified.status : refreshed.status;
  const records = "error" in refreshed ? typedProject.resend_dns_records : refreshed.records;

  const { data: updated, error: updateError } = await supabase
    .from("projects")
    .update({
      resend_domain_status: status,
      resend_dns_records: records,
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select(PROJECT_COLUMNS)
    .maybeSingle();

  if (updateError || !updated) {
    return NextResponse.json({ error: "Verification ran but failed to save" }, { status: 500 });
  }

  return NextResponse.json({ data: updated as Project, status });
}
