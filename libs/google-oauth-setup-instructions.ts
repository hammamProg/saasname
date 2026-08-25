import config from "@/config";
import { GOOGLE_OAUTH_GUIDE_IMAGES } from "./google-oauth-guide-images";
import type { GoogleOAuthGuideSection, GoogleOAuthUrls } from "./google-oauth-guide-types";
import { buildGoogleOAuthProductionSteps } from "./google-oauth-production-guide";

export type { GoogleOAuthGuideStep, GoogleOAuthGuideSection, GoogleOAuthUrls } from "./google-oauth-guide-types";

export function buildSupabaseGoogleCallbackUrl(projectRef?: string | null): string {
  const ref = projectRef?.trim() || "YOUR_PROJECT_REF";
  return `https://${ref}.supabase.co/auth/v1/callback`;
}

export function buildSupabaseOrigin(projectRef?: string | null): string {
  const ref = projectRef?.trim() || "YOUR_PROJECT_REF";
  return `https://${ref}.supabase.co`;
}

export function buildGoogleOAuthUrls(projectRef?: string | null): GoogleOAuthUrls {
  const supabaseOrigin = buildSupabaseOrigin(projectRef);
  const callbackUrl = buildSupabaseGoogleCallbackUrl(projectRef);
  return {
    localhostOrigin: "http://localhost:3000",
    supabaseOrigin,
    callbackUrl,
    productionSiteUrl: "https://your-domain.com",
    productionRedirectUrl: "https://your-domain.com/**",
  };
}

export function buildGoogleOAuthGuideSections(
  urls: GoogleOAuthUrls
): GoogleOAuthGuideSection[] {
  const tosUrl = config.links.terms;
  const privacyUrl = config.links.privacy;

  return [
    {
      id: "setup",
      title: "Dev setup (~10 min)",
      summary:
        "Create the OAuth client and save credentials below. Localhost works immediately in Testing mode.",
      steps: [
        {
          id: "new-project",
          title: "Create a Google Cloud project",
          caption: 'Open Google Cloud Console → New Project. Name it (e.g. "ShipNow") and click Create.',
          image: GOOGLE_OAUTH_GUIDE_IMAGES.newProject,
          imageAlt: "Google Cloud Console new project form",
          link: { label: "Google Cloud Console", url: "https://console.cloud.google.com/" },
        },
        {
          id: "select-project",
          title: "Select your new project",
          caption:
            "When creation finishes, open the notification bell and click Select project so the console uses your new project.",
          image: GOOGLE_OAUTH_GUIDE_IMAGES.selectProject,
          imageAlt: "Notification to select newly created project",
        },
        {
          id: "apis-services",
          title: "Open APIs & Services",
          caption: "From the dashboard Quick access cards, click APIs & Services.",
          image: GOOGLE_OAUTH_GUIDE_IMAGES.apisServices,
          imageAlt: "APIs and Services quick access card",
        },
        {
          id: "credentials-nav",
          title: "Go to Credentials",
          caption: "In the left sidebar under APIs & Services, open Credentials.",
          image: GOOGLE_OAUTH_GUIDE_IMAGES.credentialsNav,
          imageAlt: "Credentials menu item in APIs and Services",
          link: {
            label: "Open Credentials",
            url: "https://console.cloud.google.com/apis/credentials",
          },
        },
        {
          id: "configure-consent",
          title: "Configure consent screen",
          caption:
            "On the Credentials page, click Configure consent screen in the yellow banner. This opens the new Google Auth Platform flow.",
          image: GOOGLE_OAUTH_GUIDE_IMAGES.configureConsent,
          imageAlt: "Configure consent screen button on Credentials page",
          link: {
            label: "OAuth consent screen",
            url: "https://console.cloud.google.com/apis/credentials/consent",
          },
        },
        {
          id: "auth-get-started",
          title: "Get started on Google Auth Platform",
          caption: "Click Get started to begin configuring your app's identity and OAuth settings.",
          image: GOOGLE_OAUTH_GUIDE_IMAGES.authGetStarted,
          imageAlt: "Google Auth Platform get started button",
        },
        {
          id: "app-info",
          title: "App name & support email",
          caption: `Enter your app name and support email. Use prompts from ${tosUrl} & ${privacyUrl} if you need policy text later. Click Create when done.`,
          image: GOOGLE_OAUTH_GUIDE_IMAGES.appInfo,
          imageAlt: "OAuth app name and support email form",
        },
        {
          id: "audience-external",
          title: "Choose External audience",
          caption:
            "Select External so any Google account can sign in (starts in Testing mode). Add yourself as a test user under Audience if prompted.",
          image: GOOGLE_OAUTH_GUIDE_IMAGES.audienceExternal,
          imageAlt: "External audience option for OAuth consent",
        },
        {
          id: "create-oauth-client",
          title: "Create OAuth client",
          caption: "From Google Auth Platform → Overview, click Create OAuth client.",
          image: GOOGLE_OAUTH_GUIDE_IMAGES.createOAuthClient,
          imageAlt: "Create OAuth client button",
        },
        {
          id: "web-application",
          title: "Choose Web application",
          caption: "Application type must be Web application for Supabase Google sign-in.",
          image: GOOGLE_OAUTH_GUIDE_IMAGES.webApplication,
          imageAlt: "Web application OAuth client type dropdown",
        },
        {
          id: "origins",
          title: "Authorized JavaScript origins",
          caption: `Add both origins below, then click + Add URI for each.`,
          image: GOOGLE_OAUTH_GUIDE_IMAGES.javascriptOrigins,
          imageAlt: "Authorized JavaScript origins fields",
        },
        {
          id: "redirects",
          title: "Authorized redirect URIs",
          caption: `Add the Supabase callback URL below (add your www subdomain too if you use one).`,
          image: GOOGLE_OAUTH_GUIDE_IMAGES.redirectUris,
          imageAlt: "Authorized redirect URIs fields",
        },
        {
          id: "copy-keys",
          title: "Copy your OAuth keys",
          caption:
            "After clicking Create, copy the Client ID and Client Secret — paste them in the form below. You cannot view the secret again after closing the dialog.",
          image: GOOGLE_OAUTH_GUIDE_IMAGES.clientCreated,
          imageAlt: "OAuth client ID and secret after creation",
        },
      ],
    },
    {
      id: "production",
      title: "Production (before launch)",
      summary:
        "Publish and verify with Google. Localhost works now; production shows a warning until verified.",
      steps: buildGoogleOAuthProductionSteps(urls),
    },
  ];
}

export function buildGoogleOAuthStepDescription(
  hasCredentials: boolean,
  name: string
): string {
  if (hasCredentials) {
    return `Google OAuth ready for ${name}. Continue to Supabase setup.`;
  }
  return `Follow the visual guide to create Google OAuth credentials for ${name}.`;
}
