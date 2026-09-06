import { createClient } from "@/libs/supabase/server";

/** Raised when a free account is already at its follow cap. Distinct from a
 *  generic failure so the route can answer 402 rather than 500 — an upgrade
 *  prompt is a different thing from an outage. */
export class FollowLimitReachedError extends Error {
  constructor(public readonly limit: number) {
    super(`Follow limit of ${limit} reached`);
    this.name = "FollowLimitReachedError";
  }
}

export async function followTopic(
  userId: string,
  topicId: string,
  followLimit: number | null = null
): Promise<void> {
  const supabase = await createClient();

  // Checked before the write, and only when a cap applies. Re-following an
  // already-followed topic must stay idempotent, so an existing row is never
  // counted against the user.
  if (followLimit !== null) {
    const { data: existing } = await supabase
      .from("follows")
      .select("topic_id")
      .eq("user_id", userId);

    const rows = existing ?? [];
    const alreadyFollowed = rows.some((row) => row.topic_id === topicId);

    if (!alreadyFollowed && rows.length >= followLimit) {
      throw new FollowLimitReachedError(followLimit);
    }
  }

  const { error } = await supabase
    .from("follows")
    .upsert({ user_id: userId, topic_id: topicId }, { onConflict: "user_id,topic_id" });

  if (error) throw new Error(`Failed to follow topic: ${error.message}`);
}

export async function unfollowTopic(userId: string, topicId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("follows")
    .delete()
    .eq("user_id", userId)
    .eq("topic_id", topicId);

  if (error) throw new Error(`Failed to unfollow topic: ${error.message}`);
}

export async function hideTopic(
  userId: string,
  topicId: string,
  reason?: string
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("hidden_topics")
    .upsert(
      { user_id: userId, topic_id: topicId, reason: reason ?? null },
      { onConflict: "user_id,topic_id" }
    );

  if (error) throw new Error(`Failed to hide topic: ${error.message}`);
}
