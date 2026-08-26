import DashboardShell from "@/components/dashboard/DashboardShell";
import CreditPill from "@/components/dashboard/CreditPill";
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

  return (
    <DashboardShell
      hasAccess={hasAccess}
      credits={hasAccess ? <CreditPill userId={user.id} /> : null}
    >
      {children}
    </DashboardShell>
  );
}
