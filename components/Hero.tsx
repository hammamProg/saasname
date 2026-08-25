import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Rocket, Sparkles } from "lucide-react";
import config from "@/config";
import ButtonLead from "@/components/ButtonLead";
import Rating from "@/components/Rating";
import MarketingBackdrop from "@/components/ui/MarketingBackdrop";

const avatars = ["A", "B", "C", "D", "E"];

export default function Hero() {
  return (
    <section className="relative overflow-hidden">
      <MarketingBackdrop variant="hero" />

      <div className="mx-auto max-w-6xl px-4 pb-20 pt-16 sm:px-6 lg:pb-24 lg:pt-24">
        <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-16">
          <div className="animate-fade-up space-y-6">
            <Link
              href="#pricing"
              className="group inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary-soft/70 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary backdrop-blur-sm transition-colors hover:bg-primary-soft"
            >
              <Sparkles size={14} />
              Lifetime access · Ship in days
              <ArrowRight
                size={14}
                className="transition-transform group-hover:translate-x-0.5"
              />
            </Link>

            <h1 className="section-heading text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              Ship your startup in{" "}
              <span className="bg-gradient-to-br from-brand-blue via-brand-cyan to-brand-violet bg-clip-text text-transparent">
                days, not weeks
              </span>
            </h1>

            <p className="max-w-xl text-lg leading-relaxed text-muted">{config.appDescription}</p>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <Link href="#pricing" className="btn-primary px-6 py-3.5 text-sm shadow-lg shadow-primary/25">
                <Rocket size={16} />
                Get the boilerplate
              </Link>
              <Link
                href="#waitlist"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-6 py-3.5 text-sm font-semibold text-foreground transition-colors hover:bg-surface"
              >
                Join waitlist
              </Link>
            </div>

            <div id="waitlist" className="max-w-md scroll-mt-24 pt-2">
              <ButtonLead />
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <div className="flex -space-x-2">
                {avatars.map((letter) => (
                  <div
                    key={letter}
                    className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-background bg-primary-soft text-xs font-bold text-primary"
                  >
                    {letter}
                  </div>
                ))}
              </div>
              <Rating value={5} />
              <p className="text-sm text-muted">
                <span className="font-semibold text-foreground">32</span> makers ship faster
              </p>
            </div>
          </div>

          <div className="animate-fade-up relative [animation-delay:120ms]">
            <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-primary/15 via-accent/10 to-transparent blur-2xl" />
            <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-card shadow-2xl shadow-primary/10 ring-1 ring-primary/10">
              <div className="flex items-center gap-2 border-b border-border bg-surface/80 px-4 py-3">
                <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-brand-cyan" />
                <span className="ml-2 text-xs font-medium text-muted">{config.appName} Launchpad</span>
              </div>
              <Image
                src="/docs/components/cta.jpg"
                alt={`${config.appName} dashboard preview`}
                width={640}
                height={480}
                className="h-auto w-full object-cover"
                priority
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
