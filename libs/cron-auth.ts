import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

/** Shared cron authentication. Lived under `libs/trends/` because that is
 *  where the first scheduled job happened to be written, but it is
 *  infrastructure rather than trends logic, and the analytics product needs it
 *  too. Kept neutral so neither product depends on the other's module.
 *
 *  Vercel Cron and the pg_cron jobs both send
 *  `Authorization: Bearer $CRON_SECRET`. These routes spend real API quota and
 *  can force pipeline runs, so they must not be triggerable by an
 *  unauthenticated request anywhere that is reachable from the internet. */

/** Constant-time comparison.
 *
 *  A plain `!==` returns as soon as two bytes differ, so response time leaks
 *  how much of the token was correct — enough, over many requests, to
 *  reconstruct it a byte at a time. The length check is deliberately outside
 *  the timed comparison because `timingSafeEqual` throws on mismatched
 *  lengths, and a token of the wrong length reveals nothing useful anyway. */
function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);

  if (left.length !== right.length) return false;

  return timingSafeEqual(left, right);
}

/** Only a developer's own machine gets the unauthenticated shortcut.
 *
 *  Previously any environment where `NODE_ENV !== "production"` was allowed
 *  through without a secret. That is fine locally, but a preview or staging
 *  deploy built without `NODE_ENV=production` would have exposed every
 *  internal route — ingestion, the pipeline, the rollup — to anyone who knew
 *  the URL. Requiring an explicit local marker fails closed by default. */
function isLocalDevelopment(): boolean {
  if (process.env.NODE_ENV === "production") return false;

  // Set by Vercel on every deployment, including previews. Its presence means
  // this is not someone's laptop.
  return !process.env.VERCEL;
}

export function verifyCronRequest(request: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET?.trim();

  if (!secret) {
    if (isLocalDevelopment()) return null;

    return NextResponse.json(
      { error: "CRON_SECRET not configured" },
      { status: 500 },
    );
  }

  const auth = request.headers.get("authorization");

  if (!auth || !safeEqual(auth, `Bearer ${secret}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
