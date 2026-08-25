"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import HeaderAuth from "@/components/HeaderAuth";
import BrandLogo from "@/components/BrandLogo";
import ButtonCheckout from "@/components/ButtonCheckout";

const links = [
  { href: "#features", label: "Features" },
  { href: "#pricing", label: "Pricing" },
  { href: "#testimonials", label: "Reviews" },
  { href: "#faq", label: "FAQ" },
];

type HeaderProps = {
  variant?: "default" | "landing";
};

export default function Header({ variant = "default" }: HeaderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const isLanding = variant === "landing";

  return (
    <header
      className={
        isLanding
          ? "sticky top-0 z-50 border-b border-brand-cyan/10 bg-brand-ink/90 backdrop-blur-xl"
          : "border-b border-border/70 bg-background"
      }
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <BrandLogo size="lg" />

        <div className="hidden items-center gap-8 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm font-medium transition-colors ${
                isLanding
                  ? "text-muted hover:text-foreground"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/dashboard"
            className="text-sm font-medium text-muted transition-colors hover:text-foreground"
          >
            Dashboard
          </Link>
          {isLanding ? (
            <ButtonCheckout
              label="Get SaaSNa.me"
              source="landing"
              extraStyle="btn-gradient !px-5 !py-2.5 text-sm"
            />
          ) : (
            <HeaderAuth />
          )}
        </div>

        <button
          type="button"
          className="rounded-lg p-2 text-muted hover:bg-surface md:hidden"
          aria-label="Toggle menu"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </nav>

      {isOpen && (
        <div
          className={`border-t px-4 py-4 backdrop-blur-xl md:hidden ${
            isLanding
              ? "border-brand-cyan/10 bg-brand-ink/95"
              : "border-border bg-background/95"
          }`}
        >
          <div className="flex flex-col gap-3">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium"
                onClick={() => setIsOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <Link href="/dashboard" className="text-sm font-medium" onClick={() => setIsOpen(false)}>
              Dashboard
            </Link>
            {isLanding ? (
              <ButtonCheckout
                label="Get SaaSNa.me"
                source="landing"
                extraStyle="btn-gradient w-full !py-2.5 text-sm"
              />
            ) : (
              <HeaderAuth className="!w-full" />
            )}
          </div>
        </div>
      )}
    </header>
  );
}
