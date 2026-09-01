import { NextResponse } from "next/server";

/** Vercel Cron sends `Authorization: Bearer $CRON_SECRET` when the env var
 *  is set on the project. Ingestion routes spend real API quota per call, so
 *  they must not be triggerable by an unauthenticated request in production.
 *  Locally, where CRON_SECRET is usually unset, requests are allowed so a
 *  developer can hit the route directly while testing a connector. */
export function verifyCronRequest(request: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET?.trim();

  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { error: "CRON_SECRET not configured" },
        { status: 500 }
      );
    }
    return null;
  }

  const auth = request.headers.get("authorization");

  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
