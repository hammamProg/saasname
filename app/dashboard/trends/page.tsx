import { redirect } from "next/navigation";

/** Trends is off for now. Its nightly pipeline calls a paid LLM and
 *  DataForSEO to cluster and score signals (see libs/trends/cluster.ts,
 *  libs/trends/summarize.ts) — that cron is removed in vercel.json, so this
 *  page would otherwise show whatever was scored before the pipeline was
 *  turned off, quietly going stale. Redirecting instead of rendering means
 *  no code path here can accidentally trigger a paid call while it's
 *  disabled. */
export default function TrendsDisabledRedirect() {
  redirect("/dashboard");
}
