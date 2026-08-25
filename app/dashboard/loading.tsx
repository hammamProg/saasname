export default function DashboardLoading() {
  return (
    <div className="animate-pulse space-y-8" aria-busy aria-label="Loading">
      <div className="space-y-3">
        <div className="h-4 w-24 rounded bg-primary-soft/60" />
        <div className="h-9 w-64 max-w-full rounded-lg bg-primary-soft/40" />
        <div className="h-4 w-48 max-w-full rounded bg-primary-soft/30" />
      </div>
      <div className="h-48 rounded-2xl border border-border bg-card/80" />
      <div className="space-y-3">
        <div className="h-24 rounded-2xl border border-border bg-card/80" />
        <div className="h-24 rounded-2xl border border-border bg-card/80" />
        <div className="h-24 rounded-2xl border border-border bg-card/80" />
      </div>
    </div>
  );
}
