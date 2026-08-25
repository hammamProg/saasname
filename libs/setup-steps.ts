import {
  BarChart,
  Bot,
  ClipboardCopy,
  CreditCard,
  Database,
  FolderGit2,
  Globe,
  HardDrive,
  KeyRound,
  Mail,
  ShieldCheck,
  Terminal,
} from "lucide-react";
import type { Step } from "@/app/types";
import { SETUP_SERVICE_LOGOS } from "@/app/lib/serviceBrands";
import {
  buildGoogleOAuthStepDescription,
} from "@/libs/google-oauth-setup-instructions";
import {
  buildRepoSetupCommands,
  buildRepoSetupInstructions,
} from "@/libs/repo-setup-commands";

export type SetupProjectContext = {
  name: string;
  slug: string;
  description?: string | null;
  github_repo_url?: string | null;
  github_repo_full_name?: string | null;
  supabase_project_ref?: string | null;
  supabase_auth_configured?: boolean;
  google_oauth_client_id?: string | null;
  google_oauth_client_secret?: string | null;
  resend_domain?: string | null;
  resend_domain_added?: boolean;
  paddle_provisioned?: boolean;
  paddle_webhook_url?: string | null;
};

export function buildSetupSteps({
  name,
  slug,
  description,
  github_repo_url,
  github_repo_full_name,
  supabase_project_ref,
  supabase_auth_configured,
  google_oauth_client_id,
  google_oauth_client_secret,
  resend_domain,
  resend_domain_added,
  paddle_provisioned,
  paddle_webhook_url,
}: SetupProjectContext): Step[] {
  const hasGoogleCredentials = Boolean(google_oauth_client_id && google_oauth_client_secret);

  return [
    {
      id: "repo",
      title: "1. Repository & Local Setup",
      icon: FolderGit2,
      logoUrl: SETUP_SERVICE_LOGOS.GitHub,
      description: github_repo_url
        ? `Clone the ShipNow boilerplate locally and push it to your connected GitHub repository (${github_repo_full_name ?? slug}).`
        : `Clone the ShipNow boilerplate, create a GitHub repo via Integrations, then push ${name} to your connected remote.`,
      commands: buildRepoSetupCommands({ name, slug, github_repo_url }),
      links: github_repo_url
        ? [{ label: "Open connected repo", url: github_repo_url }]
        : [{ label: "Connect GitHub", url: "/dashboard/integrations" }],
      instructions: buildRepoSetupInstructions({
        name,
        slug,
        github_repo_url,
        github_repo_full_name,
      }),
    },
    {
      id: "supabase_project",
      title: "2. Supabase Project",
      icon: Database,
      badge: "Supabase",
      logoUrl: SETUP_SERVICE_LOGOS.Supabase,
      description: supabase_project_ref
        ? `Supabase project ${supabase_project_ref} is linked — continue to Google OAuth in step 3.`
        : `Create your Supabase project for ${name} before setting up Google OAuth (step 3).`,
      links: supabase_project_ref
        ? [
            {
              label: "Open Supabase project",
              url: `https://supabase.com/dashboard/project/${supabase_project_ref}`,
            },
          ]
        : [
            { label: "Connect Supabase", url: "/dashboard/integrations" },
            { label: "Supabase Dashboard", url: "https://supabase.com/dashboard/projects" },
          ],
      instructions: supabase_project_ref
        ? "Project ready — configure Google OAuth in step 3, then enable auth in step 4."
        : "Connect Supabase in Integrations, then click Create Supabase project. You need the project ref for Google OAuth redirect URLs in step 3.",
    },
    {
      id: "google_oauth",
      title: "3. Google OAuth (Sign-In)",
      icon: KeyRound,
      logoUrl: SETUP_SERVICE_LOGOS["Google Cloud"],
      description: buildGoogleOAuthStepDescription(hasGoogleCredentials, name),
      links: [
        { label: "Google Cloud Console", url: "https://console.cloud.google.com/" },
        { label: "OAuth consent screen", url: "https://console.cloud.google.com/apis/credentials/consent" },
        { label: "Create OAuth client", url: "https://console.cloud.google.com/apis/credentials" },
      ],
      instructions: hasGoogleCredentials
        ? "Credentials saved — they will be applied when you configure Supabase Auth in step 4."
        : supabase_project_ref
          ? "Follow the sub-steps below to create a GCP project, configure the consent screen, and create a Web OAuth client using your Supabase callback URL. Save the Client ID and Secret here, then continue to step 4 (Supabase Auth)."
          : "Complete step 2 (Supabase Project) first so you have the callback URL, then create your Web OAuth client and save credentials here before step 4.",
    },
    {
      id: "supabase_auth",
      title: "4. Supabase Auth",
      icon: ShieldCheck,
      badge: "Supabase",
      logoUrl: SETUP_SERVICE_LOGOS.Supabase,
      description: supabase_auth_configured
        ? `Email and Google auth are enabled on ${supabase_project_ref}.`
        : supabase_project_ref
          ? `Enable Email and Google sign-in on project ${supabase_project_ref}.`
          : `Complete steps 2 and 3, then configure auth on your Supabase project.`,
      links: supabase_project_ref
        ? [
            {
              label: "Open Supabase project",
              url: `https://supabase.com/dashboard/project/${supabase_project_ref}`,
            },
          ]
        : [
            { label: "Connect Supabase", url: "/dashboard/integrations" },
            { label: "Supabase Dashboard", url: "https://supabase.com/dashboard/projects" },
          ],
      instructions: supabase_auth_configured
        ? "Copy the env vars below into your local .env.local, then continue to step 5 (Email Service)."
        : hasGoogleCredentials && supabase_project_ref
          ? "Click Configure auth to apply your Google OAuth credentials from step 3 and enable Email + Google providers."
          : supabase_project_ref
            ? "Complete step 3 (Google OAuth) first, then run Configure auth here."
            : "Complete step 2 (Supabase Project) and step 3 (Google OAuth) before configuring auth.",
    },
    {
      id: "email",
      title: "5. Email Service",
      icon: Mail,
      badge: "Resend",
      logoUrl: SETUP_SERVICE_LOGOS.Resend,
      description: resend_domain_added
        ? `Resend domain ${resend_domain} is registered — verify DNS and set RESEND_API_KEY.`
        : resend_domain
          ? `Connect Resend and register ${resend_domain} for ${name}.`
          : `Set up a sending subdomain, connect Resend, and register your domain for transactional email.`,
      links: [
        { label: "Connect Resend", url: "/dashboard/integrations" },
        { label: "Resend Dashboard", url: "https://resend.com/emails" },
        { label: "Resend Domains", url: "https://resend.com/domains" },
      ],
      instructions: resend_domain_added
        ? `Add DNS records at your registrar, verify in Resend, then set RESEND_API_KEY and RESEND_FROM_EMAIL in ${slug}/.env.local.`
        : `Enter a subdomain like mail.yourdomain.com, connect Resend in Integrations, then register the domain and verify DNS.`,
    },
    {
      id: "payments",
      title: "6. Subscriptions & Payments",
      icon: CreditCard,
      badge: "Paddle",
      description: paddle_provisioned
        ? `Paddle catalog, webhook, and credentials are ready for ${name}.`
        : `Connect Paddle and ngrok for local webhook testing, configure billing periods and optional trials, then auto-create subscription products, prices, webhook, and env vars for ${name}.`,
      links: [
        { label: "Connect Paddle", url: "/dashboard/integrations" },
        { label: "Connect ngrok", url: "/dashboard/integrations" },
        { label: "Paddle Sandbox", url: "https://sandbox-vendors.paddle.com" },
        { label: "Paddle Production", url: "https://vendors.paddle.com" },
      ],
      instructions: paddle_provisioned
        ? `Copy the Paddle env vars below into ${slug}/.env.local. Webhook URL: ${paddle_webhook_url ?? "configured in Paddle dashboard"}.`
        : `Connect Paddle and ngrok in Integrations. Set billing period and trial options on each plan, run \`ngrok http 3000\`, select your tunnel (or enter a deployed URL), then click Set up Paddle billing to auto-create products, prices, webhook, and env vars for ${name}.`,
    },
    {
      id: "copy_env",
      title: "7. Copy .env.local",
      icon: ClipboardCopy,
      description: `Assemble every env var for ${name} into a single ${slug}/.env.local file before you deploy.`,
      instructions: `Review readiness below, then copy the full file or individual keys into ${slug}/.env.local at your repo root. Finish development steps 1–6 first so Supabase, Google, Resend, and Paddle values are populated.`,
    },
    {
      id: "deploy",
      title: "8. Deployment",
      icon: Terminal,
      badge: "Vercel",
      description: `Deploy ${name} on every push to main.`,
      links: [{ label: "Deploy on Vercel", url: "https://vercel.com/new" }],
      instructions: `1. Import the ${slug} GitHub repo into Vercel.\n2. Copy all ${name} environment variables into Vercel project settings.\n3. Deploy.`,
    },
    {
      id: "domain",
      title: "9. Domain Configuration",
      icon: Globe,
      badge: "Dynadot",
      description: `Point your domain to the ${name} Vercel deployment.`,
      links: [{ label: "Dynadot Control Panel", url: "https://www.dynadot.com/account/" }],
      instructions: `1. In Vercel, add your custom domain for ${name}.\n2. In Dynadot, update DNS to match Vercel's A record and CNAME instructions.`,
    },
    {
      id: "analytics",
      title: "10. Analytics",
      icon: BarChart,
      badge: "Google Analytics",
      description: `Track traffic and growth for ${name}.`,
      links: [{ label: "Google Analytics", url: "https://analytics.google.com/" }],
      instructions: `Create a web data stream for ${name}. Add the Measurement ID (G-XXXXXXXXXX) to ${slug}/.env.local.`,
    },
    {
      id: "storage",
      title: "11. Media Storage (Optional)",
      icon: HardDrive,
      badge: "AWS S3",
      description: `Optional S3 bucket for ${name} media uploads.`,
      links: [
        { label: "AWS S3 Console", url: "https://s3.console.aws.amazon.com/s3/home" },
        { label: "IAM Console", url: "https://us-east-1.console.aws.amazon.com/iam/home" },
      ],
      instructions: `If ${name} needs file uploads, create an S3 bucket and add AWS credentials to ${slug}/.env.local.`,
    },
    {
      id: "mcp",
      title: "12. AI Assistant MCP Context",
      icon: Bot,
      badge: "MCP Servers",
      description: `Configure Cursor/Cline MCP servers for the ${name} codebase.`,
      links: [],
      instructions: `In your AI config for ${name}, connect:\n- GitHub MCP\n- Supabase MCP\n- Vercel MCP\n- Paddle MCP\n- Google Analytics MCP\n- AWS S3 MCP\n- 21st.dev MCP (UI components).`,
    },
  ];
}
