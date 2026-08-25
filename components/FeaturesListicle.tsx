"use client";

import { useEffect, useState } from "react";

const tabs = [
  {
    id: "emails",
    label: "Emails",
    icon: "@",
    items: [
      "Send transactional emails",
      "DNS setup to avoid spam folder (DKIM, DMARC, SPF in subdomain)",
      "Webhook to receive & forward emails",
      "Time saved: 2 hours",
    ],
  },
  {
    id: "payments",
    label: "Payments",
    icon: "💳",
    items: ["Checkout flow", "Webhook handlers", "Subscription billing", "Time saved: 4 hours"],
  },
  {
    id: "login",
    label: "Login",
    icon: "👤",
    items: ["Google OAuth", "Magic links", "Private dashboard", "Time saved: 3 hours"],
  },
  {
    id: "database",
    label: "Database",
    icon: "🗄️",
    items: ["Supabase setup", "User sync", "RLS policies", "Time saved: 2 hours"],
  },
  {
    id: "seo",
    label: "SEO",
    icon: "🔍",
    items: ["Meta tags", "Schema markup", "Sitemap", "Time saved: 1 hour"],
  },
  {
    id: "style",
    label: "Style",
    icon: "🎨",
    items: ["20+ themes", "Tailwind CSS", "Custom fonts", "Time saved: 1 hour"],
  },
];

import config from "@/config";

export default function FeaturesListicle() {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((current) => (current + 1) % tabs.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const active = tabs[activeIndex];

  return (
    <section className="border-y border-border bg-surface py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <p className="font-mono text-sm text-teal-600">{`const launch_time = "Today";`}</p>
        <h2 className="section-heading mt-4 text-3xl font-extrabold sm:text-4xl">
          Supercharge your app instantly, launch faster, make $
        </h2>
        <p className="mt-4 max-w-2xl text-muted">
          Don&apos;t waste time integrating APIs or designing a pricing section — use {config.appName}
          and focus on what makes your product unique.
        </p>

        <div className="mt-10 flex flex-wrap gap-6 border-b border-border pb-4">
          {tabs.map((tab, index) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={`flex flex-col items-center gap-1 text-sm font-medium transition ${
                activeIndex === index
                  ? "text-primary"
                  : "text-muted hover:text-foreground"
              }`}
            >
              <span className="text-xl">{tab.icon}</span>
              {tab.label}
              {activeIndex === index && (
                <span className="mt-1 h-0.5 w-full rounded bg-primary" />
              )}
            </button>
          ))}
        </div>

        <div className="mt-8 rounded-xl bg-surface p-6">
          <h3 className="font-bold">{active.label}</h3>
          <ul className="mt-4 space-y-2">
            {active.items.map((item) => (
              <li key={item} className="flex gap-2 text-sm text-muted">
                <span className="text-slate-400">✓</span>
                <span className={item.startsWith("Time saved") ? "font-medium text-teal-600" : ""}>
                  {item}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
