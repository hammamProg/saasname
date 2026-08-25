export type ServiceBrand = {
  slug: string;
  name: string;
  logoUrl: string;
  connectProvider?: "composio" | "nango";
  authType?: "oauth" | "api_key";
};

export const INTEGRATION_SERVICES: ServiceBrand[] = [
  {
    slug: 'github',
    name: 'GitHub',
    logoUrl: 'https://logos.composio.dev/api/github',
  },
  {
    slug: 'vercel',
    name: 'Vercel',
    logoUrl: 'https://logos.composio.dev/api/vercel',
  },
  {
    slug: 'resend',
    name: 'Resend',
    logoUrl: 'https://logos.composio.dev/api/resend',
  },
  {
    slug: 'supabase',
    name: 'Supabase',
    logoUrl: 'https://logos.composio.dev/api/supabase',
  },
  {
    slug: 'google_analytics',
    name: 'Google Analytics',
    logoUrl: 'https://logos.composio.dev/api/google_analytics',
  },
  {
    slug: 'paddle',
    name: 'Paddle',
    logoUrl: 'https://cdn.simpleicons.org/paddle/314CC0',
    connectProvider: 'nango',
    authType: 'api_key',
  },
  {
    slug: 'ngrok',
    name: 'ngrok',
    logoUrl: 'https://logos.composio.dev/api/ngrok',
    authType: 'api_key',
  },
];

export const SETUP_SERVICE_LOGOS: Record<string, string> = {
  GitHub: 'https://logos.composio.dev/api/github',
  Supabase: 'https://logos.composio.dev/api/supabase',
  Resend: 'https://logos.composio.dev/api/resend',
  Paddle: 'https://cdn.simpleicons.org/paddle/314CC0',
  ngrok: 'https://logos.composio.dev/api/ngrok',
  Vercel: 'https://logos.composio.dev/api/vercel',
  'Google Analytics': 'https://logos.composio.dev/api/google_analytics',
  'AWS S3': 'https://upload.wikimedia.org/wikipedia/commons/b/bc/Amazon-S3-Logo.svg',
  Dynadot: 'https://www.dynadot.com/favicon.ico',
  'Google Cloud': 'https://www.gstatic.com/images/branding/product/2x/google_cloud_64dp.png',
};

export function getIntegrationBrand(slug: string): ServiceBrand | undefined {
  return INTEGRATION_SERVICES.find((service) => service.slug === slug);
}
