import Link from "next/link";
import { getCreditBalance } from "@/libs/credits/balance";

export default async function CreditBalance({ userId }: { userId: string }) {
  const balance = await getCreditBalance(userId);
  const isEmpty = balance === 0;

  return (
    <div className="card flex items-center justify-between gap-4 p-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wider text-muted">
          Credits
        </p>
        <p
          className={`text-3xl font-extrabold ${
            isEmpty ? "text-verdict-blocked" : "text-foreground"
          }`}
        >
          {balance}
        </p>
      </div>

      <Link
        href="/dashboard/credits"
        className="btn-primary rounded-xl px-4 py-2 text-sm font-bold"
      >
        {isEmpty ? "Buy credits" : "Top up"}
      </Link>
    </div>
  );
}
