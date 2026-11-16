"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { getI18n } from "@/i18n/server";
import { onboardingSchema, portfolioSchema, profileSchema, profileSkillsSchema } from "@/schemas/profile";
import { formToObject, uuidSchema } from "@/schemas/common";
import { dbError, validationError } from "@/lib/errors";
import type { ActionState } from "@/lib/action-state";

const ARRAYS = ["languages", "availability", "skills"] as const;

function echo(raw: Record<string, unknown>): ActionState["values"] {
  const out: NonNullable<ActionState["values"]> = {};
  for (const [k, v] of Object.entries(raw)) if (typeof v === "string" || Array.isArray(v)) out[k] = v as string | string[];
  return out;
}

export async function completeOnboardingAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { m } = await getI18n();
  const { supabase, user } = await getCurrentUser();
  if (!supabase || !user) return { status: "error", message: m.states.loginRequired };
  const raw = formToObject(form, ARRAYS);
  const parsed = onboardingSchema.safeParse(raw);
  if (!parsed.success) return validationError(parsed.error, m, echo(raw));
  const d = parsed.data;
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: d.displayName, bio: d.bio, country_code: d.country, city: d.city || null,
      languages: d.languages, availability: d.availability, hours_per_week: d.hoursPerWeek,
      visibility: d.visibility, message_permission: d.messagePermission,
      onboarded_at: now,
    })
    .eq("id", user.id);
  if (error) return dbError(error, m, echo(raw));
  redirect("/perfil?bem-vindo=1");
}

export async function updateProfileAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { m } = await getI18n();
  const { supabase, user } = await getCurrentUser();
  if (!supabase || !user) return { status: "error", message: m.states.loginRequired };
  const raw = formToObject(form, ARRAYS);
  const parsed = profileSchema.safeParse(raw);
  if (!parsed.success) return validationError(parsed.error, m, echo(raw));
  const d = parsed.data;
  const [{ error }, { error: privError }] = await Promise.all([
    supabase.from("profiles").update({
      username: d.username, display_name: d.displayName, bio: d.bio, country_code: d.country, city: d.city || null,
      languages: d.languages, availability: d.availability, hours_per_week: d.hoursPerWeek,
      visibility: d.visibility, message_permission: d.messagePermission,
    }).eq("id", user.id),
    supabase.from("profile_private").update({ phone: d.phone || null, contact_email: d.contactEmail || null }).eq("user_id", user.id),
  ]);
  const err = error ?? privError;
  if (err) return dbError(err, m, echo(raw));
  revalidatePath("/perfil");
  revalidatePath(`/voluntarios/${user.id}`);
  return { status: "success", message: m.common.saved };
}

export async function updateSkillsAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { m } = await getI18n();
  const { supabase, user } = await getCurrentUser();
  if (!supabase || !user) return { status: "error", message: m.states.loginRequired };
  const parsed = profileSkillsSchema.safeParse(formToObject(form, ["skills"]));
  if (!parsed.success) return validationError(parsed.error, m);
  const wanted = new Set(parsed.data.skills);
  const { data: current, error: readError } = await supabase.from("profile_skills").select("skill_id").eq("profile_id", user.id);
  if (readError) return dbError(readError, m);
  const have = new Set((current ?? []).map((r) => r.skill_id as number));
  const toAdd = [...wanted].filter((id) => !have.has(id)).map((skill_id) => ({ profile_id: user.id, skill_id }));
  const toRemove = [...have].filter((id) => !wanted.has(id));
  if (toAdd.length) {
    const { error } = await supabase.from("profile_skills").insert(toAdd);
    if (error) return dbError(error, m);
  }
  if (toRemove.length) {
    const { error } = await supabase.from("profile_skills").delete().eq("profile_id", user.id).in("skill_id", toRemove);
    if (error) return dbError(error, m);
  }
  revalidatePath("/perfil");
  return { status: "success", message: m.common.saved };
}

export async function addPortfolioItemAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { m } = await getI18n();
  const { supabase, user } = await getCurrentUser();
  if (!supabase || !user) return { status: "error", message: m.states.loginRequired };
  const raw = formToObject(form);
  const parsed = portfolioSchema.safeParse(raw);
  if (!parsed.success) return validationError(parsed.error, m, echo(raw));
  const { error } = await supabase.from("portfolio_items").insert({ profile_id: user.id, ...parsed.data });
  if (error) return dbError(error, m, echo(raw));
  revalidatePath("/perfil");
  return { status: "success", message: m.common.saved };
}

export async function removePortfolioItemAction(form: FormData): Promise<void> {
  const id = uuidSchema.safeParse(form.get("id"));
  const { supabase, user } = await getCurrentUser();
  if (!id.success || !supabase || !user) return;
  await supabase.from("portfolio_items").delete().eq("id", id.data).eq("profile_id", user.id);
  revalidatePath("/perfil");
}
