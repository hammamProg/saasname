import DashboardShell from "@/components/dashboard/DashboardShell";
import CreditPill from "@/components/dashboard/CreditPill";
import { requireUser } from "@/libs/supabase/require-user";
import { getProfileAccess } from "@/libs/access";
import { getCreditBalance } from "@/libs/credits/balance";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const access = await getProfileAccess(user.id);
  const hasAccess = access?.has_access ?? false;
  // `getCreditBalance` is request-cached, so the pill and the nav badge share
  // one read rather than issuing two.
  const creditBalance = hasAccess ? await getCreditBalance(user.id) : undefined;

  return (
    <DashboardShell
      hasAccess={hasAccess}
      credits={hasAccess ? <CreditPill userId={user.id} /> : null}
      creditBalance={creditBalance}
    >
      {children}
    </DashboardShell>
  );
}
