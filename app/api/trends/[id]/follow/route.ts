import { NextResponse } from "next/server";
import { getAuthUser, unauthorizedResponse } from "@/libs/supabase/auth-api";
import {
  followTopic,
  unfollowTopic,
  FollowLimitReachedError,
} from "@/libs/trends/follows";
import { getProfileAccess } from "@/libs/access";
import { limitsForPlan, planForAccess } from "@/libs/plans";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return unauthorizedResponse();

  const { id } = await params;
  const access = await getProfileAccess(user.id);
  const { followLimit } = limitsForPlan(planForAccess(access?.has_access ?? false));

  try {
    await followTopic(user.id, id, followLimit);
  } catch (error) {
    if (error instanceof FollowLimitReachedError) {
      return NextResponse.json(
        {
          error: `Free plans can follow ${error.limit} topics. Upgrade to Pro for unlimited follows.`,
          upgradeRequired: true,
        },
        { status: 402 }
      );
    }

    console.error("[trends/follow]", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Could not follow topic" }, { status: 500 });
  }

  return NextResponse.json({ followed: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return unauthorizedResponse();

  const { id } = await params;
  await unfollowTopic(user.id, id);

  return NextResponse.json({ followed: false });
}
