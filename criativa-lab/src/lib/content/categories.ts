import type { CategoryId, Difficulty } from "../types";

export const CATEGORIES: { id: CategoryId; label: string; short: string; color: string }[] = [
  { id: "fotografia", label: "Fotografia", short: "Foto", color: "#d4ff3a" },
  { id: "design", label: "Design gráfico", short: "Design", color: "#7cc4ff" },
  { id: "video", label: "Edição de vídeo", short: "Vídeo", color: "#ff5c39" },
  { id: "direcao-de-arte", label: "Direção de arte", short: "Dir. arte", color: "#b69cff" },
  { id: "social", label: "Social media", short: "Social", color: "#ffd23f" },
  { id: "tipografia", label: "Tipografia", short: "Tipo", color: "#f3f3ee" },
  { id: "livre", label: "Criatividade livre", short: "Livre", color: "#5cffc8" },
];

export const categoryById = (id: CategoryId) => CATEGORIES.find((c) => c.id === id)!;

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  iniciante: "Iniciante",
  intermediario: "Intermediário",
  avancado: "Avançado",
};

export const DIFFICULTY_DOTS: Record<Difficulty, number> = {
  iniciante: 1,
  intermediario: 2,
  avancado: 3,
};
