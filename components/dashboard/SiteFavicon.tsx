"use client";

import { useState } from "react";

/** The tracked site's own icon.
 *
 *  Loaded straight from the customer's domain, not through a favicon CDN.
 *  Google's and DuckDuckGo's endpoints are one line of code, but every render
 *  would tell a third party which domains our customers track — which is a
 *  strange thing for a privacy-first analytics product to do. The browser
 *  fetching `/favicon.ico` from the site itself tells nobody anything new.
 *
 *  It is also not fetched server-side. Requesting a user-supplied URL from our
 *  own infrastructure is an SSRF surface, and a favicon is not worth building
 *  an allowlist and private-range guard for.
 *
 *  The cost is coverage: sites that declare a different path in their HTML and
 *  serve nothing at the root fall back to a monogram. That is a smaller
 *  failure than either of the alternatives. */
export default function SiteFavicon({
  domain,
  size = 20,
  className = "",
}: {
  domain: string;
  size?: number;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  const box = `inline-flex shrink-0 items-center justify-center overflow-hidden rounded-md ${className}`;
  const style = { width: `${size}px`, height: `${size}px` };

  if (failed) {
    return (
      <span
        aria-hidden="true"
        className={`${box} bg-primary-soft font-semibold uppercase text-primary`}
        style={{ ...style, fontSize: `${Math.round(size * 0.5)}px` }}
      >
        {domain.slice(0, 1)}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://${domain}/favicon.ico`}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      onError={() => setFailed(true)}
      className={`${box} bg-surface object-contain`}
      style={style}
    />
  );
}
