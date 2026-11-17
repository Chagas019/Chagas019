import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AvailabilitySlot, Community, Opportunity, OpportunityMode } from "@/types/database";
import { pageRange, PAGE_SIZE } from "./pagination";

export type OpportunityWithCommunity = Opportunity & {
  community: Pick<Community, "id" | "slug" | "name" | "kind" | "city" | "country_code"> | null;
  opportunity_skills: Array<{ skill_id: number }>;
};

const SELECT = "*, community:communities!inner(id, slug, name, kind, city, country_code), opportunity_skills(skill_id)";

export interface OpportunityFilters {
  q?: string;
  mode?: OpportunityMode;
  country?: string;
  category?: number;
  availability?: AvailabilitySlot;
  page?: number;
  communityId?: string;
  includeDrafts?: boolean;
}

export async function listOpportunities(supabase: SupabaseClient, f: OpportunityFilters = {}) {
  const page = f.page ?? 1;
  const { from, to } = pageRange(page);
  let query = supabase.from("opportunities").select(SELECT, { count: "exact" });
  query = f.includeDrafts ? query : query.eq("status", "open");
  if (f.communityId) query = query.eq("community_id", f.communityId);
  if (f.mode) query = query.eq("mode", f.mode);
  if (f.country) query = query.eq("country_code", f.country);
  if (f.availability) query = query.or(`availability.cs.{${f.availability}},availability.eq.{}`);
  if (f.q) query = query.textSearch("search_document", f.q, { type: "plain", config: "simple" });
  if (f.category) {
    const { data: skillRows } = await supabase.from("skills").select("id").eq("category_id", f.category);
    const ids = (skillRows ?? []).map((s) => s.id as number);
    const { data: oppRows } = await supabase.from("opportunity_skills").select("opportunity_id").in("skill_id", ids.length ? ids : [-1]);
    const oppIds = [...new Set((oppRows ?? []).map((r) => r.opportunity_id as string))];
    query = query.in("id", oppIds.length ? oppIds : ["00000000-0000-0000-0000-000000000000"]);
  }
  const { data, error, count } = await query.order("created_at", { ascending: false }).range(from, to);
  if (error) throw error;
  const total = count ?? 0;
  return { items: (data ?? []) as OpportunityWithCommunity[], total, page, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export async function getOpportunity(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase.from("opportunities").select(SELECT).eq("id", id).maybeSingle();
  if (error) throw error;
  return (data ?? null) as OpportunityWithCommunity | null;
}

export async function getOpportunitiesByIds(supabase: SupabaseClient, ids: string[]) {
  if (ids.length === 0) return [];
  const { data, error } = await supabase.from("opportunities").select(SELECT).in("id", ids);
  if (error) throw error;
  return (data ?? []) as OpportunityWithCommunity[];
}
