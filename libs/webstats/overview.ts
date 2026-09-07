/** Per-site status for the sites list.
 *
 *  One RPC for the whole list rather than three queries per card. The function
 *  scopes itself to the signed-in user, so this passes no owner id — see
 *  033_webstats_site_overview.sql. */

import { createClient } from "@/libs/supabase/server";

export type SiteOverview = {
  connected: boolean;
  todayVisitors: number;
  onlineVisitors: number;
};

type Row = {
  site_id: string;
  connected: boolean;
  today_visitors: number;
  online_visitors: number;
};

export async function getSiteOverviews(): Promise<Record<string, SiteOverview>> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("webstats_site_overview");

  if (error) throw new Error(`Failed to load site overview: ${error.message}`);

  const byId: Record<string, SiteOverview> = {};

  for (const row of (data ?? []) as Row[]) {
    byId[row.site_id] = {
      connected: row.connected,
      todayVisitors: row.today_visitors,
      onlineVisitors: row.online_visitors,
    };
  }

  return byId;
}
