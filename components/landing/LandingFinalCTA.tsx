import ButtonCheckout from "@/components/ButtonCheckout";

const particles = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  left: `${(i * 17 + 5) % 95}%`,
  delay: `${(i * 0.7) % 5}s`,
  size: i % 3 === 0 ? 3 : 2,
}));

export default function LandingFinalCTA() {
  return (
    <section className="relative overflow-hidden py-24 sm:py-32">
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-brand-mint/10 to-transparent"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[500px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-r from-brand-teal/25 via-brand-mint/20 to-brand-gold/10 blur-3xl animate-glow-pulse"
        aria-hidden
      />

      {particles.map((p) => (
        <span
          key={p.id}
          aria-hidden
          className="pointer-events-none absolute bottom-0 rounded-full bg-white/30"
          style={{
            left: p.left,
            width: p.size,
            height: p.size,
            animation: `particle-drift ${4 + (p.id % 3)}s linear infinite`,
            animationDelay: p.delay,
          }}
        />
      ))}

      <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6">
        <h2 className="section-heading text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
          Your Next SaaS Could Be{" "}
          <span className="gradient-text">Live This Week.</span>
        </h2>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted sm:text-xl">
          Stop rebuilding authentication, payments, emails, and dashboards. Start
          building what makes your product unique.
        </p>

        <div className="mt-10 flex justify-center">
          <ButtonCheckout
            label="Get ShipNow Now"
            source="landing"
            extraStyle="btn-gradient px-10 py-4 text-base"
          />
        </div>
      </div>
    </section>
  );
}
