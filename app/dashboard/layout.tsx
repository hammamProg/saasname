import { requireUser } from "@/libs/supabase/require-user";
import { getProfileAccess } from "@/libs/access";
import { planForAccess } from "@/libs/plans";
import DashboardTopBar from "@/components/dashboard/DashboardTopBar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const access = await getProfileAccess(user.id);
  const plan = planForAccess(access?.has_access ?? false);

  return (
    <div className="min-h-screen bg-background">
      <DashboardTopBar plan={plan} />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">{children}</main>
    </div>
  );
}
