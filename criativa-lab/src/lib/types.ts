export type CategoryId =
  | "fotografia"
  | "design"
  | "video"
  | "direcao-de-arte"
  | "social"
  | "tipografia"
  | "livre";

export type Difficulty = "iniciante" | "intermediario" | "avancado";

export type ChallengeKind = "diario" | "especial-7" | "especial-30";

export interface Challenge {
  slug: string;
  title: string;
  category: CategoryId;
  kind: ChallengeKind;
  difficulty: Difficulty;
  minutes: number;
  xp: number;
  summary: string;
  objective: string;
  instructions: string[];
  references: string[]; // slugs de referências
  tags: string[];
  /** Para desafios especiais: lista de etapas diárias. */
  steps?: string[];
}

export type ReferenceKind =
  | "fotografia"
  | "cartaz"
  | "identidade"
  | "tipografia"
  | "paleta"
  | "campanha"
  | "direcao-de-arte"
  | "composicao";

export interface Reference {
  slug: string;
  title: string;
  kind: ReferenceKind;
  author: string;
  year: number;
  description: string;
  insight: string;
  palette: string[];
  tags: string[];
  /** Semente da arte generativa */
  seed: number;
  ratio: "portrait" | "landscape" | "square";
}

export interface Lesson {
  slug: string;
  title: string;
  minutes: number;
  body: string[];
  exercise: string;
}

export interface Course {
  slug: string;
  title: string;
  subtitle: string;
  category: CategoryId;
  level: Difficulty;
  color: string;
  lessons: Lesson[];
}

/* ─────────────── Dados do usuário ─────────────── */

export interface AppUser {
  id: string;
  email: string;
}

export interface Profile {
  id: string;
  name: string;
  bio: string;
  focus: CategoryId[];
  weeklyGoal: number; // desafios por semana
  createdAt: string;
}

export interface Completion {
  id: string;
  challengeSlug: string;
  /** Etapa (0-based) para desafios especiais de 7/30 dias; null para desafios diários. */
  step: number | null;
  note: string;
  xp: number;
  createdAt: string;
}

export interface Favorite {
  id: string;
  referenceSlug: string;
  collectionId: string | null;
  createdAt: string;
}

export interface Collection {
  id: string;
  name: string;
  createdAt: string;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  category: CategoryId;
  images: string[]; // URLs (storage) ou data URLs (modo local)
  status: "ideia" | "em-andamento" | "concluido";
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface LessonProgress {
  id: string;
  courseSlug: string;
  lessonSlug: string;
  createdAt: string;
}

export type ActivityType =
  | "challenge_completed"
  | "lesson_completed"
  | "reference_saved"
  | "project_created"
  | "project_updated"
  | "idea_generated"
  | "idea_saved"
  | "signup";

export interface Activity {
  id: string;
  type: ActivityType;
  label: string;
  xp: number;
  meta?: Record<string, string>;
  createdAt: string;
}

export interface SavedIdea {
  id: string;
  title: string;
  payload: GeneratedIdea;
  createdAt: string;
}

/* ─────────────── Gerador de ideias ─────────────── */

export interface IdeaRequest {
  what: string;
  category: CategoryId;
  style: string;
  audience: string;
  difficulty: Difficulty;
  extra?: string;
}

export interface GeneratedIdea {
  title: string;
  concept: string;
  ideas: string[];
  artDirection: string;
  references: string[];
  palette: { name: string; hex: string }[];
  execution: string[];
  script: string[] | null;
  source: "ia" | "local";
}
