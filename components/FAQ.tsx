"use client";

import { useState } from "react";

const faqs = [
  {
    question: "What do I get exactly?",
    answer:
      "A complete Next.js boilerplate with authentication, payments, database, emails, and a beautiful landing page. Clone it, customize config.ts, and ship.",
  },
  {
    question: "Can I get a refund?",
    answer:
      "If you're not satisfied within 7 days, email us for a full refund. No questions asked.",
  },
  {
    question: "I have another question",
    answer: "Cool, contact us by email.",
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(2);

  return (
    <section id="faq" className="bg-surface py-16 sm:py-20">
      <div className="mx-auto grid max-w-5xl gap-12 px-4 sm:px-6 lg:grid-cols-2">
        <div>
          <p className="text-sm font-semibold text-primary">FAQ</p>
          <h2 className="section-heading mt-2 text-3xl font-extrabold sm:text-4xl">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="divide-y divide-border border-t border-border">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div key={faq.question}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between py-5 text-left"
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                >
                  <span className={`font-semibold ${isOpen ? "text-primary" : ""}`}>
                    {faq.question}
                  </span>
                  <span className="text-xl text-muted">{isOpen ? "−" : "+"}</span>
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
