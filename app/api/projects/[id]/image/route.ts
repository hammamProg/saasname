import { NextResponse } from "next/server";
import { PROJECT_COLUMNS } from "@/libs/project-fields";
import {
  PROJECT_IMAGE_BUCKET,
  projectImageStoragePath,
  validateProjectImageFile,
} from "@/libs/project-image";
import type { Project } from "@/libs/projects";
import { createClient } from "@/libs/supabase/server";
import { getAuthUser, unauthorizedResponse } from "@/libs/supabase/auth-api";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const user = await getAuthUser();
  if (!user) return unauthorizedResponse();

  const { id } = await context.params;
  const supabase = await createClient();

  const { data: project, error: fetchError } = await supabase
    .from("projects")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Image file is required" }, { status: 400 });
  }

  const validationError = validateProjectImageFile(file);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const storagePath = projectImageStoragePath(user.id, id, file.type);
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from(PROJECT_IMAGE_BUCKET)
    .upload(storagePath, buffer, {
      upsert: true,
      contentType: file.type,
      cacheControl: "3600",
    });

  if (uploadError) {
    console.error("[api/projects/image] upload:", uploadError.message);
    return NextResponse.json(
      { error: "Could not upload image. Ensure the project-images bucket exists." },
      { status: 502 }
    );
  }

  const { data: publicUrlData } = supabase.storage
    .from(PROJECT_IMAGE_BUCKET)
    .getPublicUrl(storagePath);

  const imageUrl = `${publicUrlData.publicUrl}?v=${Date.now()}`;

  const { data: updated, error: updateError } = await supabase
    .from("projects")
    .update({ image_url: imageUrl })
    .eq("id", id)
    .eq("user_id", user.id)
    .select(PROJECT_COLUMNS)
    .maybeSingle();

  if (updateError || !updated) {
    return NextResponse.json({ error: "Image uploaded but failed to save URL." }, { status: 500 });
  }

  return NextResponse.json({ data: updated as Project });
}
