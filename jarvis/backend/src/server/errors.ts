export type ErrorCode =
  | "bad_request" | "unauthorized" | "forbidden" | "not_found" | "rate_limited"
  | "budget_exceeded" | "provider_unavailable" | "internal";

/** Erro de aplicação com status HTTP e code do contrato. */
export class AppError extends Error {
  constructor(public readonly status: number, public readonly code: ErrorCode, message: string) {
    super(message);
  }
}

/** Nenhum provedor de IA configurado (orquestrador devolve provider "none"). */
export class ProviderUnavailableError extends AppError {
  constructor(message = "Nenhum provedor de IA configurado.") {
    super(503, "provider_unavailable", message);
  }
}

export const notFound = (what = "Recurso") => new AppError(404, "not_found", `${what} não encontrado.`);
export const badRequest = (msg: string) => new AppError(400, "bad_request", msg);
