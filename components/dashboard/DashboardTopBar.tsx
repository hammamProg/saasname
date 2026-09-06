import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";
import ButtonAccount from "@/components/ButtonAccount";
import type { PlanId } from "@/libs/plans";

/** Replaces the sidebar. Discover is a single surface, so a nav rail listing
 *  one destination was mostly chrome — this keeps the logo, the plan state and
 *  the account menu, and gives the feed the full width. */
export default function DashboardTopBar({ plan }: { plan: PlanId }) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <BrandLogo size="md" href="/dashboard" />

        <div className="flex items-center gap-3">
          {plan === "free" ? (
            <Link
              href="/dashboard/billing"
              className="btn-gradient px-4 py-2 text-xs sm:text-sm"
            >
              Upgrade
            </Link>
          ) : (
            <Link
              href="/dashboard/billing"
              className="rounded-full bg-primary-soft px-3 py-1.5 text-xs font-semibold text-primary"
            >
              Pro
            </Link>
          )}
          <ButtonAccount />
        </div>
      </div>
    </header>
  );
}
