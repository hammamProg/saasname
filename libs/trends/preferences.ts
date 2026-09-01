import { createClient } from "@/libs/supabase/server";

export async function getUserPreferences(
  userId: string
): Promise<{ selectedCategories: string[] } | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_preferences")
    .select("selected_categories")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return { selectedCategories: data.selected_categories as string[] };
}

export async function saveUserPreferences(
  userId: string,
  selectedCategories: string[]
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("user_preferences")
    .upsert(
      { user_id: userId, selected_categories: selectedCategories },
      { onConflict: "user_id" }
    );

  if (error) {
    throw new Error(`Failed to save preferences: ${error.message}`);
  }
}
