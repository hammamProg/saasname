import { Suspense } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import LandingHero from "@/components/landing/LandingHero";
import LandingProblem from "@/components/landing/LandingProblem";
import LandingSolution from "@/components/landing/LandingSolution";
import LandingHowItWorks from "@/components/landing/LandingHowItWorks";
import LandingCodePreview from "@/components/landing/LandingCodePreview";
import LandingTimeSavings from "@/components/landing/LandingTimeSavings";
import LandingFounderBenefits from "@/components/landing/LandingFounderBenefits";
import LandingTechStack from "@/components/landing/LandingTechStack";
import LandingTestimonials from "@/components/landing/LandingTestimonials";
import LandingPricing from "@/components/landing/LandingPricing";
import LandingFAQ from "@/components/landing/LandingFAQ";
import LandingFinalCTA from "@/components/landing/LandingFinalCTA";
import { getSEOTags } from "@/libs/seo";
import { renderSchemaTags } from "@/libs/seo-schema";

export const metadata = getSEOTags({
  title: "Launch Your SaaS in Days. Not Months.",
  description:
    "ShipNow is a production-ready SaaS starter kit with authentication, payments, emails, database, SEO, and deployment workflows already configured.",
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
        <LandingCodePreview />
        <LandingTimeSavings />
        <LandingFounderBenefits />
        <LandingTechStack />
        <LandingTestimonials />
        <LandingPricing />
        <LandingFAQ />
        <LandingFinalCTA />
      </main>
      <Footer variant="landing" />
    </div>
  );
}
