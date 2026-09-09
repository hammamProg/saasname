export type Article = {
  slug: string;
  title: string;
  description: string;
  content: string;
  categories: string[];
  author: string;
  /** ISO date (YYYY-MM-DD) — both a valid `datePublished` for BlogPosting
   *  JSON-LD and formattable for display, unlike a free-form string. */
  publishedAt: string;
};

export function formatPublishedAt(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

export const articles: Article[] = [
  {
    slug: "do-you-need-a-cookie-banner-for-website-analytics",
    title: "Do You Need a Cookie Banner for Website Analytics?",
    description:
      "The consent requirement comes from storing data on the visitor's device, not from measuring traffic. Here's the distinction that decides whether you need a banner.",
    content: `Most teams assume analytics automatically means a cookie banner. It doesn't.
The law that requires the banner — ePrivacy Directive Art. 5(3) in the EU, and
its equivalents elsewhere — is triggered by *storing or reading information on
the visitor's device*, not by measuring that a visit happened.

## What actually triggers consent

A cookie banner exists because a cookie was written to the browser and read
back on the next request. Local storage, device fingerprinting, and anything
else "stored in terminal equipment" trigger the same requirement. The trigger
is the storage, not the analytics.

Google Analytics needs a banner because it sets a first-party cookie (\`_ga\`)
that persists across visits to build a client ID. Most heatmap and session
replay tools need one for the same reason, often with more invasive fingerprinting
on top.

## What doesn't trigger it

If nothing is written to the device at all — no cookie, no localStorage, no
fingerprinting script — there's nothing for Art. 5(3) to apply to. The
visitor's browser is untouched. That's the whole reason "cookieless analytics"
is a category and not a marketing label: the mechanism it avoids is exactly
the one the law regulates.

## The nuance people skip

Server-side collection of IP addresses and user-agent strings still counts as
processing personal data under GDPR generally — that's a separate legal basis
question (usually legitimate interest, not consent), not an ePrivacy one. A
cookieless tool still needs a privacy policy and still needs to handle that
data responsibly. What it doesn't need is a banner asking permission before
the first pageview even loads, because it never touches the browser's storage
to begin with.

## The practical test

Before you decide you need a banner, ask one question about your analytics
tool: does it write anything to the browser? If the answer is no, you can
measure visitors, referrers, and live traffic without ever showing a consent
prompt — which is the whole premise behind cookieless tools like SaaSNa.me.`,
    categories: ["GDPR & Privacy"],
    author: "SaaSNa.me",
    publishedAt: "2026-08-28",
  },
  {
    slug: "cookieless-google-analytics-alternatives",
    title: "Cookieless Google Analytics Alternatives: What Actually Changes",
    description:
      "Switching away from Google Analytics for privacy reasons changes more than the dashboard. Here's what you gain, what you lose, and how to tell the tools apart.",
    content: `Google Analytics is free, familiar, and comes with a cookie banner, a consent
management platform, and — for EU-based sites sending data to US servers — a
Schrems II problem that several data protection authorities have already ruled
on. Switching to a cookieless alternative solves those specific problems. It's
worth being precise about what it does and doesn't change.

## What you gain

No consent banner. If the tool never writes to the browser, there's nothing
for the visitor to opt into, which means no banner, no rejected-cookie traffic
gap, and no CMP subscription.

Simpler data. Cookieless tools typically report what they can measure without
a persistent identifier: visitors, pageviews, referrers, countries, and live
traffic. That's usually the 20% of a GA dashboard that gets checked daily.

A lighter script. Most cookieless analytics tools ship a single small script
tag, versus Google's tag manager plus the analytics library plus whatever
consent SDK sits in front of it.

## What you lose

Cross-session identity. A cookie can recognize the same visitor a week later.
A cookieless identifier, if it exists at all, is usually derived from IP and
user-agent and rotated daily or hashed with a rotating salt — by design, it
cannot follow someone across a longer window. If "returning visitor over 90
days" is a metric you rely on, no cookieless tool will give you that number
honestly.

Audience remarketing integrations. Ad platforms that build retargeting
audiences from analytics cookies need a persistent client ID. A tool that
doesn't store one won't feed those integrations.

Very fine-grained funnels. Multi-step conversion tracking across sessions
usually assumes a stable identifier too. Some cookieless tools approximate
this within a single session; none replicate it across days without storing
something.

## How to tell the tools apart

"Privacy-friendly" is a marketing term with no fixed technical meaning — check
what each tool actually does, not what it calls itself:

- Does it set a cookie or use localStorage at all? If yes, it still needs a
  banner, regardless of what the vendor calls it.
- Does it fingerprint the device (canvas, fonts, screen size, timezone)?
  That's a consent trigger too, and arguably worse for privacy than a cookie.
- Is the identifier, if any, rotated or destroyed on a fixed schedule, or does
  it persist indefinitely?

If you only need to know how many people visited, where they came from, and
who's online right now, the tradeoff is easy. If you need 90-day cohort
retention or ad-platform remarketing, a cookieless tool is the wrong category
regardless of which one you pick.`,
    categories: ["Comparisons"],
    author: "SaaSNa.me",
    publishedAt: "2026-09-01",
  },
  {
    slug: "see-who-is-on-your-website-right-now",
    title: "How to See Who's on Your Website Right Now (Without Cookies)",
    description:
      "Live visitor counts don't require a persistent identifier — just a window of recent activity. Here's what a real-time view can and can't tell you.",
    content: `"Who's on my site right now" is a different question from "who visited my
site this month," and it has a simpler answer. A live count doesn't need to
recognize the same person twice across days — it just needs to know how many
distinct visits produced a request in the last few minutes.

## What a live count actually measures

A typical live-visitors widget buckets activity into a short rolling window —
30 minutes is a common default, matching the industry-standard definition of
a "session." Every pageview or heartbeat that lands inside that window counts
toward the current total. Once a visitor goes quiet past the window, they drop
out of the count automatically. No explicit "visitor left" signal is needed.

This is why a cookieless approach works fine here even though it can't track
long-term identity: the question only spans minutes, not months.

## What you can see alongside the count

A useful live view usually pairs the headline number with:

- **An activity shape** — a small bar chart of visits per minute over the
  window, so a spike from a new backlink or a tweet is visible immediately
  instead of buried in tomorrow's daily total.
- **Country breakdown** — where the current visitors are, which is often
  enough to tell you whether a spike is the audience you expected or a bot
  crawl from an unexpected region.

## What it won't tell you

A live count answers "how many," not "who, again." It won't tell you if the
same visitor refreshed the page five times, and it won't connect this
session to one from last week — that would require exactly the persistent
identifier a cookieless approach is built not to keep. If you're watching a
launch, a live count is the right tool. If you're building a lifetime-value
model, it isn't, and no live widget from any vendor changes that.

## Where this is useful in practice

Watching a live count during a launch, a newsletter send, or a press mention
turns a lagging metric into an immediate one — you find out in the first
minute whether traffic showed up, not the next morning when you check a
dashboard. That immediacy is the entire value of a live view, and it's why
SaaSNa.me surfaces it as the first number on every site's dashboard, not a
secondary tab.`,
    categories: ["Product"],
    author: "SaaSNa.me",
    publishedAt: "2026-09-03",
  },
  {
    slug: "how-cookieless-analytics-tracks-visitors",
    title: "How Cookieless Analytics Tracks Visitors Without Cookies",
    description:
      "No cookie means no stored identifier — so how does a cookieless tool tell visitors apart? Here's the actual mechanism, not the marketing version.",
    content: `"Cookieless" is easy to claim and hard to verify. The honest version of the
claim is specific about the mechanism, so here's ours, in full.

## The identity problem

To report "3 visitors" instead of "9 pageviews," an analytics tool needs some
way to tell that two requests came from the same person without storing
anything on their device. The only inputs available for that, without writing
to the browser, are the headers a request already sends: IP address and
User-Agent.

## The mechanism

A visitor's session id is computed as a hash of a rotating salt, the request's
IP address, its User-Agent string, and the site's domain — nothing else.

IP and User-Agent are headers the browser sends on every request regardless of
this tool's existence, so reading them is passive processing, not "gaining
access to information stored in terminal equipment" — the specific trigger
ePrivacy regulates. Including the site's domain in the hash means the same
visitor on two different customers' sites produces two unrelated ids, so
cross-site tracking isn't possible even in principle.

## Why the salt matters more than the hash

Hashing alone isn't enough — a fixed salt can be brute-forced back to the
original IP and User-Agent, since both have far less entropy than a real
secret. The salt has to be random, non-public, and short-lived. A daily
rotating salt, destroyed after 48 hours, means that once it's gone, the
resulting id can't be reversed or re-linked by anyone, including us. That
destruction is what makes the identifier genuinely anonymous rather than
merely disguised.

Two salts stay valid at once, so a session that spans midnight resolves to
one visitor instead of splitting into two.

## What this deliberately doesn't include

Screen size, timezone, installed fonts, canvas rendering — every one of these
would sharpen the identifier, and every one of them is also a fingerprinting
signal that moves the mechanism toward exactly what consent law regulates.
The identity input stays limited to headers the browser sends passively, on
purpose, even though adding more signals would make the visitor count more
precise.

## The tradeoff, stated plainly

Because the salt rotates and destroys itself, this identifier cannot track
anyone across more than about two days, and it was never meant to. It answers
"how many distinct visitors" and "did the same person view three pages in one
session" — not "is this the same person who visited last month." That
boundary is the actual cost of not using cookies, and no vendor should tell
you otherwise.`,
    categories: ["How it works"],
    author: "SaaSNa.me",
    publishedAt: "2026-09-05",
  },
  {
    slug: "the-real-cost-of-a-cookie-consent-banner",
    title: "The Real Cost of a Cookie Consent Banner",
    description:
      "A consent banner isn't free even when the tool behind it is. Here's what it actually costs in bounce rate, engineering time, and data quality.",
    content: `Consent management platforms bill themselves as a compliance checkbox: install
the script, configure the categories, done. The invoice that follows is longer
than that.

## The bounce-rate cost

A banner is the first thing a new visitor sees, before any content. Every
extra click between arrival and the page they came for loses some fraction of
visitors — the exact number varies by design and industry, but it's never
zero, and it's rarely measured because the tool that would measure it is the
one asking for permission.

## The data-quality cost

Whatever fraction of visitors reject or ignore the banner becomes invisible to
analytics running behind it. That's not a small-print caveat — it means every
report from a consent-gated tool is undercounting by an unknown, unmeasured
amount, and that amount changes as banner design, browser defaults, and
regional consent rates shift. A dashboard built on rejected-cookie survivors
looks precise. It isn't.

## The engineering cost

Someone has to: pick a CMP, configure it to actually block scripts before
consent (not just visually hide the banner — a common and cited compliance
gap), keep the cookie categorization current as the site adds new third-party
scripts, and re-test the flow whenever a regulator's guidance shifts. That's
recurring maintenance attached to a feature that adds nothing for the user.

## The legal-risk cost

A misconfigured banner — one that fires tracking scripts before consent, or
makes "reject" harder to find than "accept" — is worse than no banner at all
from an enforcement standpoint, because it's evidence the requirement was
understood and not met. Several EU data protection authorities have issued
fines specifically for banner implementation, not just for missing banners
entirely.

## The alternative isn't "ignore the law"

None of this is an argument for skipping consent when consent is legally
required. It's an argument for checking whether it's required in the first
place. If the tool behind the banner doesn't write anything to the visitor's
device, the banner may be solving a problem that specific tool doesn't create.
Removing an unnecessary banner removes all four costs above at once, not just
the annoyance.`,
    categories: ["GDPR & Privacy"],
    author: "SaaSNa.me",
    publishedAt: "2026-09-07",
  },
  {
    slug: "install-website-analytics-with-one-script-tag",
    title: "Installing Website Analytics With One Script Tag",
    description:
      "No SDK, no consent library, no configuration file — just a script tag in the head. Here's what a minimal analytics install actually needs to do.",
    content: `Most analytics installs involve more than analytics: a tag manager, a
consent library gating it, an environment config, and a verification step
before the first pageview shows up. A cookieless tool can skip most of that,
because there's no consent state to manage and nothing to configure per
environment.

## What the script actually needs to do

Three things, in order, on every pageview:

1. Read the current path and referrer.
2. Send them to a collection endpoint, along with nothing else — no
   identifiers to generate client-side, since identity is derived
   server-side from request headers, not from anything the script computes.
3. Do it without blocking render, so a slow or failed analytics request never
   affects the page the visitor actually came for.

That's small enough to ship as a single script tag with no dependencies,
which is why installing it is one paste, not a setup wizard.

## Where it goes

The script belongs in \`<head>\`, loaded with \`async\` or \`defer\` so it never
delays the page's own content. There's no tag-manager container to configure
first and no consent gate to wire it behind, because there's nothing the
script does that requires consent.

## How to verify it worked

The fastest check isn't waiting for tomorrow's report — it's opening the
site's live dashboard in a second tab immediately after installing and
loading the page once. A cookieless live count updates within the current
30-minute window, so a successful install shows up as "1 visitor, right now"
within seconds, not after an overnight batch job.

## What "done" looks like

If the script is in \`<head>\`, loads asynchronously, and the live dashboard
shows the test pageview, the install is complete. There's no cookie consent
category to add, no CMP to configure around it, and no separate event schema
to define before the first number appears — visitors, referrers, and
countries start populating from that first pageview onward.`,
    categories: ["Getting started"],
    author: "SaaSNa.me",
    publishedAt: "2026-09-09",
  },
];

export function getArticle(slug: string) {
  return articles.find((a) => a.slug === slug);
}
