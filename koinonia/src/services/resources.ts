import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Community } from "@/types/database";
import { pageRange, PAGE_SIZE } from "./pagination";
import type { resourceKindValues } from "@/schemas/resource";

export type ResourceKind = (typeof resourceKindValues)[number];
export type ResourceRequestStatus = "pending" | "approved" | "declined" | "returned" | "cancelled";

export interface Resource {
  id: string;
  community_id: string;
  title: string;
  description: string;
  kind: ResourceKind;
  status: "available" | "unavailable";
  country_code: string;
  city: string;
  ships_remotely: boolean;
  created_at: string;
  community: Pick<Community, "id" | "slug" | "name"> | null;
}

const SELECT = "id, community_id, title, description, kind, status, country_code, city, ships_remotely, created_at, community:communities!inner(id, slug, name)";

export async function listResources(supabase: SupabaseClient, f: { q?: string; kind?: ResourceKind; country?: string; page?: number; communityId?: string; includeUnavailable?: boolean }) {
  const page = f.page ?? 1;
  const { from, to } = pageRange(page);
  let query = supabase.from("resources").select(SELECT, { count: "exact" });
  if (!f.includeUnavailable) query = query.eq("status", "available");
  if (f.communityId) query = query.eq("community_id", f.communityId);
  if (f.kind) query = query.eq("kind", f.kind);
  if (f.country) query = query.eq("country_code", f.country);
  if (f.q) query = query.ilike("title", `%${f.q}%`);
  const { data, error, count } = await query.order("created_at", { ascending: false }).range(from, to);
  if (error) throw error;
  const total = count ?? 0;
  return { items: (data ?? []) as unknown as Resource[], page, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export async function getResource(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase.from("resources").select(SELECT).eq("id", id).maybeSingle();
  if (error) throw error;
  return (data ?? null) as unknown as Resource | null;
}
