"use server";

import { revalidatePath } from "next/cache";
import { inArray, sql } from "drizzle-orm";
import { db } from "../db";
import { profile } from "../db/schema";
import { AppError } from "../errors";
import { requireViewer } from "../session";
import * as messages from "../services/messages";
import { run } from "./run";

/** Recebe identificadores (@handle) e abre a conversa. */
export async function startConversationAction(input: { handles: string[]; title?: string; body: string }) {
  return run(async () => {
    const viewer = await requireViewer();
    const handles = [...new Set(input.handles.map((h) => h.trim().replace(/^@/, "").toLowerCase()).filter(Boolean))].slice(0, 9);
    if (!handles.length) throw new AppError("VALIDATION", "Informe pelo menos um @identificador.", { handles: "Informe pelo menos um @identificador." });
    const found = await db.select({ userId: profile.userId, handle: profile.handle }).from(profile).where(inArray(sql`lower(${profile.handle})`, handles));
    const missing = handles.filter((h) => !found.some((f) => f.handle.toLowerCase() === h));
    if (missing.length) throw new AppError("NOT_FOUND", `Não encontramos: @${missing.join(", @")}`, { handles: `Não encontramos: @${missing.join(", @")}` });
    const r = await messages.startConversation(viewer, { participantIds: found.map((f) => f.userId), title: input.title, body: input.body });
    revalidatePath("/mensagens");
    return r;
  });
}

export async function sendMessageAction(input: { conversationId: string; body: string; sharedPostId?: string | null }) {
  return run(async () => {
    const m = await messages.sendMessage(await requireViewer(), input);
    return { id: m.id, createdAt: m.createdAt };
  });
}

export async function fetchMessagesAction(conversationId: string, sinceIso: string | null) {
  return run(async () => {
    const viewer = await requireViewer();
    const since = sinceIso ? new Date(sinceIso) : undefined;
    const data = await messages.getConversation(viewer, conversationId, since && !Number.isNaN(since.getTime()) ? since : undefined);
    if (!data) throw new AppError("NOT_FOUND");
    await messages.markConversationRead(viewer.id, conversationId);
    return { messages: data.messages, blocked: data.blocked };
  });
}

export async function leaveConversationAction(conversationId: string) {
  return run(async () => {
    await messages.leaveConversation((await requireViewer()).id, conversationId);
    revalidatePath("/mensagens");
  }, "Você saiu da conversa.");
}
