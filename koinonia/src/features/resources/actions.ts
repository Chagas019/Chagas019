"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/supabase/server";
import { getI18n } from "@/i18n/server";
import { resourceRequestSchema, resourceSchema } from "@/schemas/resource";
import { formToObject, uuidSchema } from "@/schemas/common";
import { dbError, validationError } from "@/lib/errors";
import { safeRedirectPath } from "@/lib/utils";
import type { ActionState } from "@/lib/action-state";

function echo(raw: Record<string, unknown>): ActionState["values"] {
  const out: NonNullable<ActionState["values"]> = {};
  for (const [k, v] of Object.entries(raw)) if (typeof v === "string") out[k] = v;
  return out;
}

export async function createResourceAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { m } = await getI18n();
  const { supabase, user } = await getCurrentUser();
  if (!supabase || !user) return { status: "error", message: m.states.loginRequired };
  const communityId = uuidSchema.safeParse(form.get("communityId"));
  const raw = formToObject(form);
  const parsed = resourceSchema.safeParse(raw);
  if (!communityId.success) return { status: "error", message: m.errors.notFound };
  if (!parsed.success) return validationError(parsed.error, m, echo(raw));
  const d = parsed.data;
  const { error } = await supabase.from("resources").insert({
    community_id: communityId.data, created_by: user.id, title: d.title, description: d.description, kind: d.kind,
    country_code: d.country, city: d.city, ships_remotely: d.shipsRemotely,
  });
  if (error) return dbError(error, m, echo(raw));
  revalidatePath(safeRedirectPath(form.get("back")));
  revalidatePath("/recursos");
  return { status: "success", message: m.common.saved };
}

export async function setResourceStatusAction(form: FormData): Promise<void> {
  const id = uuidSchema.safeParse(form.get("id"));
  const status = form.get("status");
  const { supabase } = await getCurrentUser();
  if (!id.success || !supabase || (status !== "available" && status !== "unavailable")) return;
  await supabase.from("resources").update({ status }).eq("id", id.data);
  revalidatePath(`/recursos/${id.data}`);
}

export async function requestResourceAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { m } = await getI18n();
  const { supabase, user } = await getCurrentUser();
  if (!supabase || !user) return { status: "error", message: m.states.loginRequired };
  const resourceId = uuidSchema.safeParse(form.get("resourceId"));
  const raw = formToObject(form);
  const parsed = resourceRequestSchema.safeParse(raw);
  if (!resourceId.success) return { status: "error", message: m.errors.notFound };
  if (!parsed.success) return validationError(parsed.error, m, echo(raw));
  const d = parsed.data;
  const { error } = await supabase.from("resource_requests").insert({
    resource_id: resourceId.data, requester_id: user.id, requester_community_id: d.requesterCommunity,
    message: d.message, starts_on: d.startsOn, ends_on: d.endsOn,
  });
  if (error) return dbError(error, m, echo(raw));
  revalidatePath(`/recursos/${resourceId.data}`);
  return { status: "success", message: m.resources.requested };
}

/** Transições de pedidos de recurso; regras finais no trigger do banco. */
export async function setResourceRequestStatusAction(form: FormData): Promise<void> {
  const id = uuidSchema.safeParse(form.get("id"));
  const status = String(form.get("status"));
  const back = safeRedirectPath(form.get("back"));
  const { supabase } = await getCurrentUser();
  if (!id.success || !supabase || !["approved", "declined", "returned", "cancelled"].includes(status)) return;
  await supabase.from("resource_requests").update({ status }).eq("id", id.data);
  revalidatePath(back);
}
