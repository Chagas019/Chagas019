"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { getI18n } from "@/i18n/server";
import { applicationSchema, opportunitySchema } from "@/schemas/opportunity";
import { formToObject, uuidSchema } from "@/schemas/common";
import { dbError, validationError } from "@/lib/errors";
import type { ActionState } from "@/lib/action-state";
import { safeRedirectPath } from "@/lib/utils";

function echo(raw: Record<string, unknown>): ActionState["values"] {
  const out: NonNullable<ActionState["values"]> = {};
  for (const [k, v] of Object.entries(raw)) if (typeof v === "string" || Array.isArray(v)) out[k] = v as string | string[];
  return out;
}

export async function createOpportunityAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { m } = await getI18n();
  const { supabase, user } = await getCurrentUser();
  if (!supabase || !user) return { status: "error", message: m.states.loginRequired };
  const communityId = uuidSchema.safeParse(form.get("communityId"));
  const slug = String(form.get("slug") ?? "");
  const raw = formToObject(form, ["languages", "availability", "skills"]);
  if (!communityId.success) return { status: "error", message: m.errors.notFound };
  const parsed = opportunitySchema.safeParse(raw);
  if (!parsed.success) return validationError(parsed.error, m, echo(raw));
  const d = parsed.data;
  const { data, error } = await supabase.from("opportunities").insert({
    community_id: communityId.data, created_by: user.id, title: d.title, description: d.description, mode: d.mode,
    status: d.publish, country_code: d.country, city: d.city || null, languages: d.languages, availability: d.availability,
    slots: d.slots, starts_at: d.startsAt, ends_at: d.endsAt,
  }).select("id").single();
  if (error) return dbError(error, m, echo(raw));
  if (d.skills.length) {
    const { error: skillError } = await supabase.from("opportunity_skills").insert(d.skills.map((skill_id) => ({ opportunity_id: data.id, skill_id })));
    if (skillError) return dbError(skillError, m);
  }
  revalidatePath("/oportunidades");
  redirect(`/comunidades/${encodeURIComponent(slug)}/gerenciar/oportunidades/${data.id}`);
}

export async function setOpportunityStatusAction(form: FormData): Promise<void> {
  const id = uuidSchema.safeParse(form.get("id"));
  const status = form.get("status");
  const back = safeRedirectPath(form.get("back"));
  const { supabase } = await getCurrentUser();
  if (!id.success || !supabase || !["open", "closed", "cancelled", "draft"].includes(String(status))) return;
  const { error } = await supabase.from("opportunities").update({ status }).eq("id", id.data);
  revalidatePath(back);
  if (error) redirect(`${back.split("?")[0]}?erro=${error.message.includes("verified") ? "verificacao" : "status"}`);
}

export async function applyAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { m } = await getI18n();
  const { supabase, user } = await getCurrentUser();
  if (!supabase || !user) return { status: "error", message: m.states.loginRequired };
  const oppId = uuidSchema.safeParse(form.get("opportunityId"));
  const parsed = applicationSchema.safeParse(formToObject(form));
  if (!oppId.success) return { status: "error", message: m.errors.notFound };
  if (!parsed.success) return validationError(parsed.error, m);
  const { error } = await supabase.from("applications").insert({ opportunity_id: oppId.data, applicant_id: user.id, message: parsed.data.message });
  if (error) return dbError(error, m);
  revalidatePath(`/oportunidades/${oppId.data}`);
  return { status: "success", message: m.opportunities.applied };
}

/** Transições de candidatura; regras finais validadas pelo trigger no banco. */
export async function setApplicationStatusAction(form: FormData): Promise<void> {
  const id = uuidSchema.safeParse(form.get("id"));
  const status = String(form.get("status"));
  const back = safeRedirectPath(form.get("back"));
  const { supabase } = await getCurrentUser();
  if (!id.success || !supabase || !["accepted", "rejected", "completed", "withdrawn"].includes(status)) return;
  await supabase.from("applications").update({ status }).eq("id", id.data);
  revalidatePath(back);
}
