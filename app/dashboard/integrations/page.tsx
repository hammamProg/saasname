import { getSEOTags } from "@/libs/seo";
import { RequireDashboardAccess } from "@/components/dashboard/DashboardAccessProvider";
import { IntegrationsSidebar } from "@/app/components/IntegrationsSidebar";

export const metadata = getSEOTags({
  title: "Integrations",
  description: "Connect your SaaS stack with OAuth and API-key integrations.",
  canonicalUrlRelative: "/dashboard/integrations",
});

export default function DashboardIntegrationsPage() {
  return (
    <RequireDashboardAccess>
      <div className="mx-auto max-w-3xl space-y-8">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">
            Integrations
          </p>
          <h1 className="section-heading text-3xl font-extrabold">Connect your stack</h1>
          <p className="text-muted">
            Link GitHub, Vercel, Supabase, Resend, Paddle, ngrok, and other tools via Composio
            OAuth and Nango.
          </p>
        </div>
        <IntegrationsSidebar />
      </div>
    </RequireDashboardAccess>
  );
}
