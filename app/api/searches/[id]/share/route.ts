import { NextResponse } from "next/server";
import { getAuthUser, unauthorizedResponse } from "@/libs/supabase/auth-api";
import { setSearchSharing } from "@/libs/searches/share";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getAuthUser();

  if (!user) {
    return unauthorizedResponse();
  }

  let body: { isPublic?: unknown };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body.isPublic !== "boolean") {
    return NextResponse.json({ error: "isPublic must be a boolean" }, { status: 400 });
  }

  try {
    const { shareToken } = await setSearchSharing(id, user.id, body.isPublic);
    return NextResponse.json({ shareToken });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (message.includes("not found")) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    console.error("[api/searches/share]", message);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
