"use client";

import { useState } from "react";
import { SectionHeader } from "@/components/landing/shared";

const stack = [
  { id: "nextjs", name: "Next.js", role: "Fullstack framework", color: "from-white/20 to-white/5" },
  { id: "tailwind", name: "TailwindCSS", role: "Styling", color: "from-cyan-500/25 to-blue-500/10" },
  { id: "daisyui", name: "DaisyUI", role: "UI components", color: "from-violet-500/25 to-purple-500/10" },
  { id: "supabase", name: "Supabase", role: "Database & auth", color: "from-emerald-500/25 to-green-500/10" },
  { id: "resend", name: "Resend", role: "Email delivery", color: "from-blue-500/25 to-indigo-500/10" },
  { id: "paddle", name: "Paddle", role: "Payments", color: "from-amber-500/25 to-orange-500/10" },
  { id: "stripe", name: "Stripe", role: "Coming soon", color: "from-violet-500/25 to-fuchsia-500/10", soon: true },
];

export default function LandingTechStack() {
  const [active, setActive] = useState(stack[0].id);
  const selected = stack.find((s) => s.id === active) ?? stack[0];

  return (
    <section className="relative py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          badge="Tech stack"
          title="Modern Stack. Connected Architecture."
          subtitle="Every layer is pre-integrated and production-tested — click to explore each piece."
        />

        <div className="mt-16 grid gap-8 lg:grid-cols-2">
          <div className="relative flex min-h-[320px] items-center justify-center rounded-2xl border border-white/10 bg-black/30 p-8">
            <div className="absolute inset-0 flex items-center justify-center" aria-hidden>
              <div className="h-48 w-48 rounded-full border border-dashed border-white/10" />
              <div className="absolute h-72 w-72 rounded-full border border-dashed border-white/5" />
            </div>

            <div className="relative z-10 flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-blue via-brand-cyan to-brand-violet p-px shadow-lg shadow-brand-blue/30">
              <div className="flex h-full w-full items-center justify-center rounded-2xl bg-black text-sm font-bold">
                ShipNow
              </div>
            </div>

            {stack.map((item, i) => {
              const angle = (i / stack.length) * 2 * Math.PI - Math.PI / 2;
              const radius = 130;
              const x = Math.cos(angle) * radius;
              const y = Math.sin(angle) * radius;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActive(item.id)}
                  className={`absolute flex h-14 w-14 items-center justify-center rounded-xl border text-xs font-bold transition-all ${
                    active === item.id
                      ? "scale-110 border-brand-cyan/50 bg-brand-blue/20 shadow-lg shadow-brand-blue/20"
                      : "border-white/10 bg-white/5 hover:border-white/20"
                  }`}
                  style={{ transform: `translate(${x}px, ${y}px)` }}
                  title={item.name}
                >
                  {item.name.slice(0, 2)}
                </button>
              );
            })}
          </div>

          <div className="flex flex-col justify-center">
            <div className={`rounded-2xl bg-gradient-to-br ${selected.color} p-8 glass-card`}>
              <p className="text-xs font-semibold uppercase tracking-wider text-accent">
                {selected.soon ? "Coming soon" : "Integrated"}
              </p>
              <h3 className="mt-2 text-3xl font-extrabold">{selected.name}</h3>
              <p className="mt-2 text-muted">{selected.role}</p>
              <p className="mt-6 text-sm leading-relaxed text-muted">
                Pre-configured and wired into ShipNow&apos;s launchpad. No hunting for tutorials
                or stitching together half-finished integrations.
              </p>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              {stack.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActive(item.id)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    active === item.id
                      ? "border-brand-cyan/50 bg-brand-blue/15 text-foreground"
                      : "border-white/10 text-muted hover:text-foreground"
                  }`}
                >
                  {item.name}
                  {item.soon && " · Soon"}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
