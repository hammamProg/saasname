import { cache } from "react";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import config from "@/config";
import { createClient } from "@/libs/supabase/server";

/** Redirect unauthenticated visitors to the login page. Use in layouts and server pages. */
export const requireUser = cache(async function requireUser(): Promise<User> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(config.auth.loginUrl);
  }

  return user;
});
