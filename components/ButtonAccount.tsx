"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/libs/supabase/client";
import { useUser } from "@/components/Providers";
import ButtonSignin from "@/components/ButtonSignin";
import apiClient, { ApiError } from "@/libs/api";

type ButtonAccountProps = {
  variant?: "default" | "sidebar";
};

export default function ButtonAccount({ variant = "default" }: ButtonAccountProps) {
  const { user } = useUser();
  const [open, setOpen] = useState(false);
  const [billingLoading, setBillingLoading] = useState(false);
  // Google throttles avatar URLs (429); fall back to the initial badge.
  const [avatarFailed, setAvatarFailed] = useState(false);

  if (!user) {
    return (
      <div className="w-full max-w-xs">
        <ButtonSignin />
      </div>
    );
  }

  const metadata = user.user_metadata as {
    full_name?: string;
    name?: string;
    avatar_url?: string;
    picture?: string;
  };

  const name =
    metadata.full_name ??
    metadata.name ??
    user.email?.split("@")[0] ??
    "User";
  const avatar = metadata.avatar_url ?? metadata.picture;
  const initial = name.charAt(0).toUpperCase();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const handleBilling = async () => {
    setBillingLoading(true);
    setOpen(false);

    try {
      const { url } = await apiClient.post<{ url: string }>("/paddle/portal", {});
      window.location.href = url;
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        window.location.href = "/#pricing";
        return;
      }
      console.error("[billing]", error);
    } finally {
      setBillingLoading(false);
    }
  };

  const isSidebar = variant === "sidebar";

  return (
    <div className={isSidebar ? "relative w-full" : "relative inline-block"}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        disabled={billingLoading}
        className={
          isSidebar
            ? "flex w-full items-center gap-2 rounded-xl border border-brand-cyan/15 bg-brand-blue/15 px-3 py-2.5 text-sm font-semibold text-brand-cyan transition-colors hover:bg-brand-blue/25 disabled:opacity-60"
            : "flex items-center gap-2 rounded-xl border-2 border-foreground bg-surface px-3 py-2 text-sm font-bold disabled:opacity-60"
        }
      >
        {avatar && !avatarFailed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatar}
            alt=""
            onError={() => setAvatarFailed(true)}
            className={isSidebar ? "h-8 w-8 rounded-full object-cover ring-2 ring-brand-cyan/20" : "h-8 w-8 rounded-full object-cover"}
          />
        ) : (
          <span
            className={
              isSidebar
                ? "flex h-8 w-8 items-center justify-center rounded-full bg-brand-cyan/20 text-xs font-bold text-brand-violet"
                : "flex h-8 w-8 items-center justify-center rounded-full bg-primary-soft text-xs"
            }
          >
            {initial}
          </span>
        )}
        <span className="min-w-0 flex-1 truncate text-left">{name}</span>
        <span className={isSidebar ? "text-brand-cyan/60" : "text-muted"}>
          {open ? "⌃" : "⌄"}
        </span>
      </button>

      {open && (
        <div
          className={
            isSidebar
              ? "animate-popup absolute bottom-full left-0 z-10 mb-2 w-full overflow-hidden rounded-xl border border-brand-cyan/15 bg-brand-ink shadow-xl shadow-black/30"
              : "animate-popup absolute right-0 z-10 mt-2 w-48 overflow-hidden rounded-xl border border-border bg-card shadow-xl"
          }
        >
          <Link
            href="/dashboard"
            className={
              isSidebar
                ? "flex items-center gap-2 px-4 py-3 text-sm text-brand-cyan/90 hover:bg-brand-blue/20"
                : "flex items-center gap-2 px-4 py-3 text-sm hover:bg-surface"
            }
            onClick={() => setOpen(false)}
          >
            📊 Dashboard
          </Link>
          <button
            type="button"
            onClick={handleBilling}
            className={
              isSidebar
                ? "flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-brand-cyan/90 hover:bg-brand-blue/20"
                : "flex w-full items-center gap-2 px-4 py-3 text-left text-sm hover:bg-surface"
            }
          >
            💳 Billing
          </button>
          <button
            type="button"
            onClick={handleSignOut}
            className={
              isSidebar
                ? "flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-brand-cyan/90 hover:bg-brand-blue/20"
                : "flex w-full items-center gap-2 px-4 py-3 text-left text-sm hover:bg-surface"
            }
          >
            🚪 Logout
          </button>
        </div>
      )}
    </div>
  );
}
