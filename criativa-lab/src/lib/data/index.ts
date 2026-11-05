"use client";

import type { Backend } from "./backend";
import { createLocalBackend } from "./local";
import { createSupabaseBackend } from "./supabase";

let instance: Backend | null = null;

export const isSupabaseConfigured = () =>
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

/** Escolhe o backend em tempo de execução: Supabase quando configurado; senão, modo local. */
export function getBackend(): Backend {
  if (instance) return instance;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  instance = url && key ? createSupabaseBackend(url, key) : createLocalBackend();
  return instance;
}

export * from "./backend";
