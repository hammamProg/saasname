"use client";

import { useState } from "react";
import { Globe, Scale, Search } from "lucide-react";
import config from "@/config";
import {
  AppleIcon,
  GithubIcon,
  GooglePlayIcon,
} from "@/components/icons/BrandIcons";
import { SectionHeader } from "@/components/landing/shared";

const sources = [
  {
    id: "rdap",
    Icon: Globe,
    name: "RDAP",
    short: "RDAP",
    role: "Domain registries",
    color: "from-cyan-500/25 to-blue-500/10",
    detail:
      "Availability for .com, .io, .ai, .dev and .app is read from the registries' own RDAP servers. A registry we cannot reach is reported as unknown rather than guessed as free.",
  },
  {
    id: "uspto",
    Icon: Scale,
    name: "USPTO",
    short: "USPTO",
    role: "US trademark register",
    color: "from-violet-500/25 to-purple-500/10",
    detail:
      "Live marks matching the candidate are surfaced with a link to the record. This is a screening signal, not legal advice — a lawyer still clears the class.",
  },
  {
    id: "appstore",
    Icon: AppleIcon,
    name: "App Store",
    short: "iOS",
    role: "iOS listings",
    color: "from-white/20 to-white/5",
    detail:
      "Apps already shipping under the name. The one source founders remember only after they have printed the logo.",
  },
  {
    id: "play",
    Icon: GooglePlayIcon,
    name: "Google Play",
    short: "Play",
    role: "Android listings",
    color: "from-emerald-500/25 to-green-500/10",
    detail:
      "The Android half of the same question, checked separately because the two stores routinely disagree.",
  },
  {
    id: "socials",
    Icon: GithubIcon,
    name: "Handles",
    short: "Social",
    role: "GitHub · X · LinkedIn",
    color: "from-blue-500/25 to-indigo-500/10",
    detail:
      "Only platforms where a 404 genuinely distinguishes a free handle. Where a site answers identically for taken and free names, we report unknown instead of inventing an answer.",
  },
  {
    id: "web",
    Icon: Search,
    name: "Web",
    short: "Web",
    role: "Search presence",
    color: "from-amber-500/25 to-orange-500/10",
    detail:
      "Who already ranks for the term, and how strongly. A free domain means little if page one belongs to someone else.",
  },
];

export default function LandingSources() {
  const [active, setActive] = useState(sources[0].id);
  const selected = sources.find((s) => s.id === active) ?? sources[0];

  return (
    <section id="sources" className="relative py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          badge="Sources"
          title="Where We Actually Look"
          subtitle="Six independent sources, queried live on every search — click any of them to see what it contributes."
        />

        <div className="mt-16 grid gap-8 lg:grid-cols-2">
          <div className="relative flex min-h-[320px] items-center justify-center rounded-2xl border border-white/10 bg-black/30 p-8">
            <div className="absolute inset-0 flex items-center justify-center" aria-hidden>
              <div className="h-48 w-48 rounded-full border border-dashed border-white/10" />
              <div className="absolute h-72 w-72 rounded-full border border-dashed border-white/5" />
            </div>

            <div className="relative z-10 flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-blue via-brand-cyan to-brand-violet p-px shadow-lg shadow-brand-blue/30">
              <div className="flex h-full w-full items-center justify-center rounded-2xl bg-black px-2 text-center text-[11px] font-bold leading-tight">
                {config.appName}
              </div>
            </div>

            {sources.map((item, i) => {
              const angle = (i / sources.length) * 2 * Math.PI - Math.PI / 2;
              const radius = 130;
              const x = Math.cos(angle) * radius;
              const y = Math.sin(angle) * radius;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActive(item.id)}
                  className={`absolute flex h-16 w-16 flex-col items-center justify-center gap-1 rounded-xl border px-1 text-center text-[10px] font-bold leading-tight transition-all ${
                    active === item.id
                      ? "scale-110 border-brand-cyan/50 bg-brand-blue/20 shadow-lg shadow-brand-blue/20"
                      : "border-white/10 bg-white/5 hover:border-white/20"
                  }`}
                  style={{ transform: `translate(${x}px, ${y}px)` }}
                  title={item.name}
                >
                  <item.Icon size={18} />
                  {item.short}
                </button>
              );
            })}
          </div>

          <div className="flex flex-col justify-center">
            <div className={`rounded-2xl bg-gradient-to-br ${selected.color} p-8 glass-card`}>
              <p className="text-xs font-semibold uppercase tracking-wider text-accent">
                Checked on every search
              </p>
              <h3 className="mt-2 text-3xl font-extrabold">{selected.name}</h3>
              <p className="mt-2 text-muted">{selected.role}</p>
              <p className="mt-6 text-sm leading-relaxed text-muted">{selected.detail}</p>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              {sources.map((item) => (
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
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
