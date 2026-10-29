import "server-only";
import { and, asc, desc, eq, gt, inArray, ne, sql } from "drizzle-orm";
import { db } from "../db";
import { collabApplication, collabListing, conversation, conversationMember, message, post, profile } from "../db/schema";
import { AppError } from "../errors";
import { enforceRateLimit } from "../rate-limit";
import type { Viewer } from "../session";
import { fieldErrors, messageSchema, startConversationSchema } from "@/lib/validation";
import { isBlockedEitherWay, isFollowing } from "./relations";

type V = Pick<Viewer, "id" | "role">;

/** Colaboração aceita entre as duas pessoas (em qualquer direção) libera a conversa. */
async function haveAcceptedCollab(a: string, b: string): Promise<boolean> {
  const rows = await db
    .select({ x: sql<number>`1` })
    .from(collabApplication)
    .innerJoin(collabListing, eq(collabListing.id, collabApplication.listingId))
    .where(
      and(
        eq(collabApplication.status, "accepted"),
        sql`((${collabListing.authorId} = ${a} and ${collabApplication.applicantId} = ${b}) or (${collabListing.authorId} = ${b} and ${collabApplication.applicantId} = ${a}))`,
      ),
    )
    .limit(1);
  return rows.length > 0;
}

/**
 * Pode iniciar conversa com `targetId`? Respeita bloqueios e a preferência do destinatário:
 * "everyone", "following" (quem o destinatário segue) ou "nobody". Colaboração aceita sempre libera.
 */
export async function canMessage(senderId: string, targetId: string): Promise<boolean> {
  if (senderId === targetId) return false;
  if (await isBlockedEitherWay(senderId, targetId)) return false;
  if (await haveAcceptedCollab(senderId, targetId)) return true;
  const [p] = await db.select({ pref: profile.messagesFrom }).from(profile).where(eq(profile.userId, targetId)).limit(1);
  if (!p) return false;
  if (p.pref === "everyone") return true;
  if (p.pref === "following") return isFollowing(targetId, senderId);
  return false;
}

async function requireMember(viewerId: string, conversationId: string) {
  const [m] = await db
    .select()
    .from(conversationMember)
    .where(and(eq(conversationMember.conversationId, conversationId), eq(conversationMember.userId, viewerId)))
    .limit(1);
  if (!m) throw new AppError("NOT_FOUND");
  return m;
}

/** Abre (ou reaproveita, no caso 1:1) uma conversa e envia a primeira mensagem. */
export async function startConversation(viewer: V, input: unknown): Promise<{ id: string }> {
  const parsed = startConversationSchema.safeParse(input);
  if (!parsed.success) throw new AppError("VALIDATION", undefined, fieldErrors(parsed.error));
  const others = [...new Set(parsed.data.participantIds)].filter((id) => id !== viewer.id);
  if (!others.length) throw new AppError("VALIDATION", "Escolha pelo menos uma pessoa.");
  await enforceRateLimit(`dm-start:${viewer.id}`, 20, 3600);
  for (const id of others) {
    if (!(await canMessage(viewer.id, id))) {
      throw new AppError("FORBIDDEN", "Uma das pessoas não aceita mensagens suas. Ela pode liberar seguindo você ou nas configurações.");
    }
  }

  if (others.length === 1) {
    const [existing] = await db.execute<{ id: string }>(sql`
      select c.id from conversation c
      where not c.is_group
        and exists (select 1 from conversation_member m where m.conversation_id = c.id and m.user_id = ${viewer.id})
        and exists (select 1 from conversation_member m where m.conversation_id = c.id and m.user_id = ${others[0]!})
      limit 1`);
    if (existing) {
      await sendMessage(viewer, { conversationId: existing.id, body: parsed.data.body });
      return { id: existing.id };
    }
  }

  const id = await db.transaction(async (tx) => {
    const [c] = await tx
      .insert(conversation)
      .values({ isGroup: others.length > 1, title: others.length > 1 ? parsed.data.title : null, createdById: viewer.id })
      .returning({ id: conversation.id });
    // Quem recebe ainda não leu nada: a primeira mensagem precisa contar como não lida.
    await tx.insert(conversationMember).values([
      { conversationId: c!.id, userId: viewer.id },
      ...others.map((userId) => ({ conversationId: c!.id, userId, lastReadAt: new Date(0) })),
    ]);
    await tx.insert(message).values({ conversationId: c!.id, senderId: viewer.id, body: parsed.data.body });
    return c!.id;
  });
  return { id };
}

export async function sendMessage(viewer: V, input: unknown) {
  const parsed = messageSchema.safeParse(input);
  if (!parsed.success) throw new AppError("VALIDATION", undefined, fieldErrors(parsed.error));
  const { conversationId, body, sharedPostId } = parsed.data;
  await requireMember(viewer.id, conversationId);
  await enforceRateLimit(`dm:${viewer.id}`, 40, 60);
  const [c] = await db.select({ isGroup: conversation.isGroup }).from(conversation).where(eq(conversation.id, conversationId)).limit(1);
  if (!c!.isGroup) {
    // Em conversa 1:1, bloqueio encerra o envio nos dois sentidos.
    const [other] = await db
      .select({ userId: conversationMember.userId })
      .from(conversationMember)
      .where(and(eq(conversationMember.conversationId, conversationId), ne(conversationMember.userId, viewer.id)))
      .limit(1);
    if (other && (await isBlockedEitherWay(viewer.id, other.userId))) throw new AppError("FORBIDDEN", "Não é possível enviar mensagens para esta pessoa.");
  }
  const [m] = await db.insert(message).values({ conversationId, senderId: viewer.id, body, sharedPostId }).returning();
  await db.update(conversation).set({ lastMessageAt: m!.createdAt }).where(eq(conversation.id, conversationId));
  await db.update(conversationMember).set({ lastReadAt: m!.createdAt }).where(and(eq(conversationMember.conversationId, conversationId), eq(conversationMember.userId, viewer.id)));
  return m!;
}

export async function listConversations(viewerId: string) {
  const rows = await db
    .select({
      id: conversation.id,
      title: conversation.title,
      isGroup: conversation.isGroup,
      lastMessageAt: conversation.lastMessageAt,
      lastReadAt: conversationMember.lastReadAt,
      unread: sql<number>`(select count(*)::int from message m where m.conversation_id = ${conversation.id} and m.created_at > ${conversationMember.lastReadAt} and m.sender_id is distinct from ${viewerId})`,
      preview: sql<string | null>`(select m.body from message m where m.conversation_id = ${conversation.id} order by m.created_at desc limit 1)`,
    })
    .from(conversationMember)
    .innerJoin(conversation, eq(conversation.id, conversationMember.conversationId))
    .where(eq(conversationMember.userId, viewerId))
    .orderBy(desc(conversation.lastMessageAt))
    .limit(100);
  const ids = rows.map((r) => r.id);
  const members = ids.length
    ? await db
        .select({ conversationId: conversationMember.conversationId, userId: profile.userId, handle: profile.handle, displayName: profile.displayName, avatar: profile.avatarMediaId })
        .from(conversationMember)
        .innerJoin(profile, eq(profile.userId, conversationMember.userId))
        .where(and(inArray(conversationMember.conversationId, ids), ne(conversationMember.userId, viewerId)))
    : [];
  return rows.map((r) => ({ ...r, others: members.filter((m) => m.conversationId === r.id) }));
}

export async function unreadConversations(viewerId: string): Promise<number> {
  const [row] = await db.execute<{ n: number }>(sql`
    select count(*)::int as n from conversation_member cm
    where cm.user_id = ${viewerId}
      and exists (select 1 from message m where m.conversation_id = cm.conversation_id and m.created_at > cm.last_read_at and m.sender_id is distinct from ${viewerId})`);
  return Number(row?.n ?? 0);
}

export async function getConversation(viewer: V, conversationId: string, since?: Date) {
  if (!/^[0-9a-f-]{36}$/i.test(conversationId)) return null;
  const membership = await requireMember(viewer.id, conversationId).catch(() => null);
  if (!membership) return null;
  const [c] = await db.select().from(conversation).where(eq(conversation.id, conversationId)).limit(1);
  const members = await db
    .select({ userId: profile.userId, handle: profile.handle, displayName: profile.displayName, avatar: profile.avatarMediaId })
    .from(conversationMember)
    .innerJoin(profile, eq(profile.userId, conversationMember.userId))
    .where(eq(conversationMember.conversationId, conversationId));
  const messages = await db
    .select({
      id: message.id,
      senderId: message.senderId,
      body: message.body,
      createdAt: message.createdAt,
      sharedPostId: message.sharedPostId,
      sharedPostTitle: post.title,
    })
    .from(message)
    .leftJoin(post, eq(post.id, message.sharedPostId))
    .where(and(eq(message.conversationId, conversationId), since ? gt(message.createdAt, since) : undefined))
    .orderBy(asc(message.createdAt))
    .limit(500);
  let blocked = false;
  if (!c!.isGroup) {
    const other = members.find((m) => m.userId !== viewer.id);
    blocked = other ? await isBlockedEitherWay(viewer.id, other.userId) : false;
  }
  return { conversation: c!, members, messages, blocked };
}

export async function markConversationRead(viewerId: string, conversationId: string) {
  await db
    .update(conversationMember)
    .set({ lastReadAt: new Date() })
    .where(and(eq(conversationMember.conversationId, conversationId), eq(conversationMember.userId, viewerId)));
}

export async function leaveConversation(viewerId: string, conversationId: string) {
  await requireMember(viewerId, conversationId);
  await db.delete(conversationMember).where(and(eq(conversationMember.conversationId, conversationId), eq(conversationMember.userId, viewerId)));
  const [left] = await db.select({ n: sql<number>`count(*)::int` }).from(conversationMember).where(eq(conversationMember.conversationId, conversationId));
  if ((left?.n ?? 0) === 0) await db.delete(conversation).where(eq(conversation.id, conversationId));
}
