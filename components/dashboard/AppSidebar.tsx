"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  FolderKanban,
  LayoutDashboard,
  Loader2,
  Plug,
  Rocket,
  Settings,
} from "lucide-react";
import config from "@/config";
import { cn } from "@/libs/cn";

type AppSidebarProps = {
  hasAccess: boolean;
  onNavigate?: () => void;
  className?: string;
  theme?: "light" | "dark";
};

const navItems = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    exact: true,
    requiresAccess: false,
  },
  {
    href: "/dashboard/projects",
    label: "Projects",
    icon: FolderKanban,
    exact: false,
    requiresAccess: true,
  },
  {
    href: "/dashboard/shipnow",
    label: "ShipNow",
    icon: Rocket,
    exact: false,
    requiresAccess: true,
  },
  {
    href: "/dashboard/integrations",
    label: "Integrations",
    icon: Plug,
    exact: false,
    requiresAccess: true,
  },
  {
    href: "/dashboard/settings",
    label: "Settings",
    icon: Settings,
    exact: false,
    requiresAccess: false,
  },
] as const;

function isActive(pathname: string, href: string, exact: boolean) {
  if (exact) {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AppSidebar({
  hasAccess,
  onNavigate,
  className,
  theme = "light",
}: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const isDark = theme === "dark";

  useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  function handleNavigate(href: string) {
    if (href === pathname) {
      onNavigate?.();
      return;
    }
    setPendingHref(href);
    startTransition(() => {
      router.push(href);
      onNavigate?.();
    });
  }

  return (
    <nav className={cn("flex flex-col gap-1 px-3 py-4", className)}>
      {navItems.map((item) => {
        const active = isActive(pathname, item.href, item.exact);
        const pending = pendingHref === item.href;
        const locked = item.requiresAccess && !hasAccess;
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch
            onMouseEnter={() => router.prefetch(item.href)}
            onClick={(event) => {
              event.preventDefault();
              handleNavigate(item.href);
            }}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
              isDark
                ? active
                  ? "border border-brand-cyan/20 bg-brand-blue/25 text-brand-cyan shadow-sm shadow-brand-blue/10"
                  : pending
                    ? "bg-white/5 text-brand-cyan"
                    : "text-brand-cyan/70 hover:bg-white/5 hover:text-brand-cyan"
                : active
                  ? "bg-primary-soft text-primary"
                  : pending
                    ? "bg-surface text-foreground"
                    : "text-muted hover:bg-surface hover:text-foreground",
              locked && !active && "opacity-60"
            )}
          >
            {pending ? (
              <Loader2 size={18} className="shrink-0 animate-spin" />
            ) : (
              <Icon
                size={18}
                className={cn(
                  active && (isDark ? "text-brand-violet" : "text-primary")
                )}
              />
            )}
            <span>{item.label}</span>
            {locked && (
              <span
                className={cn(
                  "ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                  isDark
                    ? "bg-brand-blue/30 text-brand-violet"
                    : "bg-surface text-muted"
                )}
              >
                Pro
              </span>
            )}
          </Link>
        );
      })}

      {!hasAccess && (
        <p
          className={cn(
            "mt-4 rounded-xl px-3 py-3 text-xs leading-relaxed",
            isDark
              ? "border border-brand-cyan/10 bg-brand-blue/10 text-brand-cyan/80"
              : "text-muted"
          )}
        >
          Unlock Projects, {config.appName}, and Integrations with a lifetime plan on Dashboard.
        </p>
      )}
    </nav>
  );
}
