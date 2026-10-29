import "server-only";
import { toActionError, type ActionResult } from "../errors";

/** Envelope padrão das Server Actions: nunca lança para o cliente, sempre retorna ActionResult. */
export async function run<T>(fn: () => Promise<T>, message?: string): Promise<ActionResult<T>> {
  try {
    const data = await fn();
    return { ok: true, data, message };
  } catch (err) {
    return toActionError(err);
  }
}
