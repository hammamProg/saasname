"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Coins, LayoutDashboard, Loader2, Search, Settings } from "lucide-react";
import { cn } from "@/libs/cn";

type AppSidebarProps = {
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
  },
  {
    href: "/dashboard/searches",
    label: "Reports",
    icon: Search,
    exact: false,
  },
  {
    href: "/dashboard/credits",
    label: "Credits",
    icon: Coins,
    exact: false,
  },
  {
    href: "/dashboard/settings",
    label: "Settings",
    icon: Settings,
    exact: false,
  },
] as const;

function isActive(pathname: string, href: string, exact: boolean) {
  if (exact) {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AppSidebar({
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
                    : "text-muted hover:bg-surface hover:text-foreground"
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
          </Link>
        );
      })}
    </nav>
  );
}
