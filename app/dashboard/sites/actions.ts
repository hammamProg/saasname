"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getProfileAccess } from "@/libs/access";
import { limitsForPlan, planForAccess } from "@/libs/plans";
import { requireUser } from "@/libs/supabase/require-user";
import { DomainError } from "@/libs/webstats/domain";
import {
  createSite,
  DuplicateSiteError,
  SiteLimitReachedError,
} from "@/libs/webstats/sites";

export type CreateSiteState = { error: string | null };

export async function createSiteAction(
  _previous: CreateSiteState,
  formData: FormData,
): Promise<CreateSiteState> {
  const user = await requireUser();
  const access = await getProfileAccess(user.id);
  const limits = limitsForPlan(planForAccess(access?.has_access ?? false));

  const name = String(formData.get("name") ?? "");
  const domain = String(formData.get("domain") ?? "");

  let siteId: string;

  try {
    const site = await createSite({
      ownerId: user.id,
      name,
      domain,
      siteLimit: limits.siteLimit,
    });
    siteId = site.id;
  } catch (error) {
    // Each of these is actionable by the person filling in the form, so they
    // get their own message rather than a generic failure.
    if (error instanceof DomainError) {
      return { error: error.message };
    }

    if (error instanceof DuplicateSiteError) {
      return { error: `You are already tracking ${error.domain}.` };
    }

    if (error instanceof SiteLimitReachedError) {
      return {
        error:
          error.limit === 1
            ? "The free plan tracks one website. Upgrade to add more."
            : `You have reached your limit of ${error.limit} websites.`,
      };
    }

    console.error("[webstats] createSite failed", error);
    return { error: "Could not add that website. Try again." };
  }

  revalidatePath("/dashboard/sites");

  // Outside the catch: redirect signals by throwing, and catching it here
  // would turn a successful create into "Could not add that website".
  redirect(`/dashboard/sites/${siteId}`);
}
