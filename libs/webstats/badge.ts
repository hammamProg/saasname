/** "Powered by" footer badge, generated per site.
 *
 *  Plain HTML with inline styles rather than a script tag: it needs no
 *  network request beyond the icon image, so it cannot fail to render or
 *  add another beacon to the page, and inline styles mean it looks the same
 *  regardless of whatever CSS the host page already has.
 *
 *  The link is UTM-tagged, which is what turns "someone clicked a badge on
 *  a customer's site" into a real, attributed row in that same customer's
 *  own Acquisition report the next time they look — see
 *  libs/webstats/attribution.ts. utm_campaign carries the referring site's
 *  domain, so a customer running the badge on multiple sites can tell them
 *  apart in the numbers. */

import config from "@/config";

function badgeOrigin(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "") ||
    config.productionUrl
  );
}

export function badgeIconUrl(): string {
  return `${badgeOrigin()}/icon.png`;
}

export function badgeHref(domain: string): string {
  const origin = badgeOrigin();
  const params = new URLSearchParams({
    utm_source: "powered_by",
    utm_medium: "referral",
    utm_campaign: domain,
  });
  return `${origin}/?${params.toString()}`;
}

export function badgeSnippet(domain: string): string {
  const href = badgeHref(domain);

  // One line, one <a>, no external stylesheet and no script — copy, paste,
  // done. font-family falls back through the host's own sans-serif rather
  // than assuming one is available.
  return `<a href="${href}" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border-radius:999px;background:#1A1A1A;color:#fff;font:600 13px system-ui,-apple-system,sans-serif;text-decoration:none;line-height:1;">
  <img src="${badgeIconUrl()}" alt="" width="14" height="14" style="display:block;border-radius:3px;">
  Powered by ${config.appName}
</a>`;
}
