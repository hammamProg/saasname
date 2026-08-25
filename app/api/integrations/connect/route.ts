import { NextResponse } from "next/server";
import { createConnectLink, isComposioConfigured } from "@/libs/composio";
import {
  createNangoConnectSession,
  isNangoConfigured,
  isNangoIntegration,
} from "@/libs/nango";
import { getAuthUser, unauthorizedResponse } from "@/libs/supabase/auth-api";

export async function POST(request: Request) {
  const user = await getAuthUser();

  if (!user) {
    return unauthorizedResponse();
  }

  let body: { appName?: string; redirectUrl?: string };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const appName = body.appName?.trim();
  const redirectUrl = body.redirectUrl?.trim();

  if (!appName) {
    return NextResponse.json({ success: false, error: "appName is required" }, { status: 400 });
  }

  if (isNangoIntegration(appName)) {
    if (!isNangoConfigured()) {
      return NextResponse.json(
        { success: false, error: "NANGO_SECRET_KEY is not configured." },
        { status: 503 }
      );
    }

    const result = await createNangoConnectSession(user.id, appName, user.email);
    if ("error" in result) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      connectProvider: "nango",
      sessionToken: result.sessionToken,
    });
  }

  if (!isComposioConfigured()) {
    return NextResponse.json(
      { success: false, error: "COMPOSIO_API_KEY is not configured." },
      { status: 503 }
    );
  }

  if (!redirectUrl) {
    return NextResponse.json(
      { success: false, error: "redirectUrl is required" },
      { status: 400 }
    );
  }

  const result = await createConnectLink(user.id, appName, redirectUrl);

  if ("error" in result) {
    return NextResponse.json({ success: false, error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    connectProvider: "composio",
    redirectUrl: result.redirectUrl,
  });
}
