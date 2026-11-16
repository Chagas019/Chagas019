"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/supabase/server";
import { getI18n } from "@/i18n/server";
import { cleanText, formToObject, uuidSchema } from "@/schemas/common";
import { dbError, validationError } from "@/lib/errors";
import { safeRedirectPath } from "@/lib/utils";
import type { ActionState } from "@/lib/action-state";

const reviewSchema = z.object({
  applicationId: uuidSchema,
  target: z.enum(["community", "profile"]),
  revieweeId: uuidSchema,
  rating: z.coerce.number().int().min(1, "validation.required").max(5),
  comment: cleanText(1500),
});

/** Publica avaliação; o trigger no banco garante que só as partes de uma colaboração concluída avaliem. */
export async function submitReviewAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { m } = await getI18n();
  const { supabase, user } = await getCurrentUser();
  if (!supabase || !user) return { status: "error", message: m.states.loginRequired };
  const parsed = reviewSchema.safeParse(formToObject(form));
  if (!parsed.success) return validationError(parsed.error, m);
  const d = parsed.data;
  const { error } = await supabase.from("reviews").insert({
    application_id: d.applicationId,
    reviewer_id: user.id,
    reviewee_profile_id: d.target === "profile" ? d.revieweeId : null,
    reviewee_community_id: d.target === "community" ? d.revieweeId : null,
    rating: d.rating,
    comment: d.comment,
  });
  if (error) return error.code === "23505" ? { status: "success", message: m.reviews.already } : dbError(error, m);
  revalidatePath(safeRedirectPath(form.get("back")));
  return { status: "success", message: m.reviews.done };
}
