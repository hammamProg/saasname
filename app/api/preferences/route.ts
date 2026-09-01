import { NextResponse } from "next/server";
import { getAuthUser, unauthorizedResponse } from "@/libs/supabase/auth-api";
import { saveUserPreferences } from "@/libs/trends/preferences";
import { CATEGORY_SLUGS } from "@/libs/trends/types";

const MIN_CATEGORIES = 3;

export async function POST(request: Request) {
  const user = await getAuthUser();

  if (!user) {
    return unauthorizedResponse();
  }

  let body: { selectedCategories?: unknown };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const selectedCategories = Array.isArray(body.selectedCategories)
    ? body.selectedCategories.filter((c): c is string =>
        (CATEGORY_SLUGS as readonly string[]).includes(c as string)
      )
    : [];

  // A skipped/empty selection is valid and defaults the feed to all
  // categories (design doc: onboarding must never leave the feed empty).
  if (selectedCategories.length > 0 && selectedCategories.length < MIN_CATEGORIES) {
    return NextResponse.json(
      { error: `Choose at least ${MIN_CATEGORIES} interests, or none to see everything.` },
      { status: 400 }
    );
  }

  await saveUserPreferences(user.id, selectedCategories);

  return NextResponse.json({ selectedCategories });
}
