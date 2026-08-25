"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, Sparkles } from "lucide-react";
import apiClient from "@/libs/api";
import type { ProfileAccess } from "@/libs/access";
import SubscriptionPlans from "@/components/SubscriptionPlans";
import PaymentStepper from "@/components/dashboard/PaymentStepper";
import MarketingBackdrop from "@/components/ui/MarketingBackdrop";

const PREMIUM_PATH = "/dashboard";
const SUCCESS_REDIRECT_MS = 2000;
const MAX_POLL_ATTEMPTS = 15;

type AccessResponse = {
  has_access: boolean;
  subscription_status: string | null;
  current_period_end: string | null;
};

type DashboardAccessProps = {
  initialHasAccess: boolean;
  initialAccess: ProfileAccess | null;
  displayName?: string;
};

type PanelPhase = "idle" | "activating" | "success" | "pending";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function DashboardAccess({
  initialHasAccess,
  initialAccess,
  displayName = "there",
}: DashboardAccessProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const checkoutSuccess = searchParams.get("checkout") === "success";
  const redirectScheduled = useRef(false);

  const [access, setAccess] = useState(initialAccess);
  const [phase, setPhase] = useState<PanelPhase>(
    checkoutSuccess && !initialHasAccess ? "activating" : "idle"
  );
  const [message, setMessage] = useState<string | null>(
    checkoutSuccess && !initialHasAccess
      ? "Payment received! Confirming your purchase with Paddle…"
      : null
  );

  const [syncing, setSyncing] = useState(false);

  const goToPremium = useCallback(() => {
    if (redirectScheduled.current) {
      return;
    }
    redirectScheduled.current = true;
    setPhase("success");
    setMessage("Payment successful! Opening your dashboard…");
    window.setTimeout(() => router.push(PREMIUM_PATH), SUCCESS_REDIRECT_MS);
  }, [router]);

  const pollAccess = useCallback(async (): Promise<boolean> => {
    try {
      await apiClient.post("/paddle/sync", {});
    } catch (error) {
      console.error("[dashboard] paddle sync failed:", error);
    }

    const result = await apiClient.get<AccessResponse>("/access");

    if (!result.has_access) {
      return false;
    }

    setAccess((current) => ({
      has_access: true,
      subscription_status: result.subscription_status,
      paddle_customer_id: current?.paddle_customer_id ?? null,
      paddle_subscription_id: current?.paddle_subscription_id ?? null,
      paddle_price_id: current?.paddle_price_id ?? null,
      current_period_end: result.current_period_end,
    }));

    return true;
  }, []);

  const waitForWebhookAccess = useCallback(async () => {
    setPhase("activating");
    setMessage("Payment received! Confirming your purchase with Paddle…");

    for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt += 1) {
      try {
        if (await pollAccess()) {
          goToPremium();
          return;
        }
      } catch (error) {
        console.error("[dashboard] access poll failed:", error);
      }

      await sleep(attempt < 5 ? 1000 : 2000);
    }

    setPhase("pending");
    setMessage(
      "Payment received but access is not active yet. Use “Sync my access” below — local dev needs ngrok for Paddle webhooks."
    );
  }, [goToPremium, pollAccess]);

  const handleManualSync = useCallback(async () => {
    setSyncing(true);
    setMessage(null);
    try {
      if (await pollAccess()) {
        goToPremium();
        return;
      }
      setMessage("No completed Paddle payment was found for your account yet.");
    } catch (error) {
      console.error("[dashboard] manual sync failed:", error);
      setMessage("Could not sync access. Try again in a few seconds.");
    } finally {
      setSyncing(false);
    }
  }, [goToPremium, pollAccess]);

  useEffect(() => {
    if (!checkoutSuccess) {
      return;
    }

    if (initialHasAccess) {
      goToPremium();
      return;
    }

    void waitForWebhookAccess();
  }, [checkoutSuccess, goToPremium, initialHasAccess, waitForWebhookAccess]);

  if (phase === "success") {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-10 text-center shadow-lg shadow-emerald-100">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-600/30">
          <CheckCircle2 size={32} />
        </div>
        <h2 className="mt-5 text-2xl font-extrabold text-emerald-950">You&apos;re in!</h2>
        <p className="mt-2 text-sm text-emerald-800">{message}</p>
        <PaymentStepper phase={phase} className="mt-8 justify-center" />
      </div>
    );
  }

  if (phase === "activating") {
    return (
      <div className="space-y-6">
        <PaymentStepper phase={phase} />
        <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-card p-10 text-center shadow-sm">
          <MarketingBackdrop variant="dashboard" className="opacity-50" />
          <div className="relative">
            <Loader2 size={40} className="mx-auto animate-spin text-primary" />
            <h2 className="mt-5 text-xl font-extrabold">Confirming your purchase</h2>
            <p className="mt-2 text-sm text-muted">{message}</p>
            <p className="mt-4 text-xs text-muted">This usually takes a few seconds.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PaymentStepper phase={phase} />

      {message && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900">
          <p>{message}</p>
          {phase === "pending" && (
            <button
              type="button"
              onClick={() => void handleManualSync()}
              disabled={syncing}
              className="mt-3 inline-flex items-center gap-2 rounded-lg bg-amber-900 px-4 py-2 text-xs font-bold text-white disabled:opacity-60"
            >
              {syncing ? "Syncing…" : "Sync my access"}
            </button>
          )}
        </div>
      )}

      <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-8 shadow-sm sm:p-10">
        <MarketingBackdrop variant="dashboard" className="opacity-40" />
        <div className="relative space-y-3">
        <p className="text-sm font-semibold uppercase tracking-wider text-primary">Step 2 · Choose your plan</p>
        <h2 className="section-heading text-2xl font-extrabold sm:text-3xl">
          Welcome, {displayName} — unlock your launchpad
        </h2>
        <p className="max-w-2xl text-muted">
          One-time payment for lifetime access. After checkout you&apos;ll land on the setup guide
          with Composio integrations to ship your SaaS faster.
        </p>
        {access?.subscription_status && !access.has_access && (
          <p className="text-sm text-muted">
            Previous status: {access.subscription_status}
          </p>
        )}
      </div>

        <div className="relative mt-8">
          <SubscriptionPlans variant="dashboard" />
        </div>
      </div>

    </div>
  );
}
