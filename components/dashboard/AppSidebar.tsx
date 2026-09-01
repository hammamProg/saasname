"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Coins, Compass, Loader2, Settings } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/libs/cn";

type AppSidebarProps = {
  onNavigate?: () => void;
  className?: string;
  theme?: "light" | "dark";
  /** Rendered as a badge on the Credits row. Omitted rather than shown as 0
   *  when the balance could not be read. */
  creditBalance?: number;
};

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact: boolean;
  /** Marks the row that should carry the live balance. */
  badge?: "credits";
};

/** Grouped rather than a flat list of five. "Where my work is" and "how my
 *  account is set up" are different questions, and a heading each is cheaper
 *  to scan than five equally-weighted rows. */
const NAV_GROUPS: Array<{ label: string; items: NavItem[] }> = [
  {
    label: "Workspace",
    items: [
      { href: "/dashboard", label: "Discover", icon: Compass, exact: true },
    ],
  },
  {
    label: "Account",
    items: [
      {
        href: "/dashboard/credits",
        label: "Credits",
        icon: Coins,
        exact: false,
        badge: "credits",
      },
      { href: "/dashboard/settings", label: "Settings", icon: Settings, exact: false },
    ],
  },
];

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
  creditBalance,
}: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [navigatingTo, setNavigatingTo] = useState<{ href: string; from: string } | null>(null);
  const isDark = theme === "dark";

  // Derived, not stored-then-cleared in an effect. The spinner belongs to the
  // route we left; once pathname changes we have arrived and it is stale, so
  // there is nothing to reset and no extra render pass.
  const pendingHref =
    navigatingTo && navigatingTo.from === pathname ? navigatingTo.href : null;

  function handleNavigate(href: string) {
    if (href === pathname) {
      onNavigate?.();
      return;
    }
    setNavigatingTo({ href, from: pathname });
    startTransition(() => {
      router.push(href);
      onNavigate?.();
    });
  }

  return (
    <nav className={cn("flex flex-col gap-6 px-3 py-4", className)}>
      {NAV_GROUPS.map((group) => (
        <div key={group.label} className="space-y-1">
          <p
            className={cn(
              "px-3 pb-1 text-[10px] font-bold uppercase tracking-[0.12em]",
              isDark ? "text-[#8FA6C6]" : "text-muted"
            )}
          >
            {group.label}
          </p>

          {group.items.map((item) => {
            const active = isActive(pathname, item.href, item.exact);
            const pending = pendingHref === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch
                aria-current={active ? "page" : undefined}
                onMouseEnter={() => router.prefetch(item.href)}
                onClick={(event) => {
                  event.preventDefault();
                  handleNavigate(item.href);
                }}
                className={cn(
                  "group relative flex items-center gap-3 rounded-lg py-2.5 pl-4 pr-3 text-sm font-medium transition-colors",
                  isDark
                    ? active
                      ? "bg-[#0E2A52] text-white"
                      : "text-[#C7D6EA] hover:bg-[#0B2547] hover:text-white"
                    : active
                      ? "bg-primary-soft text-primary"
                      : "text-muted hover:bg-surface hover:text-foreground"
                )}
              >
                {/* A rail rather than a filled pill: it marks the current row
                    without competing with the label and icon. */}
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full transition-all",
                    active
                      ? isDark
                        ? "bg-brand-cyan"
                        : "bg-primary"
                      : "bg-transparent"
                  )}
                />

                {pending ? (
                  <Loader2 size={17} className="shrink-0 animate-spin" aria-hidden="true" />
                ) : (
                  <Icon
                    size={17}
                    className={cn(
                      "shrink-0 transition-colors",
                      active && (isDark ? "text-brand-cyan" : "text-primary")
                    )}
                    aria-hidden="true"
                  />
                )}

                <span className="flex-1 truncate">{item.label}</span>

                {item.badge === "credits" && creditBalance !== undefined && (
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums",
                      creditBalance === 0
                        ? "bg-verdict-blocked/20 text-verdict-blocked"
                        : isDark
                          ? "bg-[#12335F] text-[#C7D6EA]"
                          : "bg-surface text-muted"
                    )}
                  >
                    {creditBalance}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
