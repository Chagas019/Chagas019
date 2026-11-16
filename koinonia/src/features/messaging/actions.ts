"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { getI18n } from "@/i18n/server";
import { cleanText, uuidSchema } from "@/schemas/common";
import { dbError } from "@/lib/errors";
import type { ActionState } from "@/lib/action-state";

/** Inicia (ou reabre) a conversa 1:1 com outra pessoa. Regras de bloqueio/permissão ficam no banco. */
export async function startConversationAction(form: FormData): Promise<void> {
  const other = uuidSchema.safeParse(form.get("userId"));
  const { supabase, user } = await getCurrentUser();
  if (!other.success) redirect("/mensagens");
  if (!supabase || !user) redirect(`/entrar?next=/voluntarios/${other.data}`);
  const { data, error } = await supabase.rpc("start_conversation", { p_other: other.data });
  if (error || typeof data !== "string") redirect(`/voluntarios/${other.data}?erro=mensagem`);
  redirect(`/mensagens/${data}`);
}

export async function sendMessageAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { m } = await getI18n();
  const { supabase, user } = await getCurrentUser();
  if (!supabase || !user) return { status: "error", message: m.states.loginRequired };
  const conversation = uuidSchema.safeParse(form.get("conversationId"));
  const body = cleanText(4000, 1).safeParse(form.get("body") ?? "");
  if (!conversation.success) return { status: "error", message: m.errors.notFound };
  if (!body.success) return { status: "error", message: m.validation.required, values: { body: String(form.get("body") ?? "") } };
  const { error } = await supabase.from("messages").insert({ conversation_id: conversation.data, sender_id: user.id, body: body.data });
  if (error) {
    if (error.message.includes("blocked")) return { status: "error", message: m.messages.blocked, values: { body: body.data } };
    return dbError(error, m, { body: body.data });
  }
  revalidatePath(`/mensagens/${conversation.data}`);
  return { status: "success" };
}

export async function blockUserAction(form: FormData): Promise<void> {
  const other = uuidSchema.safeParse(form.get("userId"));
  const back = String(form.get("back") ?? "/mensagens");
  const { supabase, user } = await getCurrentUser();
  if (!other.success || !supabase || !user) return;
  if (form.get("mode") === "unblock") {
    await supabase.from("blocks").delete().eq("blocker_id", user.id).eq("blocked_id", other.data);
  } else {
    await supabase.from("blocks").insert({ blocker_id: user.id, blocked_id: other.data });
  }
  revalidatePath(back.startsWith("/") && !back.startsWith("//") ? back : "/mensagens");
}
