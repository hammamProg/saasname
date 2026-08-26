"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import ButtonAccount from "@/components/ButtonAccount";
import AppSidebar from "@/components/dashboard/AppSidebar";
import { DashboardAccessProvider } from "@/components/dashboard/DashboardAccessProvider";
import MarketingBackdrop from "@/components/ui/MarketingBackdrop";
import { cn } from "@/libs/cn";

type DashboardShellProps = {
  hasAccess: boolean;
  /** Server-rendered credit balance, passed as a slot so the client shell does
   *  not have to fetch it. */
  credits?: React.ReactNode;
  children: React.ReactNode;
};

function SidebarChrome({
  onNavigate,
  onClose,
}: {
  onNavigate?: () => void;
  onClose?: () => void;
}) {
  return (
    <>
      <div className="flex items-center justify-between border-b border-brand-cyan/10 px-5 py-5">
        <BrandLogo size="lg" href="/dashboard" onDark />
        {onClose && (
          <button
            type="button"
            aria-label="Close menu"
            className="rounded-lg p-2 text-brand-cyan/70 transition-colors hover:bg-white/5 hover:text-brand-cyan lg:hidden"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        <AppSidebar onNavigate={onNavigate} theme="dark" />
      </div>

      <div className="border-t border-brand-cyan/10 p-4">
        <ButtonAccount variant="sidebar" />
      </div>
    </>
  );
}

export default function DashboardShell({
  hasAccess,
  credits,
  children,
}: DashboardShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const closeMobile = () => setMobileOpen(false);

  return (
    <DashboardAccessProvider hasAccess={hasAccess}>
      <div className="flex min-h-screen bg-background lg:h-screen lg:overflow-hidden">
      {/* Column 1 — desktop sidebar */}
      <aside className="hidden w-[280px] shrink-0 flex-col border-r border-brand-cyan/10 bg-brand-ink lg:flex">
        <SidebarChrome />
      </aside>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-brand-ink/60 backdrop-blur-sm lg:hidden"
          onClick={closeMobile}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[min(100vw-3rem,280px)] flex-col border-r border-brand-cyan/10 bg-brand-ink transition-transform duration-200 lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <SidebarChrome onNavigate={closeMobile} onClose={closeMobile} />
      </aside>

      {/* Column 2 — main content */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* One top bar at every width. The balance lives here rather than in
            the page body: it is an account fact, and it belongs next to the
            action that spends it. */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border bg-card/80 px-4 py-3 backdrop-blur-md sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              aria-label="Open menu"
              className="rounded-lg p-2 text-primary transition-colors hover:bg-primary-soft lg:hidden"
              onClick={() => setMobileOpen(true)}
            >
              <Menu size={22} />
            </button>
            <div className="lg:hidden">
              <BrandLogo size="md" href="/dashboard" />
            </div>
            <Link
              href="/"
              className="hidden text-xs font-medium text-muted transition-colors hover:text-primary lg:inline"
            >
              ← Back to site
            </Link>
          </div>

          {credits}
        </header>

        <main className="relative flex-1 overflow-y-auto bg-background">
          <MarketingBackdrop variant="dashboard" cover />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-gradient-to-b from-primary-soft/60 via-primary-soft/15 to-transparent"
          />
          <div className="relative mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
            {children}
          </div>
        </main>

        <footer className="border-t border-border bg-card/50 px-4 py-3 lg:hidden">
          <Link href="/" className="text-xs text-muted transition-colors hover:text-primary">
            ← Back to marketing site
          </Link>
        </footer>
      </div>
      </div>
    </DashboardAccessProvider>
  );
}
