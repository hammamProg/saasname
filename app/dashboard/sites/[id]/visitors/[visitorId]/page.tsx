import Link from "next/link";
import { notFound } from "next/navigation";
import { getSEOTags } from "@/libs/seo";
import { requireUser } from "@/libs/supabase/require-user";
import { getSite } from "@/libs/webstats/sites";
import { getVisitorJourney, type JourneyEntry } from "@/libs/webstats/journey";

export const dynamic = "force-dynamic";

export const metadata = getSEOTags({
  title: "Visitor journey",
  description: "One visitor's timeline, from first touch to now.",
  robots: { index: false, follow: false },
});

function describe(entry: JourneyEntry): string {
  switch (entry.kind) {
    case "session_start":
      return `Session started — ${entry.channel} (${entry.source} / ${entry.medium}${entry.campaign ? ` / ${entry.campaign}` : ""})`;
    case "page":
      return `Viewed ${entry.path}`;
    case "track":
      return `Event — ${entry.name ?? "unnamed"}`;
    case "identify":
      return entry.userId ? `Identified — ${entry.userId}` : "Identified";
  }
}

export default async function VisitorJourneyPage({
  params,
}: {
  params: Promise<{ id: string; visitorId: string }>;
}) {
  await requireUser();

  const { id, visitorId } = await params;
  const site = await getSite(id);
  if (!site) notFound();

  const entries = await getVisitorJourney(id, visitorId);

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Link
          href={`/dashboard/sites/${id}/acquisition`}
          className="text-sm text-muted hover:text-foreground"
        >
          ← Acquisition
        </Link>
        <h1 className="section-heading text-3xl font-extrabold">
          Visitor journey
        </h1>
        <p className="font-mono text-xs text-muted">{visitorId}</p>
      </div>

      {entries.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted">
          No recorded activity for this visitor.
        </p>
      ) : (
        <ol className="space-y-3 border-l border-border pl-6">
          {entries.map((entry, index) => (
            <li key={`${entry.kind}-${entry.at}-${index}`} className="relative">
              <span
                className="absolute -left-[1.65rem] top-1.5 size-2.5 rounded-full bg-primary"
                aria-hidden="true"
              />
              <p className="text-sm font-semibold">{describe(entry)}</p>
              <p className="text-xs text-muted">{new Date(entry.at).toLocaleString()}</p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
