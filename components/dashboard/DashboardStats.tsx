import { CheckCircle2, Coins, FileSearch, ScanSearch } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type DashboardStatsData = {
  credits: number;
  reports: number;
  namesChecked: number;
  namesClear: number;
};

type Tile = {
  label: string;
  value: string;
  hint: string;
  icon: LucideIcon;
  tone?: "clear";
};

export default function DashboardStats({ stats }: { stats: DashboardStatsData }) {
  const tiles: Tile[] = [
    {
      label: "Credits",
      value: String(stats.credits),
      hint: "1 credit checks 1 name",
      icon: Coins,
    },
    {
      label: "Reports",
      value: String(stats.reports),
      hint: stats.reports === 1 ? "search run" : "searches run",
      icon: FileSearch,
    },
    {
      label: "Names checked",
      value: String(stats.namesChecked),
      hint: "across all reports",
      icon: ScanSearch,
    },
    {
      label: "Came back clear",
      value: String(stats.namesClear),
      hint:
        stats.namesChecked > 0
          ? `${Math.round((stats.namesClear / stats.namesChecked) * 100)}% of what you checked`
          : "nothing checked yet",
      icon: CheckCircle2,
      tone: "clear",
    },
  ];

  return (
    <section aria-label="Account summary" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {tiles.map((tile) => (
        <div key={tile.label} className="card p-5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">
              {tile.label}
            </p>
            <tile.icon
              size={16}
              aria-hidden="true"
              className={tile.tone === "clear" ? "text-verdict-clear" : "text-primary"}
            />
          </div>
          <p
            className={`mt-2 text-3xl font-extrabold tabular-nums ${
              tile.tone === "clear" && stats.namesClear > 0
                ? "text-verdict-clear"
                : "text-foreground"
            }`}
          >
            {tile.value}
          </p>
          <p className="mt-1 text-xs text-muted">{tile.hint}</p>
        </div>
      ))}
    </section>
  );
}
