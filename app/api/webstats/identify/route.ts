import { createSupabaseAdmin } from "@/libs/supabase";
import { serverIdentify } from "@/libs/webstats/collect";

/** Secure server-side identify(): a backend can link a visitor to a user
 *  without exposing the visitor cookie/JS SDK to itself, e.g. from a signup
 *  webhook that only fires server-side.
 *
 *  Authenticated with the site's write_key (webstats_sites.write_key), not
 *  the public site id — that one sits in a script tag on purpose, this must
 *  never leave the customer's server. */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request): Promise<Response> {
  const auth = request.headers.get("authorization") ?? "";
  const writeKey = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";

  if (!UUID.test(writeKey)) {
    return Response.json({ error: "Missing or invalid write key" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return Response.json({ error: "Invalid body" }, { status: 400 });
  }

  const data = body as Record<string, unknown>;
  const siteId = typeof data.site_id === "string" ? data.site_id.trim() : "";
  const visitorId = typeof data.visitor_id === "string" ? data.visitor_id.trim() : "";
  const userId = typeof data.user_id === "string" ? data.user_id.trim() : "";

  if (!UUID.test(siteId) || !UUID.test(visitorId) || !userId || userId.length > 200) {
    return Response.json({ error: "Invalid site_id, visitor_id or user_id" }, { status: 400 });
  }

  const admin = createSupabaseAdmin();
  if (!admin) {
    console.error("[webstats] identify called without service-role credentials");
    return Response.json({ error: "Not configured" }, { status: 500 });
  }

  const { data: site, error } = await admin
    .from("webstats_sites")
    .select("id")
    .eq("id", siteId)
    .eq("write_key", writeKey)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    console.error("[webstats] identify site lookup failed", error);
    return Response.json({ error: "Lookup failed" }, { status: 500 });
  }

  // Wrong site id, wrong write key, or someone else's site: every one of
  // these reads the same to the caller, so a write key cannot be probed
  // against site ids it does not belong to.
  if (!site) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await serverIdentify(admin, siteId, visitorId, userId);
  } catch (err) {
    console.error("[webstats] server identify failed", err);
    return Response.json({ error: "Identify failed" }, { status: 500 });
  }

  return Response.json({ ok: true });
}
