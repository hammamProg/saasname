/** Site records for the analytics product.
 *
 *  Reads and writes go through the user-scoped Supabase client, so ownership
 *  is enforced by RLS rather than by a `where owner_id = ...` that a future
 *  caller could forget. See 022_webstats.sql. */

import { createClient } from "@/libs/supabase/server";
import { normalizeDomain } from "./domain";

export type Site = {
  id: string;
  name: string;
  domain: string;
  createdAt: string;
};

/** Raised when a user already tracks this domain. Distinct from a generic
 *  failure so the form can point at the field instead of showing an outage. */
export class DuplicateSiteError extends Error {
  constructor(public readonly domain: string) {
    super(`${domain} is already being tracked`);
    this.name = "DuplicateSiteError";
  }
}

/** Raised when the account is at its plan's site cap. */
export class SiteLimitReachedError extends Error {
  constructor(public readonly limit: number) {
    super(`Site limit of ${limit} reached`);
    this.name = "SiteLimitReachedError";
  }
}

type SiteRow = {
  id: string;
  name: string;
  domain: string;
  created_at: string;
};

function toSite(row: SiteRow): Site {
  return {
    id: row.id,
    name: row.name,
    domain: row.domain,
    createdAt: row.created_at,
  };
}

export async function listSites(): Promise<Site[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("webstats_sites")
    .select("id, name, domain, created_at")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to list sites: ${error.message}`);

  return (data ?? []).map(toSite);
}

export async function getSite(siteId: string): Promise<Site | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("webstats_sites")
    .select("id, name, domain, created_at")
    .eq("id", siteId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(`Failed to load site: ${error.message}`);

  return data ? toSite(data) : null;
}

export async function createSite(params: {
  ownerId: string;
  name: string;
  domain: string;
  /** `null` means unlimited. Checked before the write. */
  siteLimit: number | null;
}): Promise<Site> {
  const domain = normalizeDomain(params.domain);
  const name = params.name.trim() || domain;

  const supabase = await createClient();

  if (params.siteLimit !== null) {
    const { count, error: countError } = await supabase
      .from("webstats_sites")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null);

    if (countError) {
      throw new Error(`Failed to count sites: ${countError.message}`);
    }

    if ((count ?? 0) >= params.siteLimit) {
      throw new SiteLimitReachedError(params.siteLimit);
    }
  }

  const { data, error } = await supabase
    .from("webstats_sites")
    .insert({ owner_id: params.ownerId, name, domain })
    .select("id, name, domain, created_at")
    .single();

  // 23505 is unique_violation — here, the partial index over live rows.
  if (error?.code === "23505") {
    throw new DuplicateSiteError(domain);
  }

  if (error) throw new Error(`Failed to create site: ${error.message}`);

  return toSite(data);
}

/** Soft delete, so the historical rollups a site owns stay attributable while
 *  the domain becomes available to register again. */
export async function deleteSite(siteId: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("webstats_sites")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", siteId);

  if (error) throw new Error(`Failed to delete site: ${error.message}`);
}

/** Whether any event has ever arrived for this site. Drives the install
 *  verification state, which is the screen that closes the loop between
 *  "I pasted a script" and "it works". */
export async function hasReceivedEvents(siteId: string): Promise<boolean> {
  const supabase = await createClient();

  const { count, error } = await supabase
    .from("webstats_visit_hourly")
    .select("visit_id", { count: "exact", head: true })
    .eq("site_id", siteId);

  if (error) throw new Error(`Failed to check site activity: ${error.message}`);

  return (count ?? 0) > 0;
}
