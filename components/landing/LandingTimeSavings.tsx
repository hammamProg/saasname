import { Clock, Zap } from "lucide-react";
import { SectionHeader } from "@/components/landing/shared";

const rows = [
  { task: "Authentication & user management", without: "1–2 weeks", with: "1 hour" },
  { task: "Database schema & migrations", without: "1 week", with: "30 min" },
  { task: "Payment integration", without: "1–2 weeks", with: "2 hours" },
  { task: "Email infrastructure", without: "3–5 days", with: "1 hour" },
  { task: "Landing page & SEO", without: "1 week", with: "Done" },
  { task: "Dashboard & protected routes", without: "1–2 weeks", with: "Done" },
  { task: "Deployment workflow", without: "3–5 days", with: "1 hour" },
];

export default function LandingTimeSavings() {
  return (
    <section className="relative py-20 sm:py-28">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          badge="Time savings"
          title="100+ Hours Saved. Every Single Launch."
          subtitle="Stop spending weeks on infrastructure. Start building what customers will pay for."
        />

        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          <div className="glass-card border-red-500/20 p-6 text-center">
            <Clock className="mx-auto text-red-400" size={32} />
            <p className="mt-4 text-sm font-semibold uppercase tracking-wider text-red-400">
              Without ShipNow
            </p>
            <p className="mt-2 text-5xl font-extrabold">4–8 weeks</p>
            <p className="mt-2 text-sm text-muted">Setup before you write product code</p>
          </div>

          <div className="glass-card border-emerald-500/25 p-6 text-center shadow-lg shadow-emerald-500/10">
            <Zap className="mx-auto text-emerald-400" size={32} />
            <p className="mt-4 text-sm font-semibold uppercase tracking-wider text-emerald-400">
              With ShipNow
            </p>
            <p className="mt-2 text-5xl font-extrabold gradient-text">1–2 days</p>
            <p className="mt-2 text-sm text-muted">Configure, customize, and deploy</p>
          </div>
        </div>

        <div className="mt-8 overflow-hidden rounded-2xl border border-white/10">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="px-5 py-4 font-semibold">Task</th>
                <th className="hidden px-5 py-4 font-semibold text-red-400 sm:table-cell">
                  Without ShipNow
                </th>
                <th className="px-5 py-4 font-semibold text-emerald-400">With ShipNow</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.task} className="border-b border-white/5 last:border-0">
                  <td className="px-5 py-4 text-muted">{row.task}</td>
                  <td className="hidden px-5 py-4 text-red-400/80 sm:table-cell">{row.without}</td>
                  <td className="px-5 py-4 font-semibold text-emerald-400">{row.with}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
