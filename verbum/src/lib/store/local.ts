"use client";
// Armazenamento no próprio navegador — usado quando o Supabase não está configurado.
import type { VerbumStore, SavedItem, Folder, Note, Project, HistoryEntry } from "./types";

const KEY = "verbum:v1";
type Data = { saved: SavedItem[]; folders: Folder[]; notes: Note[]; projects: Project[]; history: HistoryEntry[] };
const empty = (): Data => ({ saved: [], folders: [], notes: [], projects: [], history: [] });

function read(): Data {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...empty(), ...JSON.parse(raw) } : empty();
  } catch {
    return empty();
  }
}
function write(d: Data) {
  try { localStorage.setItem(KEY, JSON.stringify(d)); } catch { /* armazenamento indisponível */ }
}
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));
const now = () => new Date().toISOString();

export const localStore: VerbumStore = {
  mode: "local",
  async listSaved() { return read().saved.sort((a, b) => b.created_at.localeCompare(a.created_at)); },
  async save(item) {
    const d = read();
    const existing = d.saved.find((s) => s.kind === item.kind && s.ref_id === item.ref_id);
    if (existing) return existing;
    const s: SavedItem = { ...item, id: uid(), created_at: now() };
    d.saved.push(s); write(d); return s;
  },
  async unsave(kind, refId) { const d = read(); d.saved = d.saved.filter((s) => !(s.kind === kind && s.ref_id === refId)); write(d); },
  async moveSaved(id, folderId) { const d = read(); const s = d.saved.find((x) => x.id === id); if (s) s.folder_id = folderId; write(d); },
  async listFolders() { return read().folders.sort((a, b) => a.name.localeCompare(b.name)); },
  async addFolder(name) { const d = read(); const f = { id: uid(), name: name.slice(0, 60), created_at: now() }; d.folders.push(f); write(d); return f; },
  async removeFolder(id) {
    const d = read();
    d.folders = d.folders.filter((f) => f.id !== id);
    for (const list of [d.saved, d.notes, d.projects] as { folder_id?: string | null }[][]) for (const x of list) if (x.folder_id === id) x.folder_id = null;
    write(d);
  },
  async listNotes() { return read().notes.sort((a, b) => b.updated_at.localeCompare(a.updated_at)); },
  async saveNote(note) {
    const d = read();
    if (note.id) {
      const n = d.notes.find((x) => x.id === note.id);
      if (n) { Object.assign(n, note, { updated_at: now() }); write(d); return n; }
    }
    const n: Note = { folder_id: null, project_id: null, ...note, id: uid(), created_at: now(), updated_at: now() };
    d.notes.push(n); write(d); return n;
  },
  async removeNote(id) { const d = read(); d.notes = d.notes.filter((n) => n.id !== id); write(d); },
  async listProjects() { return read().projects.sort((a, b) => b.updated_at.localeCompare(a.updated_at)); },
  async getProject(id) { return read().projects.find((p) => p.id === id) ?? null; },
  async saveProject(p) {
    const d = read();
    if (p.id) {
      const x = d.projects.find((y) => y.id === p.id);
      if (x) { Object.assign(x, p, { updated_at: now() }); write(d); return x; }
    }
    const x: Project = { kind: "pregacao", status: "rascunho", brief: {}, content: null, event_date: null, folder_id: null, ...p, id: uid(), created_at: now(), updated_at: now() };
    d.projects.push(x); write(d); return x;
  },
  async removeProject(id) { const d = read(); d.projects = d.projects.filter((p) => p.id !== id); write(d); },
  async listHistory(limit = 20) { return read().history.sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, limit); },
  async addHistory(query, scope, count) {
    const d = read();
    d.history = d.history.filter((h) => h.query.toLowerCase() !== query.toLowerCase() || h.scope !== scope);
    d.history.push({ id: uid(), query: query.slice(0, 200), scope, results_count: count, created_at: now() });
    d.history = d.history.slice(-100);
    write(d);
  },
  async clearHistory() { const d = read(); d.history = []; write(d); },
};
