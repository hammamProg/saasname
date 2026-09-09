import LiveVisitorsCard from "@/components/webstats/LiveVisitorsCard";

/** The dogfooded site: saasna.me tracking itself. Real traffic, not a
 *  synthetic feed — a visitor sees this page's own live numbers, the same
 *  way datafa.st's landing page demos datafa.st's own stats.
 *
 *  The public embed endpoint's same-origin check is what makes this safe to
 *  call with no auth: a request made from this page has a Referer that
 *  matches this page's own host, so it clears the check that otherwise
 *  requires the site's domain to be allowlisted. */
const SAASNAME_SITE_ID = "99a1b58f-81c6-4812-a239-edf4682d3747";

export default function HeroLiveDemo() {
  return (
    <div className="p-6 sm:p-7">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
            Live right now
          </p>
          <h3 className="mt-1 truncate text-xl font-extrabold tracking-tight">
            saasna.me
          </h3>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-success">
          <span className="size-1.5 rounded-full bg-success" />
          This page
        </span>
      </div>

      <div className="mt-5">
        <LiveVisitorsCard
          endpoint={`/api/webstats/embed/${SAASNAME_SITE_ID}/live`}
          frameless
        />
      </div>
    </div>
  );
}
