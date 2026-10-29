import "server-only";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "../db";
import { notification, post, profile, type NotificationPrefs } from "../db/schema";
import { isBlockedEitherWay } from "./relations";
import { visibleToViewer } from "./posts";

type NotificationType = (typeof notification.$inferInsert)["type"];

/**
 * Cria uma notificação real, respeitando preferências, bloqueios e evitando auto-notificação.
 * Curtidas repetidas no mesmo post não geram nova notificação.
 */
export async function notify(input: {
  userId: string;
  actorId: string | null;
  type: NotificationType;
  postId?: string | null;
  challengeId?: string | null;
  communityId?: string | null;
  message?: string;
}): Promise<void> {
  if (input.actorId && input.actorId === input.userId) return;
  if (input.actorId && (await isBlockedEitherWay(input.userId, input.actorId))) return;
  const [p] = await db.select({ prefs: profile.notificationPrefs }).from(profile).where(eq(profile.userId, input.userId)).limit(1);
  const prefs = p?.prefs as NotificationPrefs | undefined;
  if (prefs && prefs[input.type] === false) return;
  if (input.type === "like" && input.postId && input.actorId) {
    const existing = await db
      .select({ id: notification.id })
      .from(notification)
      .where(and(eq(notification.userId, input.userId), eq(notification.actorId, input.actorId), eq(notification.type, "like"), eq(notification.postId, input.postId)))
      .limit(1);
    if (existing.length) return;
  }
  await db.insert(notification).values({
    userId: input.userId,
    actorId: input.actorId,
    type: input.type,
    postId: input.postId ?? null,
    challengeId: input.challengeId ?? null,
    communityId: input.communityId ?? null,
    message: input.message ?? "",
  });
}

export async function unreadCount(userId: string): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(notification)
    .where(and(eq(notification.userId, userId), isNull(notification.readAt)));
  return row?.n ?? 0;
}

export async function listNotifications(userId: string, limit = 50) {
  return db
    .select({
      id: notification.id,
      type: notification.type,
      message: notification.message,
      readAt: notification.readAt,
      createdAt: notification.createdAt,
      postId: notification.postId,
      postTitle: sql<string | null>`case when ${visibleToViewer(userId)} then ${post.title} end`,
      challengeId: notification.challengeId,
      communityId: notification.communityId,
      actorHandle: profile.handle,
      actorName: profile.displayName,
      actorAvatar: profile.avatarMediaId,
    })
    .from(notification)
    .leftJoin(profile, eq(profile.userId, notification.actorId))
    .leftJoin(post, eq(post.id, notification.postId))
    .where(eq(notification.userId, userId))
    .orderBy(desc(notification.createdAt))
    .limit(limit);
}

export async function markAllRead(userId: string): Promise<void> {
  await db.update(notification).set({ readAt: new Date() }).where(and(eq(notification.userId, userId), isNull(notification.readAt)));
}

export async function updateNotificationPrefs(userId: string, prefs: NotificationPrefs): Promise<void> {
  await db.update(profile).set({ notificationPrefs: prefs }).where(eq(profile.userId, userId));
}

