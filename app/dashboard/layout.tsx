import DashboardShell from "@/components/dashboard/DashboardShell";
import { requireUser } from "@/libs/supabase/require-user";
import { getProfileAccess } from "@/libs/access";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const access = await getProfileAccess(user.id);
  const hasAccess = access?.has_access ?? false;

  return <DashboardShell hasAccess={hasAccess}>{children}</DashboardShell>;
}
