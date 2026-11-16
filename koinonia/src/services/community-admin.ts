import "server-only";
import { notFound } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getCommunityBySlug, getMyMembership } from "./communities";
import type { Session } from "@/features/auth/session";

/** Carrega a comunidade e indica se o usuário pode administrá-la (a autorização real é aplicada pelo RLS). */
export async function loadManagedCommunity(supabase: SupabaseClient, slug: string, session: Session) {
  const community = await getCommunityBySlug(supabase, slug);
  if (!community) notFound();
  const role = await getMyMembership(supabase, community.id, session.userId);
  return { community, canManage: role === "owner" || role === "admin" || session.isAdmin };
}
