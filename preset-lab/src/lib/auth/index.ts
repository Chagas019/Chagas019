import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { assertSafeConfig, config } from "@/lib/config";
import { LocalAuth } from "./local";
import { SupabaseAuth } from "./supabase";
import type { AuthBackend } from "./types";

export { AuthError } from "./types";

let localAuth: LocalAuth | null = null;
let supaAuth: SupabaseAuth | null = null;

export function auth(): AuthBackend {
  assertSafeConfig();
  return config.backend === "supabase" ? (supaAuth ??= new SupabaseAuth()) : (localAuth ??= new LocalAuth());
}

/** Usuário da requisição atual (memoizado por requisição). */
export const getCurrentUser = cache(() => auth().getUser());

/** Exige login; redireciona para /entrar preservando o destino. */
export async function requireUser(next = "/lab") {
  const user = await getCurrentUser();
  if (!user) redirect(`/entrar?next=${encodeURIComponent(next)}`);
  return user;
}

/** Exige papel de administrador (verificado no servidor a cada requisição). */
export async function requireAdmin() {
  const user = await requireUser("/admin");
  if (user.profile.role !== "admin") redirect("/?erro=acesso-negado");
  return user;
}
