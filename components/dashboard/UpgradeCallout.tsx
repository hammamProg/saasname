import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

/** Shown to free accounts under the feed. States plainly what is being held
 *  back — the early stages — rather than teasing a blurred card. A paywall the
 *  user can understand converts better than one that just obstructs, and it
 *  keeps the product honest about what free actually includes. */
export default function UpgradeCallout() {
  return (
    <section className="rounded-2xl border border-primary/25 bg-primary-soft/40 p-7">
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-white">
        <Sparkles size={20} aria-hidden />
      </span>
      <h2 className="mt-5 text-xl font-extrabold tracking-tight">
        The strongest trends are locked.
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
        Free shows you the full feed with the top-scoring trends held back. Pro
        unlocks those, doubles the feed, and lifts the three-topic follow limit.
      </p>
      <Link
        href="/dashboard/billing"
        className="btn-gradient mt-6 inline-flex px-6 py-3 text-sm"
      >
        See Pro
        <ArrowRight size={16} />
      </Link>
    </section>
  );
}
