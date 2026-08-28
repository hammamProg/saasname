"use client";

import { useState } from "react";
import { SectionHeader } from "@/components/landing/shared";
import { LANDING_FAQS } from "@/libs/landing-faqs";


export default function LandingFAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="relative py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          badge="FAQ"
          title="Frequently Asked Questions"
          subtitle="What the checks cover, and what they deliberately do not."
        />

        <div className="mt-12 divide-y divide-border">
          {LANDING_FAQS.map((faq, index) => {
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
