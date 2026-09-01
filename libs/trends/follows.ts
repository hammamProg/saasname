import { createClient } from "@/libs/supabase/server";

export async function followTopic(userId: string, topicId: string): Promise<void> {
  const supabase = await createClient();
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
