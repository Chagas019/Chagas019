import { logEvent } from "./core";
import { kv } from "./kv";
import { getSettings, updateSettings } from "./settings";

/**
 * Circuit breaker de publicação.
 * Falhas consecutivas (envio, perda de conexão, inconsistência de preço) >= limite
 * => publicação suspensa automaticamente (publishingPaused=true) até reset manual.
 */
const KEY = "oferta:cb:publish:failures";

export type FailureKind = "send_error" | "connection_lost" | "price_inconsistency" | "permission_denied";

export async function recordFailure(kind: FailureKind, detail: string): Promise<{ tripped: boolean; count: number }> {
  const count = await kv().incr(KEY);
  const s = await getSettings();
  if (count >= s.circuitBreakerThreshold && !s.publishingPaused) {
    const reason = `Circuit breaker: ${count} falhas consecutivas (última: ${kind} — ${detail})`;
    await updateSettings({ publishingPaused: true, publishingPausedReason: reason }, "circuit-breaker");
    await logEvent("error", "circuit-breaker", reason, { kind, count });
    return { tripped: true, count };
  }
  await logEvent("warn", "circuit-breaker", `falha registrada (${count}/${s.circuitBreakerThreshold})`, { kind, detail });
  return { tripped: false, count };
}

export async function recordSuccess(): Promise<void> {
  await kv().set(KEY, "0");
}

export async function failureCount(): Promise<number> {
  return Number((await kv().get(KEY)) ?? 0);
}

export async function reset(by: string): Promise<void> {
  await kv().set(KEY, "0");
  await updateSettings({ publishingPaused: false, publishingPausedReason: null }, by);
  await logEvent("info", "circuit-breaker", `circuit breaker reiniciado por ${by}`);
}
