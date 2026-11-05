import type {
  Activity,
  AppUser,
  Collection,
  Completion,
  Favorite,
  LessonProgress,
  Profile,
  Project,
  SavedIdea,
} from "../types";

/** Tabelas do usuário. Os nomes são os mesmos no Supabase e no modo local. */
export interface TableRows {
  completions: Completion;
  favorites: Favorite;
  collections: Collection;
  projects: Project;
  lesson_progress: LessonProgress;
  activities: Activity;
  saved_ideas: SavedIdea;
}
export type TableName = keyof TableRows;

export interface UserData {
  profile: Profile;
  completions: Completion[];
  favorites: Favorite[];
  collections: Collection[];
  projects: Project[];
  lessons: LessonProgress[];
  activities: Activity[];
  ideas: SavedIdea[];
}

export type SignUpResult = { status: "signed-in" } | { status: "confirm-email" };

/**
 * Contrato único de persistência. A interface não sabe se os dados vivem no
 * Supabase (produção) ou no navegador (modo local/demonstração).
 */
export interface Backend {
  readonly mode: "local" | "supabase";
  getUser(): Promise<AppUser | null>;
  onAuthChange(cb: (user: AppUser | null) => void): () => void;
  signUp(name: string, email: string, password: string): Promise<SignUpResult>;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;

  loadAll(user: AppUser): Promise<UserData>;
  updateProfile(userId: string, patch: Partial<Omit<Profile, "id" | "createdAt">>): Promise<Profile>;

  insert<T extends TableName>(userId: string, table: T, row: TableRows[T]): Promise<TableRows[T]>;
  update<T extends TableName>(userId: string, table: T, id: string, patch: Partial<TableRows[T]>): Promise<void>;
  remove(userId: string, table: TableName, id: string): Promise<void>;
  clear(userId: string, tables: TableName[]): Promise<void>;

  uploadImage(userId: string, file: Blob): Promise<string>;
}

export const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export const nowIso = () => new Date().toISOString();

export class AuthError extends Error {}
