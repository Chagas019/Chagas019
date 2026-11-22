/**
 * Cache mínimo de consultas (sem dependência externa): deduplica requisições, guarda o último resultado
 * e permite invalidar depois de uma escrita no painel.
 */
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

interface Entry<T> { data?: T; error?: Error; promise?: Promise<T>; at: number }
const cache = new Map<string, Entry<unknown>>();
const listeners = new Set<() => void>();
let version = 0;
const emit = () => { version++; listeners.forEach((l) => l()); };

export function invalidate(prefix: string) {
  for (const k of cache.keys()) if (k.startsWith(prefix)) cache.delete(k);
  emit();
}

function load<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const e = cache.get(key) as Entry<T> | undefined;
  if (e?.promise) return e.promise;
  const promise = fn().then(
    (data) => { cache.set(key, { data, at: Date.now() }); emit(); return data; },
    (error: unknown) => { cache.set(key, { error: error instanceof Error ? error : new Error(String(error)), at: Date.now() }); emit(); throw error; },
  );
  cache.set(key, { ...(e ?? { at: 0 }), promise });
  return promise;
}

export function useQuery<T>(key: string | null, fn: () => Promise<T>) {
  useSyncExternalStore((cb) => { listeners.add(cb); return () => listeners.delete(cb); }, () => version);
  const entry = key ? (cache.get(key) as Entry<T> | undefined) : undefined;
  const [, force] = useState(0);
  useEffect(() => {
    if (!key) return;
    const e = cache.get(key);
    if (!e || (!('data' in e) && !e.error && !e.promise)) load(key, fn).catch(() => undefined);
    // fn muda a cada render; a chave identifica a consulta
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, version]);
  const retry = useCallback(() => { if (key) { cache.delete(key); force((n) => n + 1); emit(); } }, [key]);
  return {
    data: entry?.data,
    error: entry?.error,
    loading: !!key && entry?.data === undefined && !entry?.error,
    retry,
  };
}
