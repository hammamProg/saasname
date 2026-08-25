import { NextResponse } from "next/server";
import {
  isSupabaseAuthSetupStepId,
} from "@/libs/supabase-setup-auth-steps";
import {
  loadSupabaseAuthSetupContext,
  runSupabaseAuthSetupStep,
} from "@/libs/supabase-setup-auth-run";
import { createClient } from "@/libs/supabase/server";
import { getAuthUser, unauthorizedResponse } from "@/libs/supabase/auth-api";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const user = await getAuthUser();
  if (!user) return unauthorizedResponse();

  let body: {
    step?: string;
    google_client_id?: string;
    google_client_secret?: string;
    schema_options?: { leads?: boolean; profiles?: boolean };
  } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  if (body.step === "schema_leads" || body.step === "schema_profiles") {
    return NextResponse.json(
      { error: "Use /supabase/setup-schema for schema steps." },
      { status: 400 }
    );
  }

  if (!body.step || !isSupabaseAuthSetupStepId(body.step)) {
    return NextResponse.json(
      { error: 'Request body must include step: "ready", "keys", "schema_leads", "schema_profiles", or "auth".' },
      { status: 400 }
    );
  }

  const { id } = await context.params;
  const supabase = await createClient();
  const setupContext = await loadSupabaseAuthSetupContext(supabase, user.id, id, body);

  if ("error" in setupContext && "status" in setupContext) {
    return NextResponse.json(
      { error: setupContext.error, code: setupContext.code },
      { status: setupContext.status }
    );
  }

  const result = await runSupabaseAuthSetupStep(
    supabase,
    user.id,
    id,
    setupContext,
    body.step
  );

  if ("error" in result) {
    return NextResponse.json({ step: result.step, error: result.error }, { status: result.status });
  }

  return NextResponse.json({ step: result.step, data: result.data });
}
