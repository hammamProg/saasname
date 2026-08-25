"use client";

import { useState } from "react";
import { SectionHeader } from "@/components/landing/shared";

const faqs = [
  {
    question: "Why not build from scratch?",
    answer:
      "You can — but you'll spend 4–8 weeks on auth, payments, emails, and dashboards before writing a single line of product code. ShipNow gives you all of that on day one so you can validate your idea faster and start generating revenue sooner.",
  },
  {
    question: "Can I use Stripe?",
    answer:
      "ShipNow currently integrates Paddle for payments out of the box. Stripe support is coming soon. The architecture is designed so you can swap or add payment providers as your business needs evolve.",
  },
  {
    question: "Is the code mine?",
    answer:
      "Yes. After purchase you get full access to the source code. Clone it, customize it, and ship your product. There are no usage restrictions on products you build with ShipNow.",
  },
  {
    question: "Do I get updates?",
    answer:
      "Lifetime access includes future updates to the boilerplate — new integrations, security patches, and framework upgrades. You pull updates when you're ready; your customized product stays yours.",
  },
  {
    question: "Is this beginner friendly?",
    answer:
      "ShipNow is built for developers. If you're comfortable with JavaScript/TypeScript and basic React, you'll be productive quickly. The setup guide walks you through every integration step-by-step.",
  },
  {
    question: "Can agencies use it?",
    answer:
      "Absolutely. Agencies use ShipNow to launch client SaaS products in days instead of weeks. One license covers your team's internal use — contact us if you need a multi-seat or white-label arrangement.",
  },
];

export default function LandingFAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="relative py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          badge="FAQ"
          title="Frequently Asked Questions"
          subtitle="Everything you need to know before you ship."
        />

        <div className="mt-12 divide-y divide-white/10">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div key={faq.question}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-4 py-5 text-left"
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                >
                  <span
                    className={`font-semibold transition-colors ${
                      isOpen ? "text-accent" : ""
                    }`}
                  >
                    {faq.question}
                  </span>
                  <span className="shrink-0 text-xl text-muted">{isOpen ? "−" : "+"}</span>
                </button>
                {isOpen && (
                  <p className="pb-5 text-sm leading-relaxed text-muted">{faq.answer}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
