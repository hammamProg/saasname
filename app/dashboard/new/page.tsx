import { requireUser } from "@/libs/supabase/require-user";
import { getCreditBalance } from "@/libs/credits/balance";
import { getSEOTags } from "@/libs/seo";
import GenerateForm from "@/components/dashboard/GenerateForm";
import ConfidentialityNote from "@/components/dashboard/ConfidentialityNote";

export const dynamic = "force-dynamic";

export const metadata = getSEOTags({
  title: "New name check",
  description: "Name an idea, or clear a name you already have.",
  canonicalUrlRelative: "/dashboard/new",
});

type NewCheckPageProps = {
  searchParams: Promise<{ mode?: string }>;
};

export default async function NewCheckPage({ searchParams }: NewCheckPageProps) {
  const user = await requireUser();
  const [balance, params] = await Promise.all([
    getCreditBalance(user.id),
    searchParams,
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="space-y-2">
        <h1 className="section-heading text-3xl font-extrabold md:text-4xl">
          New name check
        </h1>
        <p className="text-muted">
          Describe an idea and we will name it, or paste names you already have.
          Every name is checked against six sources.
        </p>
      </div>

      <ConfidentialityNote />

      <GenerateForm
        balance={balance}
        initialMode={params.mode === "check" ? "check" : "generate"}
      />
    </div>
  );
}
