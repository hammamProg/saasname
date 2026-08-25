export function DashboardOverview({ displayName }: { displayName: string }) {
  return (
    <section className="space-y-2">
      <h1 className="section-heading text-3xl font-extrabold md:text-4xl">
        Hi, {displayName}
      </h1>
      <p className="text-muted">
        Start by describing your idea, or check a name you already have in mind.
      </p>
    </section>
  );
}
