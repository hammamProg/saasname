"use client";

import { useState } from "react";

const tabData = {
  Mobile: {
    icon: "📱",
    specs: [
      ["Device", "iPhone 15 Pro"],
      ["Screen Size", "6.1 inches"],
      ["Resolution", "2556 × 1179 pixels"],
      ["Processor", "A17 Pro chip"],
      ["RAM", "8 GB"],
      ["Storage", "256 GB"],
      ["Battery", "3274 mAh"],
    ],
  },
  Tablet: {
    icon: "📲",
    specs: [
      ["Device", "iPad Pro (12.9-inch)"],
      ["Screen Size", "12.9 inches"],
      ["Resolution", "2732 × 2048 pixels"],
      ["Processor", "A12X Bionic chip"],
      ["RAM", "4 GB"],
      ["Storage", "256 GB"],
      ["Battery", "10000 mAh"],
    ],
  },
  Desktop: {
    icon: "🖥️",
    specs: [
      ["Device", "MacBook Pro 16"],
      ["Screen Size", "16.2 inches"],
      ["Resolution", "3456 × 2234 pixels"],
      ["Processor", "M3 Pro chip"],
      ["RAM", "18 GB"],
      ["Storage", "512 GB"],
      ["Battery", "100 Wh"],
    ],
  },
};

type TabName = keyof typeof tabData;

export default function Tabs() {
  const [active, setActive] = useState<TabName>("Tablet");

  return (
    <div className="w-full max-w-md">
      <div className="flex rounded-xl bg-surface p-1">
        {(Object.keys(tabData) as TabName[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActive(tab)}
            className={`flex flex-1 items-center justify-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
              active === tab
                ? "bg-card text-foreground shadow-sm"
                : "text-muted"
            }`}
          >
            <span>{tabData[tab].icon}</span>
            {tab}
          </button>
        ))}
      </div>
      <dl className="mt-6 space-y-2 text-sm">
        {tabData[active].specs.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4">
            <dt className="font-bold">{label}:</dt>
            <dd className="text-muted">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
