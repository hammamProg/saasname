"use client";

import { useState } from "react";
import BetterIcon from "@/components/BetterIcon";

const items = [
  {
    title: "Get Started",
    description: "Launch your SaaS in days, not weeks.",
    icon: "🔥",
    color: "bg-orange-100",
  },
  {
    title: "Academics",
    description: "Learn the fundamentals of web development.",
    icon: "🎓",
    color: "bg-green-100",
  },
  {
    title: "Rewards",
    description: "Earn affiliate commissions on every sale.",
    icon: "🎁",
    color: "bg-yellow-100",
  },
];

export default function ButtonPopover() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-lg bg-surface px-4 py-2 text-sm font-medium"
      >
        Popover Button
        <span>{open ? "⌃" : "⌄"}</span>
      </button>

      {open && (
        <div className="animate-popup absolute left-0 z-10 mt-2 w-80 rounded-xl border border-border bg-card p-2 shadow-xl">
          <div className="grid grid-cols-2 gap-1">
            {items.map((item) => (
              <button
                key={item.title}
                type="button"
                className="rounded-lg p-3 text-left hover:bg-surface"
              >
                <BetterIcon className={item.color}>{item.icon}</BetterIcon>
                <p className="mt-2 text-sm font-bold">{item.title}</p>
                <p className="text-xs text-muted">{item.description}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
