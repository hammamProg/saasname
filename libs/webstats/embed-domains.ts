/** Embed allowlist: which domains besides a site's own may load its public
 *  embed (app/embed/live/[id] and /api/webstats/embed/[id]/live).
 *
 *  Two access paths, matching who's asking:
 *  - The dashboard's CRUD (list/add/remove) goes through the user-scoped
 *    client, so ownership is enforced by RLS — see
 *    042_webstats_site_embed_domains.sql.
 *  - The public embed itself has no dashboard session to check ownership
 *    through, so it reads the allowlist via the admin client, scoped only by
 *    site id — same trust model as libs/webstats/live.ts. */

import { createClient } from "@/libs/supabase/server";
import { createSupabaseAdmin } from "@/libs/supabase";
import { normalizeDomain } from "./domain";
import {
  DuplicateEmbedDomainError,
  EmbedDomainLimitError,
  MAX_EMBED_DOMAINS,
  type EmbedDomain,
} from "./embed-domain";

export { DuplicateEmbedDomainError, EmbedDomainLimitError, MAX_EMBED_DOMAINS, type EmbedDomain } from "./embed-domain";

type Row = { id: string; domain: string; created_at: string };

function toEmbedDomain(row: Row): EmbedDomain {
  return { id: row.id, domain: row.domain, createdAt: row.created_at };
}

export async function listEmbedDomains(siteId: string): Promise<EmbedDomain[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("webstats_site_embed_domains")
    .select("id, domain, created_at")
    .eq("site_id", siteId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(`Failed to list embed domains: ${error.message}`);

  return (data ?? []).map(toEmbedDomain);
}

export async function addEmbedDomain(
  ownerId: string,
  siteId: string,
  input: string,
): Promise<EmbedDomain> {
  // DomainError from a bad paste is allowed to propagate — same contract as
  // createSite, whose caller already knows to catch it.
  const domain = normalizeDomain(input);

  const supabase = await createClient();

  const { count, error: countError } = await supabase
    .from("webstats_site_embed_domains")
    .select("id", { count: "exact", head: true })
    .eq("site_id", siteId);

  if (countError) {
    throw new Error(`Failed to check embed domains: ${countError.message}`);
  }

  if ((count ?? 0) >= MAX_EMBED_DOMAINS) {
    throw new EmbedDomainLimitError();
  }

  const { data, error } = await supabase
    .from("webstats_site_embed_domains")
    .insert({ owner_id: ownerId, site_id: siteId, domain })
    .select("id, domain, created_at")
    .single();

  // 23505 is unique_violation — here, (site_id, domain).
  if (error?.code === "23505") {
    throw new DuplicateEmbedDomainError(domain);
  }

  if (error) throw new Error(`Failed to add embed domain: ${error.message}`);

  return toEmbedDomain(data);
}

export async function removeEmbedDomain(id: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("webstats_site_embed_domains")
    .delete()
    .eq("id", id);

  if (error) throw new Error(`Failed to remove embed domain: ${error.message}`);
}

function bareHost(host: string): string {
  return host.trim().toLowerCase().replace(/^www\./, "");
}

/** Whether `hostname` (the parent page embedding the widget, or the caller
 *  of the public API) is allowed to use this site's embed: either the site's
 *  own domain, or one explicitly allowlisted for it. `www.` is ignored on
 *  both sides, same as the ingest hostname check in /api/webstats/event. */
export function isEmbedHostAllowed(
  hostname: string | null,
  siteDomain: string,
  allowlist: string[],
): boolean {
  if (!hostname) return false;

  const bare = bareHost(hostname);

  if (bare === bareHost(siteDomain)) return true;

  return allowlist.some((domain) => bareHost(domain) === bare);
}

/** Admin-scoped read of a site's allowlist, for the public embed page/API —
 *  no session exists there to enforce RLS through. Returns an empty list
 *  (fails closed to "only the site's own domain") rather than throwing, so a
 *  transient database error blocks extra domains instead of taking the whole
 *  widget down. */
export async function getEmbedAllowlist(siteId: string): Promise<string[]> {
  const admin = createSupabaseAdmin();
  if (!admin) return [];

  const { data, error } = await admin
    .from("webstats_site_embed_domains")
    .select("domain")
    .eq("site_id", siteId);

  if (error || !data) return [];

  return data.map((row) => row.domain as string);
}

/** Hostname a request claims to be embedded on, from its Referer header —
 *  the only signal available for a cross-origin iframe load or a direct
 *  fetch to the public API. Malformed or missing resolves to null, which
 *  `isEmbedHostAllowed` treats as not allowed. */
export function refererHostname(referer: string | null): string | null {
  if (!referer) return null;

  try {
    return new URL(referer).hostname;
  } catch {
    return null;
  }
}
