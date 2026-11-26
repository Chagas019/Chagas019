import "server-only";
import { assertSafeConfig, config } from "@/lib/config";
import { LocalRepository } from "@/lib/local/repository";
import { SupabaseRepository } from "@/lib/supabase/repository";
import type { Repository } from "./types";

let local: LocalRepository | null = null;
let supa: SupabaseRepository | null = null;

/** Repositório do backend configurado (Supabase em produção; local em desenvolvimento). */
export function repo(): Repository {
  assertSafeConfig();
  if (config.backend === "supabase") return (supa ??= new SupabaseRepository());
  return (local ??= new LocalRepository());
}

export type { Repository } from "./types";
