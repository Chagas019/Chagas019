import "server-only";
import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Skill, SkillCategory } from "@/types/database";

export interface Catalog { categories: SkillCategory[]; skills: Skill[] }

/** Catálogo de talentos (dados de referência), memoizado por requisição. */
export const getCatalog = cache(async (supabase: SupabaseClient): Promise<Catalog> => {
  const [cats, skills] = await Promise.all([
    supabase.from("skill_categories").select("id, slug, names, icon, sort_order").order("sort_order"),
    supabase.from("skills").select("id, category_id, slug, names").order("id"),
  ]);
  if (cats.error) throw cats.error;
  if (skills.error) throw skills.error;
  return { categories: (cats.data ?? []) as SkillCategory[], skills: (skills.data ?? []) as Skill[] };
});
