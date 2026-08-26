import Link from "next/link";
import { Coins, Plus } from "lucide-react";
import { getCreditBalance } from "@/libs/credits/balance";

/** Balance in the dashboard top bar. Server-rendered from the layout so it is
 *  present on every dashboard route; `router.refresh()` after a spend is what
 *  keeps it honest, since a layout does not re-render on nested navigation. */
export default async function CreditPill({ userId }: { userId: string }) {
  const balance = await getCreditBalance(userId);
  const isEmpty = balance === 0;
  const isLow = balance > 0 && balance <= 3;

  return (
    <div className="flex items-center gap-2">
      <Link
        href="/dashboard/credits"
        title={`${balance} ${balance === 1 ? "credit" : "credits"} — one credit checks one name`}
        className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors ${
          isEmpty
            ? "border-verdict-blocked/30 bg-verdict-blocked/10 text-verdict-blocked hover:bg-verdict-blocked/15"
            : isLow
              ? "border-verdict-contested/30 bg-verdict-contested/10 text-verdict-contested hover:bg-verdict-contested/15"
              : "border-border bg-surface text-foreground hover:border-primary/30"
        }`}
      >
        <Coins size={15} aria-hidden="true" />
        <span className="tabular-nums">{balance}</span>
        <span className="hidden font-medium text-muted sm:inline">
          {balance === 1 ? "credit" : "credits"}
        </span>
      </Link>

      <Link
        href="/dashboard/credits"
        aria-label="Buy credits"
        className="btn-primary rounded-full px-3 py-1.5 text-xs font-bold"
      >
        <Plus size={14} aria-hidden="true" />
        <span className="hidden sm:inline">Top up</span>
      </Link>
    </div>
  );
}
