import Link from "next/link";
import { requireUser } from "@/libs/supabase/require-user";
import { getProfileAccess } from "@/libs/access";
import { getSEOTags } from "@/libs/seo";
import UserProfileForm from "@/components/UserProfileForm";

export const dynamic = "force-dynamic";

export const metadata = getSEOTags({
  title: "Settings",
  description: "Account and profile settings.",
  canonicalUrlRelative: "/dashboard/settings",
});

export default async function DashboardSettingsPage() {
  const user = await requireUser();
  const access = await getProfileAccess(user.id);
  const hasAccess = access?.has_access ?? false;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="mb-8 space-y-2">
        <p className="text-sm font-semibold uppercase tracking-wider text-primary">Settings</p>
        <h1 className="section-heading text-3xl font-extrabold">Account</h1>
        <p className="text-muted">Signed in as {user.email}</p>
      </div>

      <div className="space-y-6">
        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="font-bold">Profile</h2>
          <p className="mt-1 text-sm text-muted">Update the email stored on your profile.</p>
          <div className="mt-6">
            <UserProfileForm />
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="font-bold">Billing</h2>
          <p className="mt-1 text-sm text-muted">
            {hasAccess
              ? "Your credits never expire. Manage Paddle receipts from your account menu."
              : "Choose a plan on the Dashboard to unlock SaaSNa.me."}
          </p>
          {!hasAccess && (
            <Link href="/dashboard" className="btn-primary mt-4 inline-flex px-5 py-2.5 text-sm">
              View plans
            </Link>
          )}
        </section>
      </div>
    </div>
  );
}
