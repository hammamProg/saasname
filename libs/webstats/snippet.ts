/** The install snippet shown after a site is created.
 *
 *  Generated server-side from the site's real id so the value on screen is
 *  always paste-ready. "Where exactly do I put this" is the first support
 *  question every analytics product gets, so the framework variants are part
 *  of the product, not documentation. */

import config from "@/config";

export type SnippetVariant = {
  id: "html" | "nextjs" | "wordpress";
  label: string;
  /** Where the snippet goes, in one line. */
  hint: string;
  language: "html" | "tsx";
  code: string;
};

/** Absolute origin the tracker is served from. Falls back to the configured
 *  production URL so a snippet copied from a preview deploy still points at a
 *  host that will exist. */
function trackerOrigin(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "") ||
    config.productionUrl
  );
}

export function trackerScriptUrl(): string {
  return `${trackerOrigin()}/js/s.js`;
}

export function snippetVariants(siteId: string): SnippetVariant[] {
  const src = trackerScriptUrl();

  return [
    {
      id: "html",
      label: "HTML",
      hint: "Paste before the closing </head> tag on every page.",
      language: "html",
      code: `<script defer data-site="${siteId}" src="${src}"></script>`,
    },
    {
      id: "nextjs",
      label: "Next.js",
      hint: "Add to app/layout.tsx. Works with the App Router.",
      language: "tsx",
      // A whole layout rather than a fragment: the previous version was three
      // lines with a "// inside your root layout" comment in the middle, which
      // is not something anyone can paste. Note there is no `defer` — the
      // attribute only means anything on a parser-inserted tag, and next/script
      // injects it, so `strategy` is what controls load timing here.
      code: `import Script from "next/script";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <Script
          src="${src}"
          data-site="${siteId}"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}`,
    },
    {
      id: "wordpress",
      label: "WordPress",
      hint: "Appearance → Theme File Editor → header.php, before </head>.",
      language: "html",
      code: `<script defer data-site="${siteId}" src="${src}"></script>`,
    },
  ];
}
