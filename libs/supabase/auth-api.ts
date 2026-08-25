import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/libs/supabase/server";

export async function getAuthUser(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

export function unauthorizedResponse() {
  return NextResponse.json({ error: "Not signed in" }, { status: 401 });
}
