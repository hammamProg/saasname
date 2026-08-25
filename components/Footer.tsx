import Link from "next/link";
import config from "@/config";
import BrandLogo from "@/components/BrandLogo";

type FooterProps = {
  variant?: "default" | "landing";
};

export default function Footer({ variant = "default" }: FooterProps) {
  const isLanding = variant === "landing";

  return (
    <footer
      className={
        isLanding
          ? "border-t border-brand-cyan/10 bg-brand-ink/80 py-12"
          : "border-t border-border bg-surface py-12"
      }
    >
      <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:grid-cols-3 sm:px-6 lg:px-8">
        <div>
          <BrandLogo size="sm" />
          <p className="mt-3 text-sm text-muted">
            Launch your SaaS in days, not months
          </p>
          <p className="mt-6 text-xs text-muted">
            Copyright © {new Date().getFullYear()} — All rights reserved
          </p>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-muted">Links</p>
          <ul className="mt-4 space-y-2 text-sm">
            <li>
              <Link href={config.links.support} className="hover:text-accent">
                Support
              </Link>
            </li>
            <li>
              <Link href="#pricing" className="hover:text-accent">
                Pricing
              </Link>
            </li>
            <li>
              <Link href="/components" className="hover:text-accent">
                Components
              </Link>
            </li>
            <li>
              <Link href="/blog" className="hover:text-accent">
                Blog
              </Link>
            </li>
            <li>
              <Link href={config.links.affiliates} className="hover:text-accent">
                Affiliates
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-muted">Legal</p>
          <ul className="mt-4 space-y-2 text-sm">
            <li>
              <Link href={config.links.terms} className="hover:text-accent">
                Terms of services
              </Link>
            </li>
            <li>
              <Link href={config.links.privacy} className="hover:text-accent">
                Privacy policy
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
