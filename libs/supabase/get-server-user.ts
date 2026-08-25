import type { User } from "@supabase/supabase-js";
import { isAuthConfigured } from "@/libs/auth";
import { createClient } from "@/libs/supabase/server";

/** Read the current user on the server for SSR-safe auth UI. */
export async function getServerUser(): Promise<User | null> {
  if (!isAuthConfigured()) {
    return null;
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    return user;
  } catch {
    return null;
  }
}
