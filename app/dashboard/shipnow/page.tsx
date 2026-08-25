import { getSEOTags } from "@/libs/seo";
import { RequireDashboardAccess } from "@/components/dashboard/DashboardAccessProvider";
import { LaunchpadWorkspace } from "@/app/components/LaunchpadWorkspace";

export const metadata = getSEOTags({
  title: "ShipNow",
  description: "Follow the step-by-step SaaS setup guide for your project.",
  canonicalUrlRelative: "/dashboard/shipnow",
});

export default function DashboardShipNowPage() {
  return (
    <RequireDashboardAccess>
      <LaunchpadWorkspace />
    </RequireDashboardAccess>
  );
}
