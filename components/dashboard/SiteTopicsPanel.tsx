import Link from "next/link";
import type { SiteTopic } from "@/libs/webstats/site-topics";

/** Trends the site's own traffic is touching.
 *
 *  The reason this product is not another pageview counter. Every row states
 *  what matched and why, because a claim of relevance without its evidence is
 *  just an assertion — and this is the one screen where being wrong is
 *  obvious to the reader. */
export default function SiteTopicsPanel({
  topics,
  domain,
}: {
  topics: SiteTopic[];
  domain: string;
}) {
  if (topics.length === 0) {
    return (
      <section className="rounded-2xl border border-border bg-card p-6">
        <h2 className="section-heading text-xl font-extrabold">
          Trends in your traffic
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Nothing matched yet. Matches are recomputed weekly from the pages your
          visitors actually land on, so this fills in once {domain} has a few
          pages with traffic.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="section-heading text-xl font-extrabold">
          Trends in your traffic
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Rising topics that overlap what your visitors are reading. Matched
          against the same signals the trends feed is built from.
        </p>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2">
        {topics.map((topic) => (
          <li
            key={topic.topicId}
            className="rounded-2xl border border-border bg-card p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                {topic.locked ? (
                  <p className="truncate font-semibold blur-[5px] select-none">
                    {topic.name}
                  </p>
                ) : (
                  <Link
                    href={`/dashboard/trends/${topic.slug}`}
                    className="block truncate font-semibold hover:text-primary"
                  >
                    {topic.name}
                  </Link>
                )}
                <p className="mt-1 text-xs text-muted">
                  {topic.stage.replace(/_/g, " ")} · trend score{" "}
                  {Math.round(topic.trendScore)}
                </p>
              </div>

              <span
                className={
                  topic.source === "alias"
                    ? "shrink-0 rounded-full bg-primary-soft px-2.5 py-1 text-xs font-semibold text-primary"
                    : "shrink-0 rounded-full bg-accent-soft px-2.5 py-1 text-xs font-semibold text-accent"
                }
                title={
                  topic.source === "alias"
                    ? "Your pages name this topic directly"
                    : "Your pages are semantically close to this topic"
                }
              >
                {topic.source === "alias" ? "Named" : "Related"}
              </span>
            </div>

            {topic.evidence ? (
              <p className="mt-3 truncate text-xs text-muted" title={topic.evidence}>
                Matched on “{topic.evidence}”
              </p>
            ) : null}

            {topic.locked ? (
              <p className="mt-3 text-xs">
                <Link
                  href="/dashboard/billing"
                  className="font-semibold text-primary"
                >
                  Upgrade
                </Link>{" "}
                <span className="text-muted">to see this trend in full.</span>
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
