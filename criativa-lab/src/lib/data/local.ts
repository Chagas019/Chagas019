"use client";

import { blobToDataUrl } from "../image";
import type { AppUser, Profile } from "../types";
import { AuthError, nowIso, uid, type Backend, type SignUpResult, type TableName, type TableRows, type UserData } from "./backend";

/**
 * Backend local: persiste tudo no localStorage, isolado por usuário.
 * É usado quando as variáveis do Supabase não estão configuradas, para que a
 * plataforma seja 100% utilizável em desenvolvimento e demonstração.
 * ATENÇÃO: não é um mecanismo de segurança — em produção configure o Supabase.
 */

const NS = "criativa-lab:v1";
const USERS_KEY = `${NS}:users`;
const SESSION_KEY = `${NS}:session`;

interface StoredUser {
  id: string;
  email: string;
  salt: string;
  hash: string;
}

const read = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

const write = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    if (err instanceof DOMException && err.name === "QuotaExceededError") {
      throw new Error("Armazenamento do navegador cheio. Remova imagens antigas ou configure o Supabase.");
    }
    throw err;
  }
};

async function sha256(text: string) {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const tableKey = (userId: string, table: string) => `${NS}:${userId}:${table}`;
const profileKey = (userId: string) => `${NS}:${userId}:profile`;

export function createLocalBackend(): Backend {
  const listeners = new Set<(u: AppUser | null) => void>();
  const emit = (u: AppUser | null) => listeners.forEach((l) => l(u));

  const currentUser = (): AppUser | null => {
    const session = read<AppUser | null>(SESSION_KEY, null);
    if (!session) return null;
    const users = read<Record<string, StoredUser>>(USERS_KEY, {});
    return users[session.email] ? session : null;
  };

  const list = <T extends TableName>(userId: string, table: T) => read<TableRows[T][]>(tableKey(userId, table), []);

  return {
    mode: "local",

    async getUser() {
      return currentUser();
    },

    onAuthChange(cb) {
      listeners.add(cb);
      const onStorage = (e: StorageEvent) => {
        if (e.key === SESSION_KEY) cb(currentUser());
      };
      window.addEventListener("storage", onStorage);
      return () => {
        listeners.delete(cb);
        window.removeEventListener("storage", onStorage);
      };
    },

    async signUp(name, email, password): Promise<SignUpResult> {
      const key = email.trim().toLowerCase();
      const users = read<Record<string, StoredUser>>(USERS_KEY, {});
      if (users[key]) throw new AuthError("Já existe uma conta com este e-mail.");
      const salt = uid();
      const user: StoredUser = { id: uid(), email: key, salt, hash: await sha256(salt + password) };
      users[key] = user;
      write(USERS_KEY, users);
      const profile: Profile = {
        id: user.id,
        name: name.trim(),
        bio: "",
        focus: [],
        weeklyGoal: 4,
        createdAt: nowIso(),
      };
      write(profileKey(user.id), profile);
      const session = { id: user.id, email: key };
      write(SESSION_KEY, session);
      emit(session);
      return { status: "signed-in" };
    },

    async signIn(email, password) {
      const key = email.trim().toLowerCase();
      const users = read<Record<string, StoredUser>>(USERS_KEY, {});
      const user = users[key];
      if (!user || user.hash !== (await sha256(user.salt + password))) {
        throw new AuthError("E-mail ou senha incorretos.");
      }
      const session = { id: user.id, email: key };
      write(SESSION_KEY, session);
      emit(session);
    },

    async signOut() {
      localStorage.removeItem(SESSION_KEY);
      emit(null);
    },

    async loadAll(user): Promise<UserData> {
      const profile = read<Profile | null>(profileKey(user.id), null) ?? {
        id: user.id,
        name: user.email.split("@")[0],
        bio: "",
        focus: [],
        weeklyGoal: 4,
        createdAt: nowIso(),
      };
      return {
        profile,
        completions: list(user.id, "completions"),
        favorites: list(user.id, "favorites"),
        collections: list(user.id, "collections"),
        projects: list(user.id, "projects"),
        lessons: list(user.id, "lesson_progress"),
        activities: list(user.id, "activities"),
        ideas: list(user.id, "saved_ideas"),
      };
    },

    async updateProfile(userId, patch) {
      const current = read<Profile | null>(profileKey(userId), null);
      if (!current) throw new Error("Perfil não encontrado.");
      const next = { ...current, ...patch };
      write(profileKey(userId), next);
      return next;
    },

    async insert(userId, table, row) {
      const rows = list(userId, table);
      write(tableKey(userId, table), [row, ...rows]);
      return row;
    },

    async update(userId, table, id, patch) {
      const rows = list(userId, table) as { id: string }[];
      write(
        tableKey(userId, table),
        rows.map((r) => (r.id === id ? { ...r, ...patch } : r)),
      );
    },

    async remove(userId, table, id) {
      const rows = list(userId, table) as { id: string }[];
      write(
        tableKey(userId, table),
        rows.filter((r) => r.id !== id),
      );
    },

    async clear(userId, tables) {
      tables.forEach((t) => localStorage.removeItem(tableKey(userId, t)));
    },

    async uploadImage(_userId, file) {
      return blobToDataUrl(file);
    },
  };
}
