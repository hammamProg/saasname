import Link from "next/link";
import { ArrowRight, Rocket } from "lucide-react";
import MarketingBackdrop from "@/components/ui/MarketingBackdrop";

export default function CTA() {
  return (
    <section className="relative overflow-hidden py-20 sm:py-28">
      <MarketingBackdrop variant="section" />

      <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6">
        <div className="overflow-hidden rounded-3xl border border-brand-mint/20 bg-gradient-to-br from-brand-teal via-brand-teal to-brand-navy p-10 shadow-2xl shadow-brand-teal/25 sm:p-14">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-mint/15 text-brand-mint backdrop-blur">
            <Rocket size={28} />
          </div>
          <h2 className="section-heading mt-6 text-3xl font-extrabold text-white sm:text-4xl">
            Ready to ship your SaaS?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-brand-mint/90">
            Join makers who launch in days with auth, payments, and a guided setup workspace built
            in.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="#pricing"
              className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3.5 text-sm font-bold text-primary shadow-lg transition-transform hover:scale-[1.02]"
            >
              View lifetime pricing
              <ArrowRight size={16} />
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-lg border border-white/30 px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              Go to dashboard
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
