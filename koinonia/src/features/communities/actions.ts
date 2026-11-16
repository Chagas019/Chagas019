"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { getI18n } from "@/i18n/server";
import { communitySchema, verificationSchema } from "@/schemas/community";
import { formToObject, uuidSchema } from "@/schemas/common";
import { dbError, validationError } from "@/lib/errors";
import type { ActionState } from "@/lib/action-state";
import { detectImageType } from "@/lib/image";

export async function uploadCommunityLogoAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { m } = await getI18n();
  const { supabase, user } = await getCurrentUser();
  if (!supabase || !user) return { status: "error", message: m.states.loginRequired };
  const id = uuidSchema.safeParse(form.get("communityId"));
  const file = form.get("logo");
  if (!id.success) return { status: "error", message: m.errors.notFound };
  if (!(file instanceof Blob) || file.size === 0 || file.size > 2 * 1024 * 1024) return { status: "error", message: m.account.avatarInvalid };
  const ext = await detectImageType(file);
  if (!ext) return { status: "error", message: m.account.avatarInvalid };
  // pasta do próprio usuário (política de Storage); a atualização da comunidade passa pelo RLS (só admins)
  const path = `${user.id}/community-${id.data}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("community-logos").upload(path, file, { contentType: ext === "jpg" ? "image/jpeg" : `image/${ext}`, cacheControl: "31536000" });
  if (error) return { status: "error", message: m.errors.generic };
  const { data } = supabase.storage.from("community-logos").getPublicUrl(path);
  const { data: row, error: upError } = await supabase.from("communities").update({ logo_url: data.publicUrl }).eq("id", id.data).select("slug").maybeSingle();
  if (upError || !row) return { status: "error", message: m.errors.forbidden };
  revalidatePath(`/comunidades/${row.slug}`, "layout");
  return { status: "success", message: m.communities.logoDone };
}

function echo(raw: Record<string, unknown>): ActionState["values"] {
  const out: NonNullable<ActionState["values"]> = {};
  for (const [k, v] of Object.entries(raw)) if (typeof v === "string" || Array.isArray(v)) out[k] = v as string | string[];
  return out;
}

function toRow(d: ReturnType<typeof communitySchema.parse>) {
  return {
    name: d.name, slug: d.slug, kind: d.kind, description: d.description, country_code: d.country, city: d.city,
    diocese: d.diocese || null, website: d.website, languages: d.languages, needs: d.needs, focus_categories: d.focusCategories,
  };
}

export async function createCommunityAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { m } = await getI18n();
  const { supabase, user } = await getCurrentUser();
  if (!supabase || !user) return { status: "error", message: m.states.loginRequired };
  const raw = formToObject(form, ["languages", "focusCategories"]);
  const parsed = communitySchema.safeParse(raw);
  if (!parsed.success) return validationError(parsed.error, m, echo(raw));
  const { data, error } = await supabase.from("communities").insert({ ...toRow(parsed.data), created_by: user.id }).select("slug").single();
  if (error) return dbError(error, m, echo(raw));
  redirect(`/comunidades/${data.slug}/gerenciar?criada=1`);
}

export async function updateCommunityAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { m } = await getI18n();
  const { supabase, user } = await getCurrentUser();
  if (!supabase || !user) return { status: "error", message: m.states.loginRequired };
  const id = uuidSchema.safeParse(form.get("id"));
  const raw = formToObject(form, ["languages", "focusCategories"]);
  const parsed = communitySchema.safeParse(raw);
  if (!id.success) return { status: "error", message: m.errors.notFound };
  if (!parsed.success) return validationError(parsed.error, m, echo(raw));
  // RLS garante que apenas administradores da comunidade atualizem.
  const { data, error } = await supabase.from("communities").update(toRow(parsed.data)).eq("id", id.data).select("slug").maybeSingle();
  if (error) return dbError(error, m, echo(raw));
  if (!data) return { status: "error", message: m.errors.forbidden };
  revalidatePath(`/comunidades/${data.slug}`);
  if (data.slug !== form.get("currentSlug")) redirect(`/comunidades/${data.slug}/gerenciar`);
  return { status: "success", message: m.common.saved };
}

export async function requestVerificationAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { m } = await getI18n();
  const { supabase, user } = await getCurrentUser();
  if (!supabase || !user) return { status: "error", message: m.states.loginRequired };
  const id = uuidSchema.safeParse(form.get("communityId"));
  const parsed = verificationSchema.safeParse(formToObject(form));
  if (!id.success) return { status: "error", message: m.errors.notFound };
  if (!parsed.success) return validationError(parsed.error, m);
  const { error } = await supabase.from("community_verifications").insert({ community_id: id.data, requested_by: user.id, evidence: parsed.data.evidence });
  if (error) return dbError(error, m);
  revalidatePath("/comunidades", "layout");
  return { status: "success", message: m.communities.verificationPending };
}

export async function joinCommunityAction(form: FormData): Promise<void> {
  const id = uuidSchema.safeParse(form.get("communityId"));
  const slug = String(form.get("slug") ?? "");
  const { supabase, user } = await getCurrentUser();
  if (!id.success || !supabase || !user) redirect(`/entrar?next=/comunidades/${encodeURIComponent(slug)}`);
  await supabase.from("community_members").insert({ community_id: id.data, user_id: user.id, role: "member" });
  revalidatePath(`/comunidades/${slug}`);
}

export async function leaveCommunityAction(form: FormData): Promise<void> {
  const id = uuidSchema.safeParse(form.get("communityId"));
  const slug = String(form.get("slug") ?? "");
  const { supabase, user } = await getCurrentUser();
  if (!id.success || !supabase || !user) return;
  await supabase.from("community_members").delete().eq("community_id", id.data).eq("user_id", user.id);
  revalidatePath(`/comunidades/${slug}`);
}

export async function setMemberRoleAction(form: FormData): Promise<void> {
  const id = uuidSchema.safeParse(form.get("communityId"));
  const member = uuidSchema.safeParse(form.get("userId"));
  const role = form.get("role");
  const slug = String(form.get("slug") ?? "");
  const { supabase } = await getCurrentUser();
  if (!id.success || !member.success || !supabase || (role !== "admin" && role !== "member" && role !== "remove")) return;
  if (role === "remove") {
    await supabase.from("community_members").delete().eq("community_id", id.data).eq("user_id", member.data);
  } else {
    await supabase.from("community_members").update({ role }).eq("community_id", id.data).eq("user_id", member.data);
  }
  revalidatePath(`/comunidades/${slug}/gerenciar`);
}
