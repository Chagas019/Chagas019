/** Integração ausente/indisponível — nunca é substituída por dados simulados. */
export class IntegrationUnavailableError extends Error {
  constructor(public integration: string, message: string) {
    super(`[${integration}] ${message}`);
    this.name = 'IntegrationUnavailableError';
  }
}

/** Erro que não adianta tentar de novo (ex.: permissão negada, mídia inválida). */
export class PermanentError extends Error {
  constructor(message: string, public details?: unknown) {
    super(message);
    this.name = 'PermanentError';
  }
}

export class GraphApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: number,
    public subcode?: number,
    public type?: string,
    public fbtraceId?: string,
  ) {
    super(message);
    this.name = 'GraphApiError';
  }
  /** Erros transitórios documentados pela Meta: 1, 2, 4, 17, 32, 341, 613, 5xx, ou is_transient. */
  get retryable(): boolean {
    if (this.status >= 500) return true;
    return [1, 2, 4, 17, 32, 341, 613, 9007].includes(this.code ?? -1);
  }
}

export function isRetryable(err: unknown): boolean {
  if (err instanceof PermanentError) return false;
  if (err instanceof IntegrationUnavailableError) return true; // pode voltar
  if (err instanceof GraphApiError) return err.retryable;
  return true;
}
