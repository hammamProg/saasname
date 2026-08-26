import { Suspense } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import LandingHero from "@/components/landing/LandingHero";
import LandingProblem from "@/components/landing/LandingProblem";
import LandingSolution from "@/components/landing/LandingSolution";
import LandingHowItWorks from "@/components/landing/LandingHowItWorks";
import LandingReportPreview from "@/components/landing/LandingReportPreview";
import LandingComparison from "@/components/landing/LandingComparison";
import LandingFounderBenefits from "@/components/landing/LandingFounderBenefits";
import LandingSources from "@/components/landing/LandingSources";
import LandingPricing from "@/components/landing/LandingPricing";
import LandingFAQ from "@/components/landing/LandingFAQ";
import LandingFinalCTA from "@/components/landing/LandingFinalCTA";
import config from "@/config";
import { getSEOTags } from "@/libs/seo";
import { renderSchemaTags } from "@/libs/seo-schema";

export const metadata = getSEOTags({
  title: "Find a SaaS name that is actually free to use",
  description: config.appDescription,
  keywords: [
    "saas name generator",
    "domain availability check",
    "trademark search",
    "startup name checker",
    "app name availability",
  ],
  canonicalUrlRelative: "/",
});

export default function Home() {
  return (
    <div className="landing-theme min-h-screen">
      {renderSchemaTags()}
      <Suspense>
        <Header variant="landing" />
      </Suspense>
      <main>
        <LandingHero />
        <LandingProblem />
        <LandingSolution />
        <LandingHowItWorks />
        <LandingReportPreview />
        <LandingComparison />
        <LandingFounderBenefits />
        <LandingSources />
        <LandingPricing />
        <LandingFAQ />
        <LandingFinalCTA />
      </main>
      <Footer variant="landing" />
    </div>
  );
}
