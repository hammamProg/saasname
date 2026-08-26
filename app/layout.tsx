import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import config from "@/config";
import { siteUrl } from "@/libs/seo";
import { isAuthConfigured } from "@/libs/auth";
import { getServerUser } from "@/libs/supabase/get-server-user";
import Providers from "@/components/Providers";

const inter = Inter({
  variable: "--font-inter",
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

  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <Providers authEnabled={authEnabled} initialUser={initialUser}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
