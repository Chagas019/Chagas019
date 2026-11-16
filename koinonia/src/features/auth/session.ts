import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import type { Profile } from "@/types/database";

export interface Session {
  userId: string;
  email: string | null;
  profile: Profile | null;
  roles: Array<"moderator" | "admin">;
  isAdmin: boolean;
  isModerator: boolean;
}

/** Sessão do usuário atual (memoizada por requisição). Retorna null para visitantes. */
export const getSession = cache(async (): Promise<Session | null> => {
  const { supabase, user } = await getCurrentUser();
  if (!supabase || !user) return null;
  const [{ data: profile }, { data: roles }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle<Profile>(),
    supabase.from("user_roles").select("role").eq("user_id", user.id),
  ]);
  const roleList = (roles ?? []).map((r) => r.role as "moderator" | "admin");
  const isAdmin = roleList.includes("admin");
  return {
    userId: user.id,
    email: user.email ?? null,
    profile: profile ?? null,
    roles: roleList,
    isAdmin,
    isModerator: isAdmin || roleList.includes("moderator"),
  };
});

/** Exige login; opcionalmente exige onboarding concluído. */
export async function requireSession(nextPath: string, { onboarded = true } = {}): Promise<Session> {
  const session = await getSession();
  if (!session) redirect(`/entrar?next=${encodeURIComponent(nextPath)}`);
  if (onboarded && !session.profile?.onboarded_at) redirect("/onboarding");
  return session;
}
