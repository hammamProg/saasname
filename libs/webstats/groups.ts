/** Site groups: an owner's own labels for splitting the sites list into
 *  sections. Reads and writes go through the user-scoped Supabase client, so
 *  ownership is enforced by RLS — see 035_webstats_site_groups.sql. */

import { createClient } from "@/libs/supabase/server";
import { DuplicateGroupError, type SiteGroup } from "./group-name";

export { MAX_GROUP_NAME, DuplicateGroupError, type SiteGroup } from "./group-name";

type GroupRow = {
  id: string;
  name: string;
  created_at: string;
};

function toGroup(row: GroupRow): SiteGroup {
  return { id: row.id, name: row.name, createdAt: row.created_at };
}

export async function listGroups(): Promise<SiteGroup[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("webstats_site_groups")
    .select("id, name, created_at")
    .order("name", { ascending: true });

  if (error) throw new Error(`Failed to list groups: ${error.message}`);

  return (data ?? []).map(toGroup);
}

export async function createGroup(
  ownerId: string,
  name: string,
): Promise<SiteGroup> {
  const trimmed = name.trim();

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("webstats_site_groups")
    .insert({ owner_id: ownerId, name: trimmed })
    .select("id, name, created_at")
    .single();

  // 23505 is unique_violation — here, the case-insensitive name index.
  if (error?.code === "23505") {
    throw new DuplicateGroupError(trimmed);
  }

  if (error) throw new Error(`Failed to create group: ${error.message}`);

  return toGroup(data);
}

export async function renameGroup(groupId: string, name: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("webstats_site_groups")
    .update({ name: name.trim() })
    .eq("id", groupId);

  if (error?.code === "23505") {
    throw new DuplicateGroupError(name.trim());
  }

  if (error) throw new Error(`Failed to rename group: ${error.message}`);
}

/** Deletes the group itself. Sites in it are not deleted — group_id is set
 *  null by the foreign key's ON DELETE SET NULL, so they fall back into the
 *  ungrouped section rather than disappearing. */
export async function deleteGroup(groupId: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("webstats_site_groups")
    .delete()
    .eq("id", groupId);

  if (error) throw new Error(`Failed to delete group: ${error.message}`);
}

/** Assign a site to a group, or pass `null` to ungroup it. */
export async function setSiteGroup(
  siteId: string,
  groupId: string | null,
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("webstats_sites")
    .update({ group_id: groupId })
    .eq("id", siteId);

  if (error) throw new Error(`Failed to move site: ${error.message}`);
}
