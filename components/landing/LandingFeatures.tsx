import { SectionHeader } from "@/components/landing/shared";
import AnalyticsCardSample from "@/components/landing/AnalyticsCardSample";

const annotations = [
  {
    label: "Unique, not raw",
    body: "Visitor counts are deduplicated by session, not by pageview — reloading a page or browsing five of them in one visit still counts as one person.",
  },
  {
    label: "Live",
    body: "Who's online right now updates on its own, no refresh needed. The install check itself confirms in seconds instead of leaving you guessing.",
  },
  {
    label: "Real sources",
    body: "Referrers split into channel, direct and campaign instead of one \"unknown\" bucket — so the traffic you can't explain is actually the traffic you can't explain, not everything you didn't tag.",
  },
];

export default function LandingFeatures() {
  return (
    <section id="features" className="relative py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          badge="What you get"
          title="The numbers, without the cookie prompt."
          subtitle="A report you can read in ten seconds, backed by a visitor identity that never touches their device."
        />

        <div className="mt-14 grid items-start gap-10 lg:grid-cols-2 lg:gap-14">
          <AnalyticsCardSample className="lg:sticky lg:top-24" />

          <dl className="space-y-5">
            {annotations.map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-border bg-card p-6"
              >
                <dt className="text-sm font-bold uppercase tracking-wider text-primary">
                  {item.label}
                </dt>
                <dd className="mt-2 text-sm leading-relaxed text-muted">
                  {item.body}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
