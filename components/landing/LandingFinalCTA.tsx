import Link from "next/link";
import { ArrowRight } from "lucide-react";
import config from "@/config";

export default function LandingFinalCTA() {
  return (
    <section className="relative overflow-hidden py-24 sm:py-32">
      <div
        className="pointer-events-none absolute inset-0 border-y border-border bg-surface"
        aria-hidden
      />

      <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6">
        <h2 className="section-heading text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
          Settle the name{" "}
          <span className="gradient-text">before you build the brand.</span>
        </h2>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted sm:text-xl">
          Six sources, one report, one credit per name. Your first{" "}
          {config.credits.signupGrant} searches are free.
        </p>

        <div className="mt-10 flex justify-center">
          <Link
            href={config.auth.loginUrl}
            className="btn-gradient px-10 py-4 text-base"
          >
            Start free
            <ArrowRight size={18} />
          </Link>
        </div>
      </div>
    </section>
  );
}
