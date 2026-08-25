import { NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/server";
import { getAuthUser, unauthorizedResponse } from "@/libs/supabase/auth-api";
import { slugifyProjectName } from "@/libs/project-slug";
import {
  PROJECT_DESCRIPTION_MAX,
  PROJECT_NAME_MAX,
  type Project,
} from "@/libs/projects";
import { PROJECT_COLUMNS } from "@/libs/project-fields";

export async function GET() {
  const user = await getAuthUser();

  if (!user) {
    return unauthorizedResponse();
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select(PROJECT_COLUMNS)
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("[api/projects] GET:", error.message);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }

  return NextResponse.json({ data: (data ?? []) as Project[] });
}

export async function POST(request: Request) {
  const user = await getAuthUser();

  if (!user) {
    return unauthorizedResponse();
  }

  let body: { name?: string; description?: string };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name = body.name?.trim() ?? "";
  const description = body.description?.trim() || null;

  if (!name) {
    return NextResponse.json({ error: "Project name is required" }, { status: 400 });
  }

  if (name.length > PROJECT_NAME_MAX) {
    return NextResponse.json(
      { error: `Project name must be ${PROJECT_NAME_MAX} characters or fewer` },
      { status: 400 }
    );
  }

  if (description && description.length > PROJECT_DESCRIPTION_MAX) {
    return NextResponse.json(
      { error: `Description must be ${PROJECT_DESCRIPTION_MAX} characters or fewer` },
      { status: 400 }
    );
  }

  const baseSlug = slugifyProjectName(name);
  const supabase = await createClient();

  let slug = baseSlug;
  let suffix = 2;

  while (true) {
    const { data: existing } = await supabase
      .from("projects")
      .select("id")
      .eq("user_id", user.id)
      .eq("slug", slug)
      .maybeSingle();

    if (!existing) {
      break;
    }

    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  const { data, error } = await supabase
    .from("projects")
    .insert({
      user_id: user.id,
      name,
      description,
      slug,
    })
    .select(PROJECT_COLUMNS)
    .single();

  if (error) {
    console.error("[api/projects] POST:", error.message);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }

  return NextResponse.json({ data: data as Project }, { status: 201 });
}
