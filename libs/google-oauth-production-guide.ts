import type { GoogleOAuthGuideStep, GoogleOAuthUrls } from "./google-oauth-guide-types";

export function buildGoogleOAuthProductionSteps(urls: GoogleOAuthUrls): GoogleOAuthGuideStep[] {
  return [
    {
      id: "supabase-provider",
      title: "Supabase Authentication → Google provider",
      caption:
        "If not auto-applied in step 4, open Supabase → Authentication → Providers → Google and paste your Client ID and Secret.",
    },
    {
      id: "publish",
      title: "Publish the OAuth app",
      caption:
        "In Google Auth Platform → Audience, switch from Testing to In production and click Publish app. Complete any missing branding or contact info first.",
    },
    {
      id: "verification",
      title: "Google verification",
      caption:
        "Google emails you to start verification. Verify your domain in Google Search Console first — this usually takes a few days.",
    },
    {
      id: "supabase-urls",
      title: "Supabase URL configuration",
      caption: `In Supabase → Authentication → URL Configuration, set Site URL to ${urls.productionSiteUrl} and add Redirect URLs: ${urls.productionRedirectUrl} and http://localhost:3000/**`,
    },
  ];
}
