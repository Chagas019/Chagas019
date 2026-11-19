"use client";
import { useCallback, useEffect, useRef, useState } from "react";

export class ApiError extends Error {
  constructor(message: string, public status: number, public body: unknown) {
    super(message);
  }
}

export async function api<T = any>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const r = await fetch(`/api/proxy/${path.replace(/^\//, "")}`, {
    method: opts.method ?? "GET",
    headers: { "Content-Type": "application/json" },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    cache: "no-store",
  });
  const text = await r.text();
  const data = text ? JSON.parse(text) : null;
  if (r.status === 401 && typeof window !== "undefined") window.location.href = "/login";
  if (!r.ok) throw new ApiError(data?.error ?? `HTTP ${r.status}`, r.status, data);
  return data as T;
}

/** Busca com atualização periódica (tempo real por polling). */
export function usePoll<T = any>(path: string | null, intervalMs = 5000) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const pathRef = useRef(path);
  pathRef.current = path;

  const load = useCallback(async () => {
    if (!pathRef.current) return;
    try {
      const d = await api<T>(pathRef.current);
      setData(d);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    load();
    if (!intervalMs) return;
    const t = setInterval(load, intervalMs);
    return () => clearInterval(t);
  }, [path, intervalMs, load]);

  return { data, error, loading, reload: load };
}

export const brl = (v: number | string | null | undefined) =>
  v === null || v === undefined || v === "" ? "—" : Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const fmtDate = (d: string | Date | null | undefined) =>
  d ? new Date(d).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—";

export const fmtNum = (v: number | null | undefined) => (v === null || v === undefined ? "—" : v.toLocaleString("pt-BR"));
