import { Clock, Zap } from "lucide-react";
import config from "@/config";
import { SectionHeader } from "@/components/landing/shared";

const rows = [
  { task: "Domain availability across 5 TLDs", manual: "5–10 min", here: "Automatic" },
  { task: "US trademark register search", manual: "10–15 min", here: "Automatic" },
  { task: "App Store + Google Play", manual: "5 min", here: "Automatic" },
  { task: "GitHub, X, LinkedIn handles", manual: "5 min", here: "Automatic" },
  { task: "Who already ranks for the name", manual: "5–10 min", here: "Automatic" },
  { task: "Deciding what it all means", manual: "Guesswork", here: "Scored verdict" },
  { task: "Doing it again for name #7", manual: "Another 40 min", here: "1 credit" },
];

export default function LandingComparison() {
  return (
    <section className="relative py-20 sm:py-28">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          badge="By hand vs here"
          title="Eight Names, Checked Properly, Before Lunch"
          subtitle="The work is not hard. It is just long, repetitive, and easy to skip the one source that would have saved you."
        />

        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          <div className="rounded-2xl border border-red-200 bg-red-50/50 p-6 text-center">
            <Clock className="mx-auto text-red-600" size={32} />
            <p className="mt-4 text-sm font-semibold uppercase tracking-wider text-red-600">
              Checking by hand
            </p>
            <p className="mt-2 text-5xl font-extrabold">~40 min</p>
            <p className="mt-2 text-sm text-muted">Per name, across six sources</p>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-6 text-center">
            <Zap className="mx-auto text-emerald-700" size={32} />
            <p className="mt-4 text-sm font-semibold uppercase tracking-wider text-emerald-700">
              With {config.appName}
            </p>
            <p className="mt-2 text-5xl font-extrabold gradient-text">1 credit</p>
            <p className="mt-2 text-sm text-muted">
              Per name, all six sources, streamed as they answer
            </p>
          </div>
        </div>

        <div className="mt-8 overflow-hidden rounded-2xl border border-border">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-surface">
                <th className="px-5 py-4 font-semibold">Step</th>
                <th className="hidden px-5 py-4 font-semibold text-red-600 sm:table-cell">
                  By hand
                </th>
                <th className="px-5 py-4 font-semibold text-emerald-700">
                  {config.appName}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.task} className="border-b border-border last:border-0">
                  <td className="px-5 py-4 text-muted">{row.task}</td>
                  <td className="hidden px-5 py-4 text-red-600/80 sm:table-cell">
                    {row.manual}
                  </td>
                  <td className="px-5 py-4 font-semibold text-emerald-700">{row.here}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
