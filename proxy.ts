import { type NextRequest } from "next/server";
import { updateSession } from "@/libs/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
