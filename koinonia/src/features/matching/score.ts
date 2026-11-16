/**
 * Match Missionário — pontuação explicável de 0 a 100.
 * Deve permanecer idêntica a public.match_score (supabase/migrations/..._rpc_search_matching.sql);
 * tests/unit/matching.test.ts verifica os mesmos casos usados nos testes SQL.
 */
import type { AvailabilitySlot, OpportunityMode } from "@/types/database";

export const MATCH_WEIGHTS = { skills: 50, languages: 20, location: 20, availability: 10 } as const;

export interface VolunteerSignals {
  skills: readonly number[];
  languages: readonly string[];
  country: string | null;
  city: string | null;
  availability: readonly AvailabilitySlot[];
}

export interface OpportunitySignals {
  skills: readonly number[];
  languages: readonly string[];
  mode: OpportunityMode;
  country: string | null;
  city: string | null;
  availability: readonly AvailabilitySlot[];
}

export type LocationFit = "remote" | "same_city" | "same_country" | "hybrid_far" | "far";

export interface MatchResult {
  score: number;
  parts: { skills: number; languages: number; location: number; availability: number };
  matchedSkills: number;
  requiredSkills: number;
  languageMatch: boolean;
  location: LocationFit;
  availabilityMatch: boolean;
}

const norm = (s: string | null) => (s ?? "").trim().toLowerCase();
const round1 = (n: number) => Math.round(n * 10) / 10;

export function scoreMatch(v: VolunteerSignals, o: OpportunitySignals): MatchResult {
  const have = new Set(v.skills);
  const matchedSkills = o.skills.filter((s) => have.has(s)).length;
  const skillFraction = o.skills.length === 0 ? 0.5 : matchedSkills / o.skills.length;

  const languageMatch = o.languages.length === 0 || o.languages.some((l) => v.languages.includes(l));

  let location: LocationFit;
  let locationFraction: number;
  if (o.mode === "remote") [location, locationFraction] = ["remote", 1];
  else if (v.country && v.country === o.country && o.city && norm(v.city) === norm(o.city)) [location, locationFraction] = ["same_city", 1];
  else if (v.country && v.country === o.country) [location, locationFraction] = ["same_country", 0.5];
  else if (o.mode === "hybrid") [location, locationFraction] = ["hybrid_far", 0.25];
  else [location, locationFraction] = ["far", 0];

  const availabilityMatch =
    o.availability.length === 0 || v.availability.includes("flexible") || o.availability.some((a) => v.availability.includes(a));

  const parts = {
    skills: MATCH_WEIGHTS.skills * skillFraction,
    languages: languageMatch ? MATCH_WEIGHTS.languages : 0,
    location: MATCH_WEIGHTS.location * locationFraction,
    availability: availabilityMatch ? MATCH_WEIGHTS.availability : 0,
  };
  return {
    score: round1(parts.skills + parts.languages + parts.location + parts.availability),
    parts,
    matchedSkills,
    requiredSkills: o.skills.length,
    languageMatch,
    location,
    availabilityMatch,
  };
}
