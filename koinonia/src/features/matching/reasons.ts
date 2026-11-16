import { t } from "@/i18n/format";
import type { Messages } from "@/i18n/types";
import type { MatchResult } from "./score";

/** Frases legíveis que explicam a recomendação ao usuário. */
export function matchReasons(r: MatchResult, m: Messages): Array<{ text: string; positive: boolean }> {
  const location = {
    remote: m.match.reasonRemote, same_city: m.match.reasonSameCity, same_country: m.match.reasonSameCountry,
    hybrid_far: m.match.reasonFar, far: m.match.reasonFar,
  }[r.location];
  return [
    r.requiredSkills === 0
      ? { text: m.match.reasonSkillsNone, positive: true }
      : { text: t(m.match.reasonSkills, { matched: r.matchedSkills, total: r.requiredSkills }), positive: r.matchedSkills > 0 },
    { text: r.languageMatch ? m.match.reasonLanguage : m.match.reasonNoLanguage, positive: r.languageMatch },
    { text: location, positive: r.location !== "far" && r.location !== "hybrid_far" },
    { text: r.availabilityMatch ? m.match.reasonAvailability : m.match.reasonNoAvailability, positive: r.availabilityMatch },
  ];
}
