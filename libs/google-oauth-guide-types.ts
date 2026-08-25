export type GoogleOAuthGuideStep = {
  id: string;
  title: string;
  caption: string;
  image?: string;
  imageAlt?: string;
  link?: { label: string; url: string };
};

export type GoogleOAuthGuideSection = {
  id: "setup" | "production";
  title: string;
  summary: string;
  steps: GoogleOAuthGuideStep[];
};

export type GoogleOAuthUrls = {
  localhostOrigin: string;
  supabaseOrigin: string;
  callbackUrl: string;
  productionSiteUrl: string;
  productionRedirectUrl: string;
};
