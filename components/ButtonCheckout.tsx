"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import config from "@/config";
import { getCreditPacks } from "@/libs/credits/packs";
import { siteUrl } from "@/libs/seo";
import { getPaddleCheckout, isPaddleClientConfigured } from "@/libs/paddle/client";
import { useUser } from "@/components/Providers";

type ButtonCheckoutProps = {
  extraStyle?: string;
  label?: string;
  priceId?: string;
  source?: "landing" | "dashboard";
};

export default function ButtonCheckout({
  extraStyle = "",
  label,
  priceId,
  source = "dashboard",
}: ButtonCheckoutProps) {
  const router = useRouter();
  const { user } = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resolvedPriceId = priceId ?? getCreditPacks()[0]?.priceId ?? "";
  const buttonLabel = label ?? "Buy credits";

  const handleClick = async () => {
    setError(null);

    if (!isPaddleClientConfigured()) {
      document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" });
      return;
    }

    if (!resolvedPriceId) {
      setError("Add NEXT_PUBLIC_PADDLE_PRICE_ID_CREDITS_25 to .env.local");
      return;
    }

    if (!user) {
      const next =
        source === "landing"
          ? encodeURIComponent("/#pricing")
          : encodeURIComponent("/dashboard");
      router.push(`${config.auth.loginUrl}?next=${next}`);
      return;
    }

    if (source === "landing") {
      router.push("/dashboard");
      return;
    }

    setIsLoading(true);

    try {
      const paddle = await getPaddleCheckout();

      if (!paddle) {
        setError("Paddle checkout is not available");
        return;
      }

      paddle.Checkout.open({
        items: [{ priceId: resolvedPriceId, quantity: 1 }],
        customData: {
          user_id: user.id,
        },
        customer: user.email ? { email: user.email } : undefined,
        settings: {
          successUrl: `${siteUrl}${config.auth.callbackUrl}?checkout=success`,
        },
      });
    } catch (checkoutError) {
      console.error("[checkout]", checkoutError);
      setError("Could not open checkout. Check Paddle dashboard settings.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={isLoading}
        className={`btn-primary px-6 py-3 text-sm disabled:opacity-60 ${extraStyle}`}
      >
        {isLoading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Opening checkout…
          </>
        ) : (
          buttonLabel
        )}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
