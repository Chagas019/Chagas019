"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/supabase/server";
import { cleanText, uuidSchema } from "@/schemas/common";

/** Revisão de verificação: o trigger no banco exige papel admin e audita a decisão. */
export async function reviewVerificationAction(form: FormData): Promise<void> {
  const id = uuidSchema.safeParse(form.get("id"));
  const decision = form.get("decision");
  const notes = cleanText(2000).safeParse(form.get("notes") ?? "");
  const { supabase } = await getCurrentUser();
  if (!id.success || !supabase || (decision !== "approved" && decision !== "rejected")) return;
  await supabase.from("community_verifications").update({ status: decision, review_notes: notes.success ? notes.data || null : null }).eq("id", id.data);
  revalidatePath("/admin");
}

export async function handleReportAction(form: FormData): Promise<void> {
  const id = uuidSchema.safeParse(form.get("id"));
  const status = form.get("status");
  const { supabase } = await getCurrentUser();
  if (!id.success || !supabase || (status !== "resolved" && status !== "dismissed")) return;
  await supabase.from("reports").update({ status }).eq("id", id.data);
  revalidatePath("/admin");
}
