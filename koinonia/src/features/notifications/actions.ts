"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/supabase/server";

export async function markAllNotificationsReadAction(): Promise<void> {
  const { supabase, user } = await getCurrentUser();
  if (!supabase || !user) return;
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", user.id).is("read_at", null);
  revalidatePath("/painel");
}
