/** Taxonomias do produto. Slugs são estáveis; rótulos vêm daqui (e futuramente do i18n). */

export const CATEGORIES = [
  { slug: "fotografia", label: "Fotografia" },
  { slug: "video", label: "Vídeo" },
  { slug: "edicao", label: "Edição" },
  { slug: "color-grading", label: "Color grading" },
  { slug: "design", label: "Design" },
  { slug: "motion", label: "Motion design" },
  { slug: "arte-digital", label: "Arte digital" },
  { slug: "mobile", label: "Criação mobile" },
  { slug: "retrato", label: "Retrato" },
  { slug: "eventos", label: "Eventos e casamentos" },
  { slug: "street", label: "Rua e documental" },
  { slug: "natureza", label: "Natureza e paisagem" },
] as const;
export type CategorySlug = (typeof CATEGORIES)[number]["slug"];
export const CATEGORY_SLUGS = CATEGORIES.map((c) => c.slug) as [CategorySlug, ...CategorySlug[]];

export const FEED_FILTERS = [
  { slug: "para-voce", label: "Para você" },
  { slug: "seguindo", label: "Seguindo" },
  { slug: "fotografia", label: "Fotografia" },
  { slug: "video", label: "Vídeo" },
  { slug: "edicao", label: "Edição" },
  { slug: "color-grading", label: "Color grading" },
  { slug: "design", label: "Design" },
  { slug: "tutoriais", label: "Tutoriais" },
  { slug: "antes-e-depois", label: "Antes e depois" },
  { slug: "colaborativos", label: "Projetos colaborativos" },
] as const;
export type FeedFilter = (typeof FEED_FILTERS)[number]["slug"];

export const SPECIALTIES = [
  "Fotografia",
  "Videomaker",
  "Edição de fotos",
  "Edição de vídeo",
  "Design gráfico",
  "Reels e vídeos curtos",
  "Colorista",
  "Direção de fotografia",
  "Motion design",
  "Arte digital",
  "Aprendendo",
] as const;

export const POST_FORMATS = [
  { slug: "photo", label: "Fotografia" },
  { slug: "carousel", label: "Carrossel" },
  { slug: "video", label: "Vídeo" },
  { slug: "before_after", label: "Antes e depois" },
  { slug: "making_of", label: "Making of" },
  { slug: "breakdown", label: "Breakdown de edição" },
  { slug: "project", label: "Projeto completo" },
  { slug: "lighting_study", label: "Estudo de iluminação" },
  { slug: "behind_the_scenes", label: "Bastidores" },
  { slug: "text", label: "Texto" },
] as const;
export type PostFormat = (typeof POST_FORMATS)[number]["slug"];

export const LAB_TOPICS = [
  { slug: "lightroom", label: "Lightroom" },
  { slug: "photoshop", label: "Photoshop" },
  { slug: "capcut", label: "CapCut" },
  { slug: "davinci-resolve", label: "DaVinci Resolve" },
  { slug: "premiere-pro", label: "Premiere Pro" },
  { slug: "final-cut", label: "Final Cut" },
  { slug: "edicao-mobile", label: "Edição mobile" },
  { slug: "color-grading", label: "Color grading" },
  { slug: "fotografia-celular", label: "Fotografia com celular" },
  { slug: "fotografia-profissional", label: "Fotografia profissional" },
  { slug: "motion-design", label: "Motion design" },
  { slug: "ia-criativa", label: "IA criativa" },
] as const;
export type LabTopic = (typeof LAB_TOPICS)[number]["slug"];
export const LAB_TOPIC_SLUGS = LAB_TOPICS.map((t) => t.slug) as [LabTopic, ...LabTopic[]];

export const LEVELS = [
  { slug: "iniciante", label: "Iniciante" },
  { slug: "intermediario", label: "Intermediário" },
  { slug: "avancado", label: "Avançado" },
] as const;

export const REPORT_REASONS = [
  { slug: "spam", label: "Spam ou golpe" },
  { slug: "harassment", label: "Assédio ou bullying" },
  { slug: "hate", label: "Discurso de ódio" },
  { slug: "nudity", label: "Nudez ou conteúdo sexual" },
  { slug: "violence", label: "Violência" },
  { slug: "copyright", label: "Violação de direitos autorais" },
  { slug: "fraud", label: "Oferta fraudulenta" },
  { slug: "impersonation", label: "Falsidade ideológica" },
  { slug: "other", label: "Outro motivo" },
] as const;

export function labelOf<T extends { slug: string; label: string }>(list: readonly T[], slug: string): string {
  return list.find((i) => i.slug === slug)?.label ?? slug;
}
