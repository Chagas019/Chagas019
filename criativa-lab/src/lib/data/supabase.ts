"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppUser, Profile } from "../types";
import { AuthError, type Backend, type TableName, type TableRows, type UserData } from "./backend";

const snake = (k: string) => k.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`);
const camel = (k: string) => k.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());

const toDb = (row: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(row).map(([k, v]) => [snake(k), v]));
const fromDb = <T,>(row: Record<string, unknown>): T =>
  Object.fromEntries(Object.entries(row).filter(([k]) => k !== "user_id").map(([k, v]) => [camel(k), v])) as T;

const translateAuthError = (message: string) => {
  const m = message.toLowerCase();
  if (m.includes("invalid login")) return "E-mail ou senha incorretos.";
  if (m.includes("already registered") || m.includes("already exists")) return "Já existe uma conta com este e-mail.";
  if (m.includes("email not confirmed")) return "Confirme seu e-mail antes de entrar (verifique sua caixa de entrada).";
  if (m.includes("password")) return "Senha inválida: use pelo menos 6 caracteres.";
  if (m.includes("rate limit")) return "Muitas tentativas. Aguarde um instante e tente novamente.";
  return message;
};

export function createSupabaseBackend(url: string, anonKey: string): Backend {
  const sb: SupabaseClient = createBrowserClient(url, anonKey);
  const toUser = (u: { id: string; email?: string } | null | undefined): AppUser | null =>
    u ? { id: u.id, email: u.email ?? "" } : null;

  const must = <T,>(res: { data: T; error: { message: string } | null }) => {
    if (res.error) throw new Error(res.error.message);
    return res.data;
  };

  const list = async <T extends TableName>(userId: string, table: T) => {
    const rows = must(
      await sb.from(table).select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    ) as Record<string, unknown>[];
    return rows.map((r) => fromDb<TableRows[T]>(r));
  };

  return {
    mode: "supabase",

    async getUser() {
      const { data } = await sb.auth.getUser();
      return toUser(data.user);
    },

    onAuthChange(cb) {
      const { data } = sb.auth.onAuthStateChange((_event, session) => cb(toUser(session?.user)));
      return () => data.subscription.unsubscribe();
    },

    async signUp(name, email, password) {
      const { data, error } = await sb.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { name: name.trim() },
          emailRedirectTo: typeof window !== "undefined" ? `${window.location.origin}/inicio` : undefined,
        },
      });
      if (error) throw new AuthError(translateAuthError(error.message));
      return data.session ? { status: "signed-in" } : { status: "confirm-email" };
    },

    async signIn(email, password) {
      const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw new AuthError(translateAuthError(error.message));
    },

    async signOut() {
      await sb.auth.signOut();
    },

    async loadAll(user): Promise<UserData> {
      const profileRow = must(await sb.from("profiles").select("*").eq("id", user.id).maybeSingle()) as Record<
        string,
        unknown
      > | null;
      let profile: Profile;
      if (profileRow) {
        profile = fromDb<Profile>(profileRow);
      } else {
        // Perfil normalmente é criado pelo trigger; isto cobre contas antigas.
        const created = must(
          await sb
            .from("profiles")
            .insert({ id: user.id, name: user.email.split("@")[0] })
            .select("*")
            .single(),
        ) as Record<string, unknown>;
        profile = fromDb<Profile>(created);
      }
      const [completions, favorites, collections, projects, lessons, activities, ideas] = await Promise.all([
        list(user.id, "completions"),
        list(user.id, "favorites"),
        list(user.id, "collections"),
        list(user.id, "projects"),
        list(user.id, "lesson_progress"),
        list(user.id, "activities"),
        list(user.id, "saved_ideas"),
      ]);
      return { profile, completions, favorites, collections, projects, lessons, activities, ideas };
    },

    async updateProfile(userId, patch) {
      const row = must(
        await sb.from("profiles").update(toDb(patch)).eq("id", userId).select("*").single(),
      ) as Record<string, unknown>;
      return fromDb<Profile>(row);
    },

    async insert(userId, table, row) {
      const saved = must(
        await sb
          .from(table)
          .insert({ ...toDb(row as unknown as Record<string, unknown>), user_id: userId })
          .select("*")
          .single(),
      ) as Record<string, unknown>;
      return fromDb(saved);
    },

    async update(userId, table, id, patch) {
      const { id: _ignore, ...rest } = patch as Record<string, unknown>;
      must(await sb.from(table).update(toDb(rest)).eq("id", id).eq("user_id", userId));
    },

    async remove(userId, table, id) {
      must(await sb.from(table).delete().eq("id", id).eq("user_id", userId));
    },

    async clear(userId, tables) {
      for (const t of tables) must(await sb.from(t).delete().eq("user_id", userId));
    },

    async uploadImage(userId, file) {
      const ext = file.type === "image/webp" ? "webp" : file.type === "image/png" ? "png" : "jpg";
      const path = `${userId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await sb.storage.from("portfolio").upload(path, file, {
        contentType: file.type,
        cacheControl: "31536000",
      });
      if (error) throw new Error(`Falha no upload: ${error.message}`);
      return sb.storage.from("portfolio").getPublicUrl(path).data.publicUrl;
    },
  };
}
