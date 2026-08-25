"use client";

import { useState } from "react";
import { SectionHeader } from "@/components/landing/shared";

const tabs = [
  {
    id: "auth",
    label: "Authentication",
    code: `import { getServerUser } from "@/libs/supabase/get-server-user";

export default async function DashboardPage() {
  const user = await getServerUser();
  if (!user) redirect("/auth/signin");
  // Protected — user is authenticated
  return <Dashboard user={user} />;
}`,
  },
  {
    id: "subscriptions",
    label: "Subscriptions",
    code: `import { getPaddleCheckout } from "@/libs/paddle/client";

const paddle = await getPaddleCheckout();
paddle.Checkout.open({
  items: [{ priceId: plan.priceId, quantity: 1 }],
  customData: { user_id: user.id },
  settings: { successUrl: \`\${siteUrl}/dashboard\` },
});`,
  },
  {
    id: "emails",
    label: "Emails",
    code: `import { sendEmail } from "@/libs/resend";

await sendEmail({
  to: user.email,
  subject: "Welcome to your SaaS",
  react: <WelcomeEmail name={user.name} />,
});`,
  },
];

export default function LandingCodePreview() {
  const [activeTab, setActiveTab] = useState(tabs[0].id);
  const active = tabs.find((t) => t.id === activeTab) ?? tabs[0];

  return (
    <section className="relative py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          badge="Developer experience"
          title="Focus On Your Product. Not Boilerplate."
          subtitle="Clean, production-ready code you can read, customize, and ship with confidence."
        />

        <div className="mt-12 overflow-hidden rounded-2xl border border-white/10 bg-black/50 shadow-2xl shadow-brand-blue/10">
          <div className="flex gap-1 overflow-x-auto border-b border-white/10 bg-white/5 p-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "bg-gradient-to-r from-brand-blue/25 to-brand-cyan/20 text-foreground"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
            <span className="ml-2 font-mono text-xs text-muted">{active.id}.ts</span>
          </div>

          <pre className="overflow-x-auto p-6 font-mono text-sm leading-relaxed text-slate-300">
            <code>{active.code}</code>
          </pre>
        </div>
      </div>
    </section>
  );
}
