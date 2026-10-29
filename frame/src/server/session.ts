import "server-only";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "./auth";
import { db } from "./db";
import { profile, user } from "./db/schema";
import { AppError } from "./errors";

export type Viewer = {
  id: string;
  email: string;
  role: "user" | "moderator" | "admin";
  handle: string;
  displayName: string;
  avatarMediaId: string | null;
  onboarded: boolean;
  createdAt: Date;
};

/** Sessão validada no servidor (memoizada por requisição). */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const [row] = await db
    .select({
      id: user.id,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      handle: profile.handle,
      displayName: profile.displayName,
      avatarMediaId: profile.avatarMediaId,
      onboardedAt: profile.onboardedAt,
    })
    .from(user)
    .innerJoin(profile, eq(profile.userId, user.id))
    .where(eq(user.id, session.user.id))
    .limit(1);
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    handle: row.handle,
    displayName: row.displayName,
    avatarMediaId: row.avatarMediaId,
    onboarded: row.onboardedAt !== null,
    createdAt: row.createdAt,
  };
});

export async function requireViewer(): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) throw new AppError("UNAUTHORIZED");
  return viewer;
}

/** Para páginas: redireciona para o login preservando o destino. */
export async function requireViewerPage(next: string): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) redirect(`/entrar?next=${encodeURIComponent(next)}`);
  return viewer;
}

export function isModerator(viewer: Pick<Viewer, "role"> | null): boolean {
  return viewer?.role === "moderator" || viewer?.role === "admin";
}
