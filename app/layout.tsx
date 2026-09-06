import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import Script from "next/script";
import { GoogleAnalytics } from "@next/third-parties/google";
import "./globals.css";
import config from "@/config";
import { siteUrl } from "@/libs/seo";
import { isAuthConfigured } from "@/libs/auth";
import { getServerUser } from "@/libs/supabase/get-server-user";
import Providers from "@/components/Providers";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: config.appName,
  title: {
    default: `${config.appName} — ${config.appDescription}`,
    template: `%s | ${config.appName}`,
  },
  description: config.appDescription,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const authEnabled = isAuthConfigured();
  const initialUser = authEnabled ? await getServerUser() : null;

  // Unset in development and preview deploys, so local clicks never land in the
  // production property. Rendering nothing is the difference between clean data
  // and reports nobody trusts.
  const gaId = process.env.NEXT_PUBLIC_GA_ID?.trim();

  return (
    <html lang="en" className={`${dmSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <Providers authEnabled={authEnabled} initialUser={initialUser}>
          {children}
        </Providers>

        {/* Our own analytics, on our own site. The id is public by design — it
            sits in a script tag on every visitor's page — so it is inlined
            rather than treated as configuration.

            `data-domains` is the same discipline as the GA gate below: preview
            deploys run on *.vercel.app and would otherwise fire beacons that
            ingest rejects for a hostname mismatch. The allowlist stops them at
            the client instead, so no request is made at all. Localhost is
            already skipped by the tracker itself. */}
        <Script
          src="/js/s.js"
          data-site="99a1b58f-81c6-4812-a239-edf4682d3747"
          data-domains="saasna.me,www.saasna.me"
          strategy="afterInteractive"
        />
      </body>
      {gaId ? <GoogleAnalytics gaId={gaId} /> : null}
    </html>
  );
}
