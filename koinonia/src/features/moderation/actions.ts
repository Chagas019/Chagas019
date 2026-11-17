"use server";

import { getCurrentUser } from "@/lib/supabase/server";
import { getI18n } from "@/i18n/server";
import { reportSchema } from "@/schemas/report";
import { formToObject } from "@/schemas/common";
import { dbError, validationError } from "@/lib/errors";
import type { ActionState } from "@/lib/action-state";

export async function reportAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { m } = await getI18n();
  const { supabase, user } = await getCurrentUser();
  if (!supabase || !user) return { status: "error", message: m.states.loginRequired };
  const parsed = reportSchema.safeParse(formToObject(form));
  if (!parsed.success) return validationError(parsed.error, m);
  const d = parsed.data;
  const { error } = await supabase.from("reports").insert({
    reporter_id: user.id, target_type: d.targetType, target_id: d.targetId, reason: d.reason, details: d.details,
  });
  if (error) return error.code === "23505" ? { status: "success", message: m.report.sent } : dbError(error, m);
  return { status: "success", message: m.report.sent };
}
