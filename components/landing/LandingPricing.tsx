import { Check, ShieldCheck } from "lucide-react";
import config from "@/config";
import ButtonCheckout from "@/components/ButtonCheckout";
import MarketingBackdrop from "@/components/ui/MarketingBackdrop";

const included = [
  "Full source code",
  "Lifetime access",
  "Future updates",
  "Documentation",
  "Production-ready architecture",
  "Payments integration",
  "Authentication system",
  "Email infrastructure",
];

export default function LandingPricing() {
  const plan =
    config.pricing.plans.find((p) => p.isFeatured) ?? config.pricing.plans[0];

  return (
    <section id="pricing" className="relative overflow-hidden py-20 sm:py-28">
      <MarketingBackdrop variant="section" dark />

      <div className="relative mx-auto max-w-lg px-4 sm:px-6">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-accent">
            Pricing
          </p>
          <h2 className="section-heading mt-2 text-3xl font-extrabold sm:text-4xl lg:text-5xl">
            Everything You Need To Launch
          </h2>
          <p className="mt-4 text-lg text-muted">
            One payment. Unlimited launches. No recurring fees.
          </p>
        </div>

        <article className="relative mt-12 overflow-hidden rounded-3xl border border-brand-cyan/30 bg-black/40 p-8 shadow-2xl shadow-brand-blue/15 backdrop-blur-xl sm:p-10">
          <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-brand-blue/20 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-40 w-40 rounded-full bg-brand-violet/10 blur-3xl" />

          <div className="relative">
            <div className="flex items-end justify-center gap-2">
              {plan.priceAnchor && (
                <span className="pb-2 text-2xl text-muted line-through">
                  ${plan.priceAnchor}
                </span>
              )}
              <span className="text-6xl font-extrabold tracking-tight">${plan.price}</span>
              <div className="pb-2 text-left">
                <span className="block text-xs font-semibold uppercase text-muted">USD</span>
                <span className="block text-sm font-bold text-accent">Lifetime</span>
              </div>
            </div>

            <ul className="mt-10 space-y-3.5">
              {included.map((item) => (
                <li key={item} className="flex items-center gap-3 text-sm">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
                    <Check size={12} strokeWidth={3} />
                  </span>
                  {item}
                </li>
              ))}
            </ul>

            <div className="mt-10">
              <ButtonCheckout
                label="Start Building Today"
                priceId={plan.priceId}
                source="landing"
                extraStyle="btn-gradient w-full py-4 text-base"
              />
            </div>

            <p className="mt-6 text-center text-sm italic text-muted">
              Every week spent building boilerplate is a week not talking to customers.
            </p>

            <div className="mt-6 flex items-center justify-center gap-2 text-xs text-muted">
              <ShieldCheck size={14} className="text-accent" />
              Secure checkout via Paddle
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}
