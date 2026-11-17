import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Community, MemberRole } from "@/types/database";
import { pageRange, PAGE_SIZE } from "./pagination";

export async function listCommunities(supabase: SupabaseClient, f: { q?: string; country?: string; page?: number } = {}) {
  const page = f.page ?? 1;
  const { from, to } = pageRange(page);
  let query = supabase.from("communities").select("*", { count: "exact" }).eq("status", "verified");
  if (f.country) query = query.eq("country_code", f.country);
  if (f.q) query = query.textSearch("search_document", f.q, { type: "plain", config: "simple" });
  const { data, error, count } = await query.order("name").range(from, to);
  if (error) throw error;
  const total = count ?? 0;
  return { items: (data ?? []) as Community[], total, page, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export async function getCommunityBySlug(supabase: SupabaseClient, slug: string) {
  const { data, error } = await supabase.from("communities").select("*").eq("slug", slug).maybeSingle();
  if (error) throw error;
  return (data ?? null) as Community | null;
}

export async function getMyMembership(supabase: SupabaseClient, communityId: string, userId: string | undefined) {
  if (!userId) return null;
  const { data } = await supabase.from("community_members").select("role").eq("community_id", communityId).eq("user_id", userId).maybeSingle();
  return (data?.role ?? null) as MemberRole | null;
}

export async function listMyCommunities(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("community_members")
    .select("role, community:communities!inner(id, slug, name, kind, status, city, country_code)")
    .eq("user_id", userId)
    .order("joined_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Array<{ role: MemberRole; community: Pick<Community, "id" | "slug" | "name" | "kind" | "status" | "city" | "country_code"> }>;
}
