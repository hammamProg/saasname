"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CATEGORY_SLUGS, type CategorySlug } from "@/libs/trends/types";

const LABELS: Record<CategorySlug, string> = {
  ai: "AI",
  saas: "SaaS",
  "mobile-apps": "Mobile & web apps",
  "dev-tools": "Developer tools",
  startups: "Startups",
  productivity: "Productivity",
  marketing: "Marketing",
  "creator-economy": "Creator economy",
  ecommerce: "E-commerce",
  "consumer-tech": "Consumer technology",
  communities: "Online communities",
  "future-of-work": "Future of work",
};

const MIN_CATEGORIES = 3;

export default function CategoryPicker() {
  const router = useRouter();
  const [selected, setSelected] = useState<CategorySlug[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggle(category: CategorySlug) {
    setSelected((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    );
  }

  async function submit(selectedCategories: CategorySlug[]) {
    setError(null);
    const response = await fetch("/api/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ selectedCategories }),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? "Something went wrong");
      return;
    }

    startTransition(() => router.refresh());
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-8">
      <h2 className="section-heading text-2xl font-extrabold">
        What should we watch for you?
      </h2>
      <p className="mt-1 text-sm text-muted">Pick at least {MIN_CATEGORIES} interests.</p>

      <div className="mt-6 flex flex-wrap gap-2">
        {CATEGORY_SLUGS.map((category) => {
          const active = selected.includes(category);
          return (
            <button
              key={category}
              type="button"
              onClick={() => toggle(category)}
              className={
                active
                  ? "rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white"
                  : "rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground"
              }
            >
              {LABELS[category]}
            </button>
          );
        })}
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-6 flex gap-3">
        <button
          type="button"
          disabled={selected.length < MIN_CATEGORIES || isPending}
          onClick={() => submit(selected)}
          className="btn-gradient rounded-xl px-5 py-2.5 text-sm font-bold disabled:opacity-50"
        >
          Continue
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => submit([])}
          className="rounded-xl px-5 py-2.5 text-sm font-semibold text-muted"
        >
          Skip — show everything
        </button>
      </div>
    </div>
  );
}
