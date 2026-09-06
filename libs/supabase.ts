import { createClient, SupabaseClient } from "@supabase/supabase-js";
import ws from "ws";

/** Service-role client for server-side jobs (ingestion, the nightly pipeline).
 *  Never import this into anything that reaches the browser — it holds the key
 *  that bypasses RLS.
 *
 *  `realtime.transport` is supplied because supabase-js builds a RealtimeClient
 *  eagerly in its constructor, and that constructor throws outright on Node 20,
 *  which has no global WebSocket. We never open a realtime channel, but the
 *  client cannot even be created without a transport to hand it — so without
 *  this every ingest and pipeline route fails at the first line. Node 22 has a
 *  native WebSocket and would not need it; passing it explicitly keeps the
 *  behaviour identical on both. */
export function createSupabaseAdmin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return null;
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    // `ws` is structurally compatible at runtime but its constructor overloads
    // are typed more loosely than supabase's WebSocketLikeConstructor, so the
    // assignment needs a cast. Nothing here is ever invoked — the transport
    // only has to exist for the constructor to complete.
    realtime: { transport: ws as unknown as never },
  });
}
