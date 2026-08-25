"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  DollarSign,
  FolderKanban,
  Layers,
  Loader2,
  Plug,
  Rocket,
  Settings,
  TrendingUp,
} from "lucide-react";
import type { Integration } from "@/app/components/IntegrationRow";
import type { Project } from "@/libs/projects";
import { cn } from "@/libs/cn";
import {
  fetchIntegrationsCached,
  fetchProjectsCached,
  getCachedIntegrations,
  getCachedProjects,
} from "@/libs/dashboard-data-cache";
import { SETUP_TOTAL_STEPS } from "@/libs/setup-step-groups";

type DashboardOverviewProps = {
  displayName: string;
  email: string;
};

const PRIMARY = "#077a7d";
const MINT = "#7ae2cf";

const REVENUE_MONTHS = [
  { label: "Jan", value: 5200 },
  { label: "Feb", value: 6100 },
  { label: "Mar", value: 5800 },
  { label: "Apr", value: 7200 },
  { label: "May", value: 7900 },
  { label: "Jun", value: 8400 },
];

const WEEKLY_SETUP = [
  { label: "Mon", value: 42 },
  { label: "Tue", value: 58 },
  { label: "Wed", value: 36 },
  { label: "Thu", value: 71 },
  { label: "Fri", value: 64 },
  { label: "Sat", value: 28 },
  { label: "Sun", value: 45 },
];

const QUICK_ACTIONS = [
  { href: "/dashboard/projects", label: "Projects", description: "Manage apps", icon: FolderKanban },
  { href: "/dashboard/shipnow", label: "ShipNow", description: "Setup guide", icon: Rocket },
  { href: "/dashboard/integrations", label: "Integrations", description: "Connect tools", icon: Plug },
  { href: "/dashboard/settings", label: "Settings", description: "Account & billing", icon: Settings },
] as const;

function projectProgressPercent(project: Project): number {
  const completed = project.completed_steps?.length ?? 0;
  return Math.round((completed / SETUP_TOTAL_STEPS) * 100);
}

function averageSetupProgress(projects: Project[]): number {
  if (projects.length === 0) return 0;
  const total = projects.reduce((sum, project) => sum + projectProgressPercent(project), 0);
  return Math.round(total / projects.length);
}

function DemoBadge() {
  return (
    <span className="rounded-full border border-primary/20 bg-primary-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
      Demo
    </span>
  );
}

function RevenueAreaChart() {
  const width = 320;
  const height = 120;
  const padding = { top: 8, right: 8, bottom: 24, left: 8 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const max = Math.max(...REVENUE_MONTHS.map((m) => m.value));
  const min = Math.min(...REVENUE_MONTHS.map((m) => m.value));
  const range = max - min || 1;

  const points = REVENUE_MONTHS.map((month, index) => {
    const x = padding.left + (index / (REVENUE_MONTHS.length - 1)) * innerW;
    const y = padding.top + innerH - ((month.value - min) / range) * innerH;
    return { x, y, ...month };
  });

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${padding.top + innerH} L ${points[0].x} ${padding.top + innerH} Z`;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">Monthly revenue</p>
        <DemoBadge />
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full max-w-full"
        role="img"
        aria-label="Demo monthly revenue trend"
      >
        <defs>
          <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={MINT} stopOpacity="0.55" />
            <stop offset="100%" stopColor={PRIMARY} stopOpacity="0.08" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#revenueFill)" />
        <path d={linePath} fill="none" stroke={PRIMARY} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((point) => (
          <circle key={point.label} cx={point.x} cy={point.y} r="3.5" fill={PRIMARY} stroke="#fff" strokeWidth="1.5" />
        ))}
        {points.map((point) => (
          <text
            key={`${point.label}-label`}
            x={point.x}
            y={height - 4}
            textAnchor="middle"
            className="fill-muted text-[9px]"
          >
            {point.label}
          </text>
        ))}
      </svg>
    </div>
  );
}

function SetupActivityChart() {
  const max = Math.max(...WEEKLY_SETUP.map((d) => d.value));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">Setup activity</p>
        <DemoBadge />
      </div>
      <div className="flex h-28 items-end justify-between gap-2" role="img" aria-label="Demo weekly setup activity">
        {WEEKLY_SETUP.map((day) => {
          const heightPct = max > 0 ? (day.value / max) * 100 : 0;
          return (
            <div key={day.label} className="flex min-w-0 flex-1 flex-col items-center gap-2">
              <div className="flex h-full w-full items-end justify-center">
                <div
                  className="w-full max-w-[2rem] rounded-t-md transition-all"
                  style={{
                    height: `${heightPct}%`,
                    minHeight: heightPct > 0 ? "4px" : "0",
                    background: `linear-gradient(180deg, ${MINT} 0%, ${PRIMARY} 100%)`,
                  }}
                  title={`${day.value}%`}
                />
              </div>
              <span className="text-[10px] font-medium text-muted">{day.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

type StatCardProps = {
  label: string;
  value: string;
  hint?: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  trend?: string;
};

function StatCard({ label, value, hint, icon: Icon, trend }: StatCardProps) {
  return (
    <article className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</p>
          <p className="text-2xl font-extrabold tracking-tight text-foreground">{value}</p>
          {(hint || trend) && (
            <p className="flex items-center gap-1 text-xs text-muted">
              {trend && (
                <span className="inline-flex items-center gap-0.5 font-semibold text-primary">
                  <TrendingUp size={12} />
                  {trend}
                </span>
              )}
              {hint && <span>{hint}</span>}
            </p>
          )}
        </div>
        <div className="rounded-xl bg-primary-soft p-2.5 text-primary">
          <Icon size={20} />
        </div>
      </div>
    </article>
  );
}

export function DashboardOverview({ displayName, email }: DashboardOverviewProps) {
  const [projects, setProjects] = useState<Project[]>(() => getCachedProjects() ?? []);
  const [integrations, setIntegrations] = useState<Integration[]>(() => getCachedIntegrations() ?? []);
  const [isLoading, setIsLoading] = useState(
    () => getCachedProjects() == null || getCachedIntegrations() == null
  );

  const loadData = useCallback(async () => {
    if (getCachedProjects() == null || getCachedIntegrations() == null) {
      setIsLoading(true);
    }
    try {
      const [nextProjects, nextIntegrations] = await Promise.all([
        fetchProjectsCached(),
        fetchIntegrationsCached(),
      ]);
      setProjects(nextProjects);
      setIntegrations(nextIntegrations);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const connectedCount = useMemo(
    () => integrations.filter((item) => item.connected).length,
    [integrations]
  );

  const avgProgress = useMemo(() => averageSetupProgress(projects), [projects]);

  const snapshotProjects = useMemo(() => {
    return [...projects]
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 4);
  }, [projects]);

  if (isLoading && projects.length === 0) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-wider text-primary">Overview</p>
        <h1 className="section-heading text-3xl font-extrabold md:text-4xl">Hi, {displayName}</h1>
        <p className="text-muted">Signed in as {email}</p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active projects" value={String(projects.length)} icon={FolderKanban} />
        <StatCard
          label="Avg setup progress"
          value={`${avgProgress}%`}
          hint={`Across ${projects.length} project${projects.length === 1 ? "" : "s"}`}
          icon={Layers}
        />
        <StatCard
          label="Monthly revenue"
          value="$8.4k"
          trend="+12.4%"
          hint="Sample metric"
          icon={DollarSign}
        />
        <StatCard
          label="Connected integrations"
          value={String(connectedCount)}
          hint={`Of ${integrations.length} available`}
          icon={Plug}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
          <RevenueAreaChart />
        </div>
        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
          <SetupActivityChart />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-bold text-foreground">Quick actions</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.href}
                href={action.href}
                className={cn(
                  "group flex items-center gap-3 rounded-2xl border border-border/80 bg-card p-4 shadow-sm transition-all",
                  "hover:border-primary/30 hover:shadow-md"
                )}
              >
                <div className="rounded-xl bg-primary-soft p-2.5 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                  <Icon size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-foreground">{action.label}</p>
                  <p className="text-xs text-muted">{action.description}</p>
                </div>
                <ArrowUpRight size={16} className="shrink-0 text-muted opacity-0 transition-opacity group-hover:opacity-100" />
              </Link>
            );
          })}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-foreground">Project setup snapshot</h2>
            <p className="text-sm text-muted">Latest progress across your workspace</p>
          </div>
          <Link href="/dashboard/projects" className="text-sm font-semibold text-primary hover:underline">
            View all
          </Link>
        </div>

        {snapshotProjects.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/60 p-8 text-center text-sm text-muted">
            No projects yet.{" "}
            <Link href="/dashboard/projects" className="font-semibold text-primary hover:underline">
              Create your first app
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {snapshotProjects.map((project) => {
              const progress = projectProgressPercent(project);
              const completed = project.completed_steps?.length ?? 0;
              return (
                <li key={project.id}>
                  <Link
                    href={`/dashboard/shipnow?project=${project.id}`}
                    className="block rounded-2xl border border-border/80 bg-card p-4 shadow-sm transition-all hover:border-primary/25 hover:shadow-md"
                  >
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-foreground">{project.name}</p>
                        <p className="text-xs text-muted">
                          {completed} of {SETUP_TOTAL_STEPS} steps complete
                        </p>
                      </div>
                      <span className="shrink-0 text-sm font-bold text-primary">{progress}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-surface">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${progress}%`,
                          background: `linear-gradient(90deg, ${PRIMARY} 0%, ${MINT} 100%)`,
                        }}
                      />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <p className="text-xs leading-relaxed text-muted">
        Revenue and setup activity charts use sample data for illustration. Active projects, average setup
        progress, integration counts, and the project snapshot reflect live data from your workspace.
      </p>
    </div>
  );
}
