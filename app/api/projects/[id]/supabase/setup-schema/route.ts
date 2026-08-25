import { NextResponse } from "next/server";
import {
  loadAuthSchemaSetupContext,
  persistAuthSchemaOptions,
  runAuthSchemaSetupStep,
} from "@/libs/supabase-auth-schema-setup";
import { normalizeSupabaseAuthSchemaOptions } from "@/libs/supabase-auth-schema";
import { createClient } from "@/libs/supabase/server";
import { getAuthUser, unauthorizedResponse } from "@/libs/supabase/auth-api";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const user = await getAuthUser();
  if (!user) return unauthorizedResponse();

  let body: {
    step?: string;
    schema_options?: { leads?: boolean; profiles?: boolean };
  } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  if (body.step !== "schema_leads" && body.step !== "schema_profiles") {
    return NextResponse.json(
      { error: 'Request body must include step: "schema_leads" or "schema_profiles".' },
      { status: 400 }
    );
  }

  const { id } = await context.params;
  const supabase = await createClient();
  const setupContext = await loadAuthSchemaSetupContext(supabase, user.id, id, body);

  if ("error" in setupContext && "status" in setupContext) {
    return NextResponse.json(
      { error: setupContext.error, code: setupContext.code },
      { status: setupContext.status }
    );
  }

  const result = await runAuthSchemaSetupStep(
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

export async function PATCH(request: Request, context: RouteContext) {
  const user = await getAuthUser();
  if (!user) return unauthorizedResponse();

  let body: { schema_options?: { leads?: boolean; profiles?: boolean } } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const schemaOptions = normalizeSupabaseAuthSchemaOptions(body.schema_options);
  const { id } = await context.params;
  const supabase = await createClient();
  const updated = await persistAuthSchemaOptions(supabase, user.id, id, schemaOptions);

  if (!updated) {
    return NextResponse.json({ error: "Failed to save schema options." }, { status: 400 });
  }

  return NextResponse.json({ data: updated });
}
