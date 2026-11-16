"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { getI18n } from "@/i18n/server";
import type { ActionState } from "@/lib/action-state";
import { detectImageType } from "@/lib/image";

const MAX_BYTES = 2 * 1024 * 1024;

export async function uploadAvatarAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { m } = await getI18n();
  const { supabase, user } = await getCurrentUser();
  if (!supabase || !user) return { status: "error", message: m.states.loginRequired };
  const file = form.get("avatar");
  if (!(file instanceof Blob) || file.size === 0 || file.size > MAX_BYTES) return { status: "error", message: m.account.avatarInvalid };
  const ext = await detectImageType(file);
  if (!ext) return { status: "error", message: m.account.avatarInvalid };
  const path = `${user.id}/avatar-${Date.now()}.${ext}`;
  const contentType = ext === "jpg" ? "image/jpeg" : `image/${ext}`;
  const { error } = await supabase.storage.from("avatars").upload(path, file, { contentType, upsert: false, cacheControl: "31536000" });
  if (error) return { status: "error", message: m.errors.generic };
  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  const { data: old } = await supabase.from("profiles").select("avatar_url").eq("id", user.id).maybeSingle();
  const { error: upError } = await supabase.from("profiles").update({ avatar_url: data.publicUrl }).eq("id", user.id);
  if (upError) return { status: "error", message: m.errors.generic };
  const oldPath = typeof old?.avatar_url === "string" ? old.avatar_url.split("/avatars/")[1] : undefined;
  if (oldPath?.startsWith(`${user.id}/`)) await supabase.storage.from("avatars").remove([oldPath]);
  revalidatePath("/", "layout");
  return { status: "success", message: m.account.avatarDone };
}

export async function deleteAccountAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { m } = await getI18n();
  const { supabase, user } = await getCurrentUser();
  if (!supabase || !user) return { status: "error", message: m.states.loginRequired };
  if (form.get("confirm") !== "EXCLUIR") return { status: "error", message: m.account.deleteMismatch };
  const { error } = await supabase.rpc("delete_my_account");
  if (error) return { status: "error", message: error.message.includes("sole owner") ? m.account.deleteOwner : m.errors.generic };
  await supabase.auth.signOut();
  redirect("/");
}
