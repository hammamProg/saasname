import { randomBytes } from "node:crypto";
import { createSupabaseAdmin } from "@/libs/supabase";

/** 24 bytes of base64url. Long enough that a share link cannot be guessed,
 *  which is the only thing standing between a private report and the public. */
export function generateShareToken(): string {
  return randomBytes(24).toString("base64url");
}

/**
 * Turns sharing on or off for a search the caller owns.
 *
 * Revoking clears the token rather than only flipping the flag, so a link that
 * was already copied stops working immediately instead of becoming live again
 * the next time sharing is enabled.
 */
export async function setSearchSharing(
  searchId: string,
  userId: string,
  isPublic: boolean
): Promise<{ shareToken: string | null }> {
  const admin = createSupabaseAdmin();

  if (!admin) {
    throw new Error("Supabase admin client unavailable");
  }

  // Scoped by user_id as well as id: the service role bypasses RLS, so
  // ownership has to be enforced here or anyone could share anyone's report.
  const { data: existing } = await admin
    .from("searches")
    .select("id, share_token")
    .eq("id", searchId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!existing) {
    throw new Error("Search not found");
  }

  if (!isPublic) {
    await admin
      .from("searches")
      .update({ is_public: false, share_token: null })
      .eq("id", searchId)
      .eq("user_id", userId);

    return { shareToken: null };
  }

  // Reuse an existing token so re-sharing does not invalidate a link the owner
  // has already sent to someone.
  const shareToken = (existing.share_token as string | null) ?? generateShareToken();

  await admin
    .from("searches")
    .update({ is_public: true, share_token: shareToken })
    .eq("id", searchId)
    .eq("user_id", userId);

  return { shareToken };
}
