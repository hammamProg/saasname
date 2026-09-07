import { Suspense } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import LandingHero from "@/components/landing/LandingHero";
import LandingHowItWorks from "@/components/landing/LandingHowItWorks";
import LandingFeatures from "@/components/landing/LandingFeatures";
import LandingSourcesStrip from "@/components/landing/LandingSourcesStrip";
import LandingFAQ from "@/components/landing/LandingFAQ";
import LandingFinalCTA from "@/components/landing/LandingFinalCTA";
import config from "@/config";
import { getSEOTags } from "@/libs/seo";
import { renderSchemaTags } from "@/libs/seo-schema";
import { LANDING_FAQS } from "@/libs/landing-faqs";

export const metadata = getSEOTags({
  title: "Website analytics without the cookie banner",
  description: config.appDescription,
  keywords: [
    "cookieless analytics",
    "web analytics",
    "privacy friendly analytics",
    "no cookie banner",
    "GDPR analytics",
    "real time visitors",
  ],
  canonicalUrlRelative: "/",
});

export default function Home() {
  return (
    <div className="landing-theme min-h-screen">
      {renderSchemaTags(LANDING_FAQS)}
      <Suspense>
        <Header variant="landing" />
      </Suspense>
      <main>
        <LandingHero />
        <LandingHowItWorks />
        <LandingFeatures />
        <LandingSourcesStrip />
        <LandingFAQ />
        <LandingFinalCTA />
      </main>
      <Footer variant="landing" />
    </div>
  );
}
