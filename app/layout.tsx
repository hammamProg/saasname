import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
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
      </body>
      {gaId ? <GoogleAnalytics gaId={gaId} /> : null}
    </html>
  );
}
