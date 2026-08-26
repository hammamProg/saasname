import { NextResponse } from "next/server";
import { getAuthUser, unauthorizedResponse } from "@/libs/supabase/auth-api";
import { createDeepSeekProvider, isDeepSeekConfigured } from "@/libs/llm/deepseek";
import { LlmError } from "@/libs/llm/provider";
import {
  generateCandidates,
  TARGET_PLATFORMS,
  type TargetPlatform,
} from "@/libs/names/generate";

export const dynamic = "force-dynamic";
/** Two model calls worst case at 15s each, plus overhead. */
/** Two provider calls at the 30s adapter timeout, plus parsing. Generation
 *  retries once when the first batch comes back short. */
export const maxDuration = 75;

const IDEA_MIN_LENGTH = 10;
const IDEA_MAX_LENGTH = 500;
const SEED_MAX_LENGTH = 50;

function isTargetPlatform(value: unknown): value is TargetPlatform {
  return (
    typeof value === "string" &&
    (TARGET_PLATFORMS as readonly string[]).includes(value)
  );
}

export async function POST(request: Request) {
  const user = await getAuthUser();

  if (!user) {
    return unauthorizedResponse();
  }

  // Generation is deliberately free (see the Phase 2 spec). No credit check.

  let body: { idea?: unknown; seedName?: unknown; targetPlatform?: unknown };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const idea = typeof body.idea === "string" ? body.idea.trim() : "";

  if (idea.length < IDEA_MIN_LENGTH || idea.length > IDEA_MAX_LENGTH) {
    return NextResponse.json(
      {
        error: `Describe your idea in ${IDEA_MIN_LENGTH}–${IDEA_MAX_LENGTH} characters.`,
      },
      { status: 400 }
    );
  }

  const seedName =
    typeof body.seedName === "string" ? body.seedName.trim() : undefined;

  if (seedName && seedName.length > SEED_MAX_LENGTH) {
    return NextResponse.json(
      { error: `A seed name must be ${SEED_MAX_LENGTH} characters or fewer.` },
      { status: 400 }
    );
  }

  if (!isTargetPlatform(body.targetPlatform)) {
    return NextResponse.json(
      { error: `Choose a platform: ${TARGET_PLATFORMS.join(", ")}.` },
      { status: 400 }
    );
  }

  if (!isDeepSeekConfigured()) {
    console.error("[api/generate] DEEPSEEK_API_KEY is not configured");
    return NextResponse.json(
      { error: "Name generation is not configured yet." },
      { status: 503 }
    );
  }

  try {
    const candidates = await generateCandidates({
      provider: createDeepSeekProvider(),
      idea,
      seedName,
      targetPlatform: body.targetPlatform,
    });

    return NextResponse.json({ candidates });
  } catch (error) {
    // The upstream message can contain provider detail. Log it, return a
    // generic one: it must never reach the client.
    console.error(
      "[api/generate]",
      error instanceof Error ? error.message : error
    );

    if (error instanceof LlmError) {
      // A timeout is worth distinguishing: the user should retry immediately,
      // whereas a provider outage means waiting. The upstream message itself
      // stays server-side -- it can carry provider detail.
      const timedOut = error.message.includes("timed out");

      return NextResponse.json(
        {
          error: timedOut
            ? "Naming took longer than usual. Try again — it usually works on the second attempt."
            : "Could not generate names right now. Please try again in a moment.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
