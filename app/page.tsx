import { Suspense } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import LandingHero from "@/components/landing/LandingHero";
import LandingHowItWorks from "@/components/landing/LandingHowItWorks";
import LandingTrendAnatomy from "@/components/landing/LandingTrendAnatomy";
import LandingPricing from "@/components/landing/LandingPricing";
import LandingFAQ from "@/components/landing/LandingFAQ";
import LandingFinalCTA from "@/components/landing/LandingFinalCTA";
import config from "@/config";
import { getSEOTags } from "@/libs/seo";
import { renderSchemaTags } from "@/libs/seo-schema";
import { LANDING_FAQS } from "@/libs/landing-faqs";

export const metadata = getSEOTags({
  title: "Catch the trend before it's crowded",
  description: config.appDescription,
  keywords: [
    "emerging trends",
    "trend discovery",
    "what to build next",
    "saas idea validation",
    "early market signals",
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
        <LandingTrendAnatomy />
        <LandingPricing />
        <LandingFAQ />
        <LandingFinalCTA />
      </main>
      <Footer variant="landing" />
    </div>
  );
}
