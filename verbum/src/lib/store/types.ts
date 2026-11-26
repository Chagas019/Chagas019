export type SavedKind = "song" | "source" | "sermon" | "preacher" | "bible" | "catechism" | "saint" | "video" | "link";

export type SavedItem = {
  id: string;
  kind: SavedKind;
  ref_id: string;
  title: string;
  subtitle?: string | null;
  url?: string | null;
  payload?: Record<string, unknown>;
  folder_id?: string | null;
  created_at: string;
};

export type Folder = { id: string; name: string; created_at: string };

export type Note = { id: string; title: string; body: string; folder_id?: string | null; project_id?: string | null; created_at: string; updated_at: string };

export type ProjectKind = "pregacao" | "encontro" | "retiro" | "formacao" | "estudo" | "grupo-de-oracao";
export type Project = {
  id: string;
  title: string;
  kind: ProjectKind;
  status: "rascunho" | "pronto" | "realizado";
  event_date?: string | null;
  brief: Record<string, unknown>;
  content: unknown;
  folder_id?: string | null;
  created_at: string;
  updated_at: string;
};

export type HistoryEntry = { id: string; query: string; scope: string; results_count: number; created_at: string };

export interface VerbumStore {
  mode: "nuvem" | "local";
  listSaved(): Promise<SavedItem[]>;
  save(item: Omit<SavedItem, "id" | "created_at">): Promise<SavedItem>;
  unsave(kind: SavedKind, refId: string): Promise<void>;
  moveSaved(id: string, folderId: string | null): Promise<void>;
  listFolders(): Promise<Folder[]>;
  addFolder(name: string): Promise<Folder>;
  removeFolder(id: string): Promise<void>;
  listNotes(): Promise<Note[]>;
  saveNote(note: Partial<Note> & { title: string; body: string }): Promise<Note>;
  removeNote(id: string): Promise<void>;
  listProjects(): Promise<Project[]>;
  getProject(id: string): Promise<Project | null>;
  saveProject(p: Partial<Project> & { title: string }): Promise<Project>;
  removeProject(id: string): Promise<void>;
  listHistory(limit?: number): Promise<HistoryEntry[]>;
  addHistory(query: string, scope: string, count: number): Promise<void>;
  clearHistory(): Promise<void>;
}
