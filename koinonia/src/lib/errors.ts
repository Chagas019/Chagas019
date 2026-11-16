import "server-only";
import type { ZodError } from "zod";
import type { Messages } from "@/i18n/types";
import { t } from "@/i18n/format";
import type { ActionState, FieldErrors } from "./action-state";

/** Resolve uma chave "namespace.chave" do dicionário; devolve a própria chave se não existir. */
export function resolveMessage(m: Messages, key: string, vars?: Record<string, string | number>): string {
  const value = key.split(".").reduce<unknown>((acc, part) => (acc && typeof acc === "object" ? (acc as Record<string, unknown>)[part] : undefined), m);
  return typeof value === "string" ? t(value, vars) : key;
}

export function zodToFieldErrors(error: ZodError, m: Messages): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? "form");
    if (out[field]) continue;
    const vars: Record<string, number> = {};
    if ("maximum" in issue && typeof issue.maximum === "number") vars.max = issue.maximum;
    if ("minimum" in issue && typeof issue.minimum === "number") vars.min = issue.minimum;
    out[field] = issue.message.includes(".") ? resolveMessage(m, issue.message, vars) : resolveMessage(m, "validation.required");
  }
  return out;
}

export function validationError(error: ZodError, m: Messages, values?: ActionState["values"]): ActionState {
  return { status: "error", message: m.errors.validation, fieldErrors: zodToFieldErrors(error, m), values };
}

interface DbErrorLike { code?: string; message?: string }

/** Traduz erros do Postgres/PostgREST para mensagens seguras (sem vazar detalhes internos). */
export function dbErrorMessage(error: DbErrorLike, m: Messages): string {
  const msg = error.message ?? "";
  if (error.code === "P0429" || msg.includes("rate_limited")) return m.errors.rateLimited;
  if (msg.includes("community must be verified")) return m.errors.communityNotVerified;
  if (msg.includes("opportunity is not open")) return m.errors.opportunityClosed;
  if (error.code === "23505") return msg.includes("slug") ? m.errors.slugTaken : m.errors.duplicate;
  if (error.code === "42501" || msg.includes("row-level security")) return m.errors.forbidden;
  if (error.code === "PGRST116" || error.code === "P0002") return m.errors.notFound;
  console.error("[db]", error.code ?? "unknown", msg.slice(0, 200));
  return m.errors.generic;
}

export function dbError(error: DbErrorLike, m: Messages, values?: ActionState["values"]): ActionState {
  return { status: "error", message: dbErrorMessage(error, m), values };
}
