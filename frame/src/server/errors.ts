export type ErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "UNAVAILABLE";

const defaultMessages: Record<ErrorCode, string> = {
  UNAUTHORIZED: "Entre na sua conta para continuar.",
  FORBIDDEN: "Você não tem permissão para fazer isso.",
  NOT_FOUND: "Não encontramos o que você procurava.",
  VALIDATION: "Revise os dados informados.",
  CONFLICT: "Isso já existe.",
  RATE_LIMITED: "Muitas tentativas em pouco tempo. Aguarde um instante e tente de novo.",
  UNAVAILABLE: "Este recurso ainda não está configurado.",
};

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message?: string,
    public readonly fields?: Record<string, string>,
  ) {
    super(message ?? defaultMessages[code]);
    this.name = "AppError";
  }
}

export type ActionResult<T = undefined> =
  | { ok: true; data: T; message?: string }
  | { ok: false; code: ErrorCode | "INTERNAL"; error: string; fields?: Record<string, string> };

/** Converte qualquer erro em resposta segura para o cliente (sem vazar detalhes internos). */
export function toActionError(err: unknown): Extract<ActionResult, { ok: false }> {
  if (err instanceof AppError) return { ok: false, code: err.code, error: err.message, fields: err.fields };
  console.error("[frame] erro inesperado", err);
  return { ok: false, code: "INTERNAL", error: "Algo deu errado do nosso lado. Tente novamente." };
}

export function httpStatus(code: ErrorCode | "INTERNAL"): number {
  return (
    { UNAUTHORIZED: 401, FORBIDDEN: 403, NOT_FOUND: 404, VALIDATION: 400, CONFLICT: 409, RATE_LIMITED: 429, UNAVAILABLE: 503, INTERNAL: 500 } as const
  )[code];
}
