import Link from "next/link";
import { ArrowRight } from "lucide-react";
import config from "@/config";
import MarketingBackdrop from "@/components/ui/MarketingBackdrop";

export default function LandingFinalCTA() {
  return (
    <section className="relative overflow-hidden py-24 sm:py-28">
      <MarketingBackdrop variant="section" dark />

      <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
        <h2 className="section-heading text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
          Know who&apos;s on your site{" "}
          <span className="gradient-text">right now.</span>
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-muted">
          One script tag, and your first visitor shows up in seconds. Free
          while the product is in beta — no card required.
        </p>

        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-5">
          <Link
            href={config.auth.loginUrl}
            className="btn-gradient px-8 py-3.5 text-sm"
          >
            Start tracking free
            <ArrowRight size={16} />
          </Link>
          <span className="text-sm text-muted">
            Beta — free for now, no card required.
          </span>
        </div>
      </div>
    </section>
  );
}
