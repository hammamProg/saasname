"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/libs/supabase/require-user";
import { DomainError } from "@/libs/webstats/domain";
import {
  addEmbedDomain,
  DuplicateEmbedDomainError,
  EmbedDomainLimitError,
  listEmbedDomains,
  removeEmbedDomain,
  type EmbedDomain,
} from "@/libs/webstats/embed-domains";

export type AddEmbedDomainState = { error: string | null; done?: boolean };
export type RemoveEmbedDomainState = { error: string | null; done?: boolean };

/** Plain read, not a mutation — called directly from the allowlist manager
 *  client component rather than through a <form>, the same way any other
 *  server action can be invoked as a function. RLS scopes the result to the
 *  caller's own rows regardless of which siteId is asked for, so a foreign
 *  site id just returns an empty list rather than needing its own check. */
export async function getEmbedDomainsAction(siteId: string): Promise<EmbedDomain[]> {
  await requireUser();
  return listEmbedDomains(siteId);
}

export async function addEmbedDomainAction(
  _previous: AddEmbedDomainState,
  formData: FormData,
): Promise<AddEmbedDomainState> {
  const user = await requireUser();

  const siteId = String(formData.get("siteId") ?? "");
  const domain = String(formData.get("domain") ?? "");

  if (!siteId) {
    return { error: "Missing site." };
  }

  try {
    await addEmbedDomain(user.id, siteId, domain);
  } catch (error) {
    if (error instanceof DomainError) {
      return { error: error.message };
    }

    if (error instanceof DuplicateEmbedDomainError) {
      return { error: `${error.domain} is already allowed.` };
    }

    if (error instanceof EmbedDomainLimitError) {
      return { error: error.message };
    }

    console.error("[webstats] addEmbedDomain failed", error);
    return { error: "Could not add that domain. Try again." };
  }

  revalidatePath("/dashboard");

  return { error: null, done: true };
}

export async function removeEmbedDomainAction(
  _previous: RemoveEmbedDomainState,
  formData: FormData,
): Promise<RemoveEmbedDomainState> {
  await requireUser();

  const id = String(formData.get("id") ?? "");

  if (!id) {
    return { error: "Missing domain." };
  }

  try {
    await removeEmbedDomain(id);
  } catch (error) {
    console.error("[webstats] removeEmbedDomain failed", error);
    return { error: "Could not remove that domain. Try again." };
  }

  revalidatePath("/dashboard");

  return { error: null, done: true };
}
