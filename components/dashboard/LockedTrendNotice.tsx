import Link from "next/link";
import { ArrowRight, Lock } from "lucide-react";

/** Shown instead of a trend detail page when the topic is one of the locked
 *  strongest trends and the account is on Free. */
export default function LockedTrendNotice() {
  return (
    <div className="mx-auto max-w-xl rounded-2xl border border-primary/25 bg-primary-soft/40 p-10 text-center">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-white">
        <Lock size={22} aria-hidden />
      </span>
      <h1 className="section-heading mt-6 text-2xl font-extrabold">
        This is one of the strongest trends right now.
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        The highest-scoring trends are part of Pro. Upgrade to see what it is,
        why it&apos;s moving, and the evidence behind it.
      </p>
      <div className="mt-7 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <Link href="/dashboard/billing" className="btn-gradient px-6 py-3 text-sm">
          See Pro
          <ArrowRight size={16} />
        </Link>
        <Link
          href="/dashboard"
          className="text-sm font-medium text-muted underline-offset-4 hover:text-foreground hover:underline"
        >
          Back to your trends
        </Link>
      </div>
    </div>
  );
}
