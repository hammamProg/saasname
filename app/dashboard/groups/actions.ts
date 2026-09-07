"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/libs/supabase/require-user";
import {
  createGroup,
  deleteGroup,
  DuplicateGroupError,
  MAX_GROUP_NAME,
  renameGroup,
} from "@/libs/webstats/groups";

export type CreateGroupState = { error: string | null; groupId?: string };
export type RenameGroupState = { error: string | null; done?: boolean };
export type DeleteGroupState = { error: string | null; done?: boolean };

export async function createGroupAction(
  _previous: CreateGroupState,
  formData: FormData,
): Promise<CreateGroupState> {
  const user = await requireUser();

  const name = String(formData.get("name") ?? "").trim();

  if (!name) {
    return { error: "Give the group a name." };
  }

  if (name.length > MAX_GROUP_NAME) {
    return { error: `Keep the name under ${MAX_GROUP_NAME} characters.` };
  }

  try {
    const group = await createGroup(user.id, name);
    revalidatePath("/dashboard");
    return { error: null, groupId: group.id };
  } catch (error) {
    if (error instanceof DuplicateGroupError) {
      return { error: `You already have a group named "${error.groupName}".` };
    }

    console.error("[webstats] createGroup failed", error);
    return { error: "Could not create that group. Try again." };
  }
}

export async function renameGroupAction(
  _previous: RenameGroupState,
  formData: FormData,
): Promise<RenameGroupState> {
  await requireUser();

  const groupId = String(formData.get("groupId") ?? "");
  const name = String(formData.get("name") ?? "").trim();

  if (!groupId) {
    return { error: "Missing group." };
  }

  if (!name) {
    return { error: "Give the group a name." };
  }

  if (name.length > MAX_GROUP_NAME) {
    return { error: `Keep the name under ${MAX_GROUP_NAME} characters.` };
  }

  try {
    await renameGroup(groupId, name);
  } catch (error) {
    if (error instanceof DuplicateGroupError) {
      return { error: `You already have a group named "${error.groupName}".` };
    }

    console.error("[webstats] renameGroup failed", error);
    return { error: "Could not rename that group. Try again." };
  }

  revalidatePath("/dashboard");

  return { error: null, done: true };
}

/** Deletes the group. Its sites are not touched — the foreign key sets their
 *  group_id back to null, so they reappear in the ungrouped section. */
export async function deleteGroupAction(
  _previous: DeleteGroupState,
  formData: FormData,
): Promise<DeleteGroupState> {
  await requireUser();

  const groupId = String(formData.get("groupId") ?? "");

  if (!groupId) {
    return { error: "Missing group." };
  }

  try {
    await deleteGroup(groupId);
  } catch (error) {
    console.error("[webstats] deleteGroup failed", error);
    return { error: "Could not delete that group. Try again." };
  }

  revalidatePath("/dashboard");

  return { error: null, done: true };
}
