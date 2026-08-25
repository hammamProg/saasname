import ButtonCheckout from "@/components/ButtonCheckout";
import { getCreditPacks } from "@/libs/credits/packs";
import { getPriceRecord, describeBillingCycle } from "@/libs/paddle/prices";
import { cn } from "@/libs/cn";

export default async function CreditPacks() {
  const packs = getCreditPacks();

  if (packs.length === 0) {
    return (
      <div className="card p-6 text-sm text-muted">
        No credit packs are configured. Add NEXT_PUBLIC_PADDLE_PRICE_ID_CREDITS_25
        and NEXT_PUBLIC_PADDLE_PRICE_ID_CREDITS_100 to .env.local.
      </div>
    );
  }

  // Amounts come from Paddle, never from config -- see libs/paddle/prices.ts.
  const prices = await getPriceRecord(packs.map((pack) => pack.priceId));

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {packs.map((pack) => {
        const price = prices[pack.priceId];
        const sellable = !price || price.isActive;

        return (
          <div
            key={pack.id}
            className={cn(
              "card flex flex-col gap-4 p-6",
              pack.isFeatured && "ring-1 ring-primary/20"
            )}
          >
            <div>
              <h2 className="text-lg font-bold">{pack.name}</h2>
              <p className="mt-1 text-3xl font-extrabold">
                {price ? price.formatted : "—"}
              </p>
              <p className="text-sm text-muted">
                {pack.credits} credits
                {price && ` · ${describeBillingCycle(price)}`}
              </p>
            </div>

            {sellable ? (
              <ButtonCheckout
                priceId={pack.priceId}
                label={`Buy ${pack.credits} credits`}
                source="dashboard"
                extraStyle="w-full justify-center rounded-xl"
              />
            ) : (
              <p className="rounded-xl border border-border bg-surface px-4 py-3 text-center text-sm text-muted">
                Currently unavailable
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
