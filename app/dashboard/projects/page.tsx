import { getSEOTags } from "@/libs/seo";
import { RequireDashboardAccess } from "@/components/dashboard/DashboardAccessProvider";
import { ProjectsWorkspace } from "@/app/components/ProjectsWorkspace";

export const metadata = getSEOTags({
  title: "Projects",
  description: "Create and manage your SaaS projects.",
  canonicalUrlRelative: "/dashboard/projects",
});

export default function DashboardProjectsPage() {
  return (
    <RequireDashboardAccess>
      <ProjectsWorkspace />
    </RequireDashboardAccess>
  );
}
