/** Salt lifecycle for the visitor hash. Service-role only — `webstats_salts`
 *  has RLS on with no policy and no grants, so nothing user-facing can read
 *  it. See 022_webstats.sql and the note in identity.ts. */

import { randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

/** How long a retired salt is kept so sessions spanning a rotation still
 *  resolve. Past this the row is deleted and the identifiers it produced
 *  become irreversible — which is the step that makes them anonymous rather
 *  than merely pseudonymous. */
const DESTROY_AFTER_DAYS = 2;

type SaltRow = { salt: string };

/** Supabase returns `bytea` as a `\x`-prefixed hex string over PostgREST. */
function toBuffer(value: string): Buffer {
  return Buffer.from(value.startsWith("\\x") ? value.slice(2) : value, "hex");
}

function utcDay(at: Date = new Date()): string {
  return at.toISOString().slice(0, 10);
}

/** The salts an incoming beacon may be matched against, newest first.
 *
 *  Returns at most two: today's, used for new identifiers, and yesterday's, so
 *  a visitor whose session straddles midnight UTC is recognised rather than
 *  counted as a new person.
 *
 *  Minting is an unconditional insert that ignores conflicts, not a
 *  check-then-insert. Concurrent beacons on a day with no salt yet all attempt
 *  the insert; the unique index on `day` picks one winner and the rest read the
 *  winner's row back. Doing this in application logic instead produced one
 *  salt per concurrent request, and therefore one visitor per request — see
 *  025_webstats_salt_day_key.sql. */
export async function activeSalts(admin: SupabaseClient): Promise<Buffer[]> {
  const { error: insertError } = await admin
    .from("webstats_salts")
    .upsert(
      { day: utcDay(), salt: `\\x${randomBytes(16).toString("hex")}` },
      { onConflict: "day", ignoreDuplicates: true },
    );

  // A failed mint is not fatal on its own: if a salt for today already exists
  // the read below still finds it. Only an empty read is a real problem.
  if (insertError) {
    console.error("[webstats] salt mint failed", insertError.message);
  }

  const { data, error } = await admin
    .from("webstats_salts")
    .select("salt")
    .order("day", { ascending: false })
    .limit(2);

  if (error) throw new Error(`Failed to read salts: ${error.message}`);

  return ((data ?? []) as SaltRow[]).map((row) => toBuffer(row.salt));
}

/** Delete salts past the destruction window. Called from the rollup cron
 *  rather than from ingest, so the hot path never pays for housekeeping. */
export async function destroyExpiredSalts(admin: SupabaseClient): Promise<number> {
  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - DESTROY_AFTER_DAYS);

  const { data, error } = await admin
    .from("webstats_salts")
    .delete()
    .lt("day", utcDay(cutoff))
    .select("day");

  if (error) throw new Error(`Failed to destroy salts: ${error.message}`);

  return (data ?? []).length;
}
