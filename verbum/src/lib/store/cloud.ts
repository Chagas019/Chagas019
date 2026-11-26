"use client";
// Armazenamento no Supabase (RLS garante que cada usuário só acesse os próprios dados).
import type { SupabaseClient } from "@supabase/supabase-js";
import type { VerbumStore, SavedItem, Folder, Note, Project, HistoryEntry } from "./types";

function check<T>(r: { data: T | null; error: { message: string } | null }): T {
  if (r.error) throw new Error(r.error.message);
  return r.data as T;
}

export function cloudStore(sb: SupabaseClient): VerbumStore {
  return {
    mode: "nuvem",
    async listSaved() { return check(await sb.from("saved_items").select("*").order("created_at", { ascending: false })) as SavedItem[]; },
    async save(item) {
      return check(await sb.from("saved_items").upsert(item, { onConflict: "user_id,kind,ref_id" }).select().single()) as SavedItem;
    },
    async unsave(kind, refId) { check(await sb.from("saved_items").delete().eq("kind", kind).eq("ref_id", refId)); },
    async moveSaved(id, folderId) { check(await sb.from("saved_items").update({ folder_id: folderId }).eq("id", id)); },
    async listFolders() { return check(await sb.from("folders").select("*").order("name")) as Folder[]; },
    async addFolder(name) { return check(await sb.from("folders").insert({ name: name.slice(0, 60) }).select().single()) as Folder; },
    async removeFolder(id) { check(await sb.from("folders").delete().eq("id", id)); },
    async listNotes() { return check(await sb.from("notes").select("*").order("updated_at", { ascending: false })) as Note[]; },
    async saveNote(note) {
      const { id, created_at: _c, updated_at: _u, ...fields } = note;
      if (id) return check(await sb.from("notes").update(fields).eq("id", id).select().single()) as Note;
      return check(await sb.from("notes").insert(fields).select().single()) as Note;
    },
    async removeNote(id) { check(await sb.from("notes").delete().eq("id", id)); },
    async listProjects() { return check(await sb.from("sermon_projects").select("*").order("updated_at", { ascending: false })) as Project[]; },
    async getProject(id) { return (check(await sb.from("sermon_projects").select("*").eq("id", id).maybeSingle()) as Project | null) ?? null; },
    async saveProject(p) {
      const { id, created_at: _c, updated_at: _u, ...fields } = p;
      if (id) return check(await sb.from("sermon_projects").update(fields).eq("id", id).select().single()) as Project;
      return check(await sb.from("sermon_projects").insert(fields).select().single()) as Project;
    },
    async removeProject(id) { check(await sb.from("sermon_projects").delete().eq("id", id)); },
    async listHistory(limit = 20) { return check(await sb.from("search_history").select("*").order("created_at", { ascending: false }).limit(limit)) as HistoryEntry[]; },
    async addHistory(query, scope, count) { check(await sb.from("search_history").insert({ query: query.slice(0, 200), scope, results_count: count })); },
    async clearHistory() {
      const { data } = await sb.auth.getUser();
      if (data.user) check(await sb.from("search_history").delete().eq("user_id", data.user.id));
    },
  };
}
