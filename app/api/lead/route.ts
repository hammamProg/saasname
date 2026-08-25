import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/libs/supabase";
import {
  sendWaitlistNotificationEmail,
  sendWaitlistWelcomeEmail,
} from "@/libs/waitlist-emails";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(normalizedEmail)) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();

    if (!supabase) {
      console.log("[waitlist] New lead (database not configured):", normalizedEmail);
      await sendWaitlistWelcomeEmail(normalizedEmail);
      await sendWaitlistNotificationEmail(normalizedEmail);
      return NextResponse.json({ success: true });
    }

    const { error } = await supabase
      .from("leads")
      .insert({ email: normalizedEmail });

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "This email is already on the waitlist" },
          { status: 409 }
        );
      }

      console.error("[waitlist] Database error:", error.message);
      return NextResponse.json(
        { error: "Failed to save email" },
        { status: 500 }
      );
    }

    await Promise.all([
      sendWaitlistWelcomeEmail(normalizedEmail),
      sendWaitlistNotificationEmail(normalizedEmail),
    ]);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
