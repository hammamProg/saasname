"use client";

import { useEffect, useState } from "react";

const features = [
  {
    title: "Emails",
    icon: "@",
    description:
      "Send transactional emails, setup your DNS to avoid spam folder (DKIM, DMARC, SPF in subdomain), and listen to webhook to receive & forward emails.",
  },
  {
    title: "Payments",
    icon: "💳",
    description:
      "Payment integration with webhooks, subscription management, and a checkout flow ready to go.",
  },
  {
    title: "Authentication",
    icon: "👤",
    description:
      "Google OAuth and magic links via Supabase Auth. Your users can sign in with one click or email.",
  },
  {
    title: "Style",
    icon: "🎨",
    description:
      "Beautiful Tailwind components with 20+ themes. Customize colors, fonts, and copy in config.ts.",
  },
];

export default function FeaturesAccordion() {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <section id="features" className="py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <h2 className="section-heading max-w-3xl text-3xl font-extrabold sm:text-4xl">
          All you need to ship your startup in days,{" "}
          <span className="highlight">not months</span>
        </h2>

        <div className="mt-12 grid gap-10 lg:grid-cols-2">
          <div className="space-y-2">
            {features.map((feature, index) => (
              <button
                key={feature.title}
                type="button"
                onClick={() => setActiveIndex(index)}
                className={`w-full rounded-xl px-4 py-4 text-left transition ${
                  activeIndex === index ? "bg-primary-soft" : "hover:bg-surface"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`text-xl ${activeIndex === index ? "text-primary" : "text-muted"}`}
                  >
                    {feature.icon}
                  </span>
                  <h3
                    className={`font-bold ${
                      activeIndex === index ? "text-primary" : "text-foreground"
                    }`}
                  >
                    {feature.title}
                  </h3>
                </div>
                {activeIndex === index && (
                  <p className="mt-3 pl-9 text-sm leading-relaxed text-muted">
                    {feature.description}
                  </p>
                )}
              </button>
            ))}
          </div>

          <div className="card overflow-hidden bg-surface p-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary-soft" />
              <div>
                <p className="font-bold">Marc Lou</p>
                <p className="text-xs text-muted">Bali · $5k/month</p>
              </div>
            </div>
            <p className="mt-4 text-sm text-muted">
              Lessons from making a living online ⚡
            </p>
            <div className="mt-4 flex gap-2">
              <input
                readOnly
                value="your@email.com"
                className="flex-1 rounded-lg border border-border bg-card px-3 py-2 text-sm"
              />
              <button type="button" className="rounded-lg bg-slate-300 px-4 py-2 text-sm font-medium">
                Subscribe
              </button>
            </div>
            <p className="mt-6 font-mono text-sm font-semibold text-primary">
              {features[activeIndex].title}
            </p>
            <p className="mt-2 text-sm text-muted">{features[activeIndex].description}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
