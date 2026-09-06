"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getProfileAccess } from "@/libs/access";
import { limitsForPlan, planForAccess } from "@/libs/plans";
import { requireUser } from "@/libs/supabase/require-user";
import { DomainError } from "@/libs/webstats/domain";
import {
  createSite,
  deleteSite,
  DuplicateSiteError,
  getSite,
  SiteLimitReachedError,
} from "@/libs/webstats/sites";

export type CreateSiteState = { error: string | null };
export type DeleteSiteState = { error: string | null };

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

/** Stop tracking a site.
 *
 *  A soft delete, so the rows a site owns stay attributable and the domain
 *  becomes available to add again. Ownership is not re-checked here beyond
 *  loading the site: `getSite` and the update both go through the user-scoped
 *  client, so RLS answers "not yours" as "not found" and the delete touches
 *  nothing. */
export async function deleteSiteAction(
  _previous: DeleteSiteState,
  formData: FormData,
): Promise<DeleteSiteState> {
  await requireUser();

  const siteId = String(formData.get("siteId") ?? "");

  if (!siteId) {
    return { error: "Missing site." };
  }

  try {
    const site = await getSite(siteId);

    // Missing means already deleted, or never theirs — RLS reports both the
    // same way. Either way there is nothing to remove, and the redirect below
    // is the right answer for both.
    if (site) {
      await deleteSite(siteId);
    }
  } catch (error) {
    console.error("[webstats] deleteSite failed", error);
    return { error: "Could not remove that website. Try again." };
  }

  revalidatePath("/dashboard/sites");

  // Outside the try on purpose: redirect signals by throwing, so calling it
  // inside would land in the catch and report a successful delete as a
  // failure. Same reason as createSiteAction.
  redirect("/dashboard/sites");
}
