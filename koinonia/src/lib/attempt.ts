/** Executa uma busca e devolve sucesso/erro sem lançar — permite renderizar estados de erro fora do try/catch. */
export async function attempt<T>(fn: () => Promise<T>): Promise<{ ok: true; data: T } | { ok: false }> {
  try {
    return { ok: true, data: await fn() };
  } catch (error) {
    const e = error as { code?: string; message?: string };
    console.error("[data]", e.code ?? "error", (e.message ?? String(error)).slice(0, 200));
    return { ok: false };
  }
}
