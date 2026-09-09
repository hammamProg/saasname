import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Synthetic "live visitors" feed for the marketing hero's demo window.
 *
 *  No site, no auth, no database — this is what a prospect sees before they
 *  have an account, so it can't read real tracking data. Values are derived
 *  from the current time bucket rather than plain Math.random() so the
 *  count and chart move smoothly between polls instead of jumping, the way
 *  a real "who's online" feed would. */

const DEMO_COUNTRIES = [
  { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
  { code: "DE", name: "Germany" },
  { code: "IN", name: "India" },
  { code: "BR", name: "Brazil" },
];

function pseudoRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export async function GET() {
  const bucket = Math.floor(Date.now() / 15_000);

  const series = Array.from({ length: 30 }, (_, index) => {
    const t = bucket - (29 - index);
    const wave = Math.sin(t / 4) * 3 + 6;
    const noise = pseudoRandom(t * 13.37) * 3;
    return Math.max(0, Math.round(wave + noise));
  });

  const count = series[series.length - 1];

  const countries = DEMO_COUNTRIES.map((country, index) => ({
    ...country,
    count: Math.round(pseudoRandom(bucket * 7 + index * 91) * count) - index,
  }))
    .filter((country) => country.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  return NextResponse.json(
    { count, series, countries },
    { headers: { "cache-control": "no-store" } },
  );
}
