import { NextResponse } from "next/server";
import { getAuthUser, unauthorizedResponse } from "@/libs/supabase/auth-api";
import { InsufficientCreditsError } from "@/libs/credits/errors";
import { createSearch, MAX_CANDIDATES } from "@/libs/searches/create";
import { TARGET_PLATFORMS, type TargetPlatform } from "@/libs/names/generate";

export const dynamic = "force-dynamic";
/** Up to 8 candidates x 3 probes, six at a time, worst probe 15s. */
export const maxDuration = 60;

const IDEA_MAX_LENGTH = 500;
const SEED_MAX_LENGTH = 50;
const NAME_MAX_LENGTH = 30;

function isTargetPlatform(value: unknown): value is TargetPlatform {
  return (
    typeof value === "string" &&
    (TARGET_PLATFORMS as readonly string[]).includes(value)
  );
}

type Body = {
  mode?: unknown;
  ideaText?: unknown;
  seedName?: unknown;
  targetPlatform?: unknown;
  candidates?: unknown;
};

export async function POST(request: Request) {
  const user = await getAuthUser();

  if (!user) {
    return unauthorizedResponse();
  }

  let body: Body;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const mode = body.mode === "check" ? "check" : "generate";

  if (!isTargetPlatform(body.targetPlatform)) {
    return NextResponse.json(
      { error: `Choose a platform: ${TARGET_PLATFORMS.join(", ")}.` },
      { status: 400 }
    );
  }

  if (!Array.isArray(body.candidates) || body.candidates.length === 0) {
    return NextResponse.json(
      { error: "Pick at least one name to check." },
      { status: 400 }
    );
  }

  if (body.candidates.length > MAX_CANDIDATES) {
    return NextResponse.json(
      { error: `Check at most ${MAX_CANDIDATES} names at once.` },
      { status: 400 }
    );
  }

  const candidates = body.candidates.map((entry) => {
    const record = entry as { name?: unknown; rationale?: unknown };
    return {
      name: typeof record.name === "string" ? record.name.trim() : "",
      rationale:
        typeof record.rationale === "string" ? record.rationale.trim() : undefined,
    };
  });

  if (candidates.some((c) => !c.name || c.name.length > NAME_MAX_LENGTH)) {
    return NextResponse.json(
      { error: `Every name must be 1–${NAME_MAX_LENGTH} characters.` },
      { status: 400 }
    );
  }

  const ideaText =
    typeof body.ideaText === "string"
      ? body.ideaText.trim().slice(0, IDEA_MAX_LENGTH)
      : undefined;
  const seedName =
    typeof body.seedName === "string"
      ? body.seedName.trim().slice(0, SEED_MAX_LENGTH)
      : undefined;

  try {
    const { searchId } = await createSearch({
      userId: user.id,
      mode,
      ideaText,
      seedName,
      targetPlatform: body.targetPlatform,
      candidates,
    });

    return NextResponse.json({ searchId });
  } catch (error) {
    // 402 is the one the client acts on: it routes to the buy-credits page
    // rather than showing a generic failure.
    if (error instanceof InsufficientCreditsError) {
      return NextResponse.json(
        { error: "Not enough credits to check these names." },
        { status: 402 }
      );
    }

    console.error(
      "[api/searches]",
      error instanceof Error ? error.message : error
    );

    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
