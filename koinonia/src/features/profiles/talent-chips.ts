/**
 * Atalhos de talento (home e /talentos). `slug` é um talento (skills.slug) ou uma área (skill_categories.slug)
 * do catálogo real; a página resolve o id no banco — nenhum dado é inventado.
 */
export const TALENT_CHIPS = [
  { key: "photographers", slug: "photography" },
  { key: "videomakers", slug: "video" },
  { key: "designers", slug: "graphic-design" },
  { key: "musicians", slug: "music" },
  { key: "catechists", slug: "catechesis" },
  { key: "communicators", slug: "communication" },
  { key: "developers", slug: "web-development" },
  { key: "translators", slug: "translation" },
  { key: "volunteers", slug: null },
] as const;
