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
          <div className="glass-card border-red-500/20 p-6 text-center">
            <Clock className="mx-auto text-red-400" size={32} />
            <p className="mt-4 text-sm font-semibold uppercase tracking-wider text-red-400">
              Checking by hand
            </p>
            <p className="mt-2 text-5xl font-extrabold">~40 min</p>
            <p className="mt-2 text-sm text-muted">Per name, across six sources</p>
          </div>

          <div className="glass-card border-emerald-500/25 p-6 text-center shadow-lg shadow-emerald-500/10">
            <Zap className="mx-auto text-emerald-400" size={32} />
            <p className="mt-4 text-sm font-semibold uppercase tracking-wider text-emerald-400">
              With {config.appName}
            </p>
            <p className="mt-2 text-5xl font-extrabold gradient-text">1 credit</p>
            <p className="mt-2 text-sm text-muted">
              Per name, all six sources, streamed as they answer
            </p>
          </div>
        </div>

        <div className="mt-8 overflow-hidden rounded-2xl border border-white/10">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="px-5 py-4 font-semibold">Step</th>
                <th className="hidden px-5 py-4 font-semibold text-red-400 sm:table-cell">
                  By hand
                </th>
                <th className="px-5 py-4 font-semibold text-emerald-400">
                  {config.appName}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.task} className="border-b border-white/5 last:border-0">
                  <td className="px-5 py-4 text-muted">{row.task}</td>
                  <td className="hidden px-5 py-4 text-red-400/80 sm:table-cell">
                    {row.manual}
                  </td>
                  <td className="px-5 py-4 font-semibold text-emerald-400">{row.here}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
