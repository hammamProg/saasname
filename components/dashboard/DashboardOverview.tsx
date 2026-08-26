export function DashboardOverview({
  displayName,
  hasReports,
}: {
  displayName: string;
  hasReports: boolean;
}) {
  return (
    <section className="space-y-2">
      <h1 className="section-heading text-3xl font-extrabold md:text-4xl">
        Hi, {displayName}
      </h1>
      <p className="text-muted">
        {hasReports
          ? "Pick up where you left off, or start a new check."
          : "Describe your idea and we will name it, or check a name you already have in mind."}
      </p>
    </section>
  );
}
