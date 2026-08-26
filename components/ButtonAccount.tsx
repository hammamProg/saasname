"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, CreditCard, Globe, Loader2, LogOut } from "lucide-react";
import { createClient } from "@/libs/supabase/client";
import { useUser } from "@/components/Providers";
import ButtonSignin from "@/components/ButtonSignin";
import apiClient, { ApiError } from "@/libs/api";
import { cn } from "@/libs/cn";

type ButtonAccountProps = {
  variant?: "default" | "sidebar";
};

export default function ButtonAccount({ variant = "default" }: ButtonAccountProps) {
  const { user } = useUser();
  const [open, setOpen] = useState(false);
  const [billingLoading, setBillingLoading] = useState(false);
  // Google throttles avatar URLs (429); fall back to the initial badge.
  const [avatarFailed, setAvatarFailed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // An open menu must close when focus goes elsewhere. Without this the panel
  // stays pinned over the sidebar while you interact with the rest of the page.
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

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

    try {
      const { url } = await apiClient.post<{ url: string }>("/paddle/portal", {});
      window.location.href = url;
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        window.location.href = "/#pricing";
        return;
      }
      console.error("[billing]", error);
      setBillingLoading(false);
      setOpen(false);
    }
  };

  const isSidebar = variant === "sidebar";

  // Menu rows follow the same shape as the sidebar nav items so the two read as
  // one component rather than two different menus stacked on each other.
  const itemClass = cn(
    "flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm font-medium transition-colors",
    "disabled:cursor-not-allowed disabled:opacity-60",
    isSidebar
      ? "text-brand-cyan/70 hover:bg-white/5 hover:text-brand-cyan"
      : "text-muted hover:bg-surface hover:text-foreground"
  );

  return (
    <div ref={containerRef} className={isSidebar ? "relative w-full" : "relative inline-block"}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account menu for ${name}`}
        className={cn(
          "flex items-center gap-3 rounded-xl text-sm font-semibold transition-colors",
          isSidebar
            ? "w-full border border-brand-cyan/15 bg-brand-blue/15 px-3 py-2.5 text-brand-cyan hover:bg-brand-blue/25"
            : "border-2 border-foreground bg-surface px-3 py-2 font-bold"
        )}
      >
        {avatar && !avatarFailed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatar}
            alt=""
            onError={() => setAvatarFailed(true)}
            className={cn(
              "h-8 w-8 shrink-0 rounded-full object-cover",
              isSidebar && "ring-2 ring-brand-cyan/20"
            )}
          />
        ) : (
          <span
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold",
              isSidebar
                ? "bg-brand-cyan/20 text-brand-violet"
                : "bg-primary-soft"
            )}
          >
            {initial}
          </span>
        )}
        <span className="min-w-0 flex-1 truncate text-left">{name}</span>
        <ChevronDown
          size={16}
          aria-hidden="true"
          className={cn(
            "shrink-0 transition-transform",
            isSidebar ? "text-brand-cyan/60" : "text-muted",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Account"
          className={cn(
            "animate-popup absolute z-10 overflow-hidden rounded-xl p-1 shadow-xl",
            isSidebar
              ? "bottom-full left-0 mb-2 w-full border border-brand-cyan/15 bg-brand-ink shadow-black/30"
              : "right-0 mt-2 w-48 border border-border bg-card"
          )}
        >
          <Link
            href="/"
            role="menuitem"
            className={cn(itemClass, "rounded-lg")}
            onClick={() => setOpen(false)}
          >
            <Globe size={18} className="shrink-0" aria-hidden="true" />
            <span>View site</span>
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={handleBilling}
            disabled={billingLoading}
            className={cn(itemClass, "rounded-lg")}
          >
            {billingLoading ? (
              <Loader2 size={18} className="shrink-0 animate-spin" aria-hidden="true" />
            ) : (
              <CreditCard size={18} className="shrink-0" aria-hidden="true" />
            )}
            <span>{billingLoading ? "Opening…" : "Billing"}</span>
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={handleSignOut}
            disabled={billingLoading}
            className={cn(itemClass, "rounded-lg")}
          >
            <LogOut size={18} className="shrink-0" aria-hidden="true" />
            <span>Logout</span>
          </button>
        </div>
      )}
    </div>
  );
}
