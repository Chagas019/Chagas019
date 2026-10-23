'use client';

import { DEFAULT_PREFERENCES, parsePreferences, type StreamPreferences } from '@nexus/core';
import { useCallback, useSyncExternalStore } from 'react';

/**
 * Armazenamento local do aparelho (Fase 2).
 *
 * Favoritos, histórico e preferências ficam apenas neste navegador; nada é
 * enviado a servidor. Na Fase 3, favoritos e histórico passam para a conta
 * do usuário (PostgreSQL) e o armazenamento local vira cache.
 *
 * Toda leitura passa por um validador: dados corrompidos, de outra versão
 * ou bloqueados (modo privado) caem nos valores padrão sem quebrar a tela.
 */

const PREFIX = 'nexus:v1:';
const EVENT = 'nexus-storage';

function read(key: string): unknown {
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    return raw === null ? undefined : JSON.parse(raw);
  } catch {
    return undefined;
  }
}

function write(key: string, value: unknown) {
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Armazenamento cheio ou bloqueado: a preferência vale só nesta visita.
  }
  cache.delete(key);
  window.dispatchEvent(new CustomEvent(EVENT, { detail: key }));
}

function subscribe(onChange: () => void) {
  const handler = (e: Event) => {
    if (e instanceof StorageEvent) cache.clear();
    onChange();
  };
  window.addEventListener(EVENT, handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener(EVENT, handler);
    window.removeEventListener('storage', handler);
  };
}

/** Snapshots estáveis por chave, exigidos pelo useSyncExternalStore. */
const cache = new Map<string, unknown>();

function useStored<T>(key: string, parse: (v: unknown) => T, fallback: T): [T, (next: T) => void] {
  const getSnapshot = useCallback(() => {
    if (!cache.has(key)) cache.set(key, parse(read(key)));
    return cache.get(key) as T;
  }, [key, parse]);
  const value = useSyncExternalStore(subscribe, getSnapshot, () => fallback);
  const set = useCallback((next: T) => write(key, next), [key]);
  return [value, set];
}

const MAX_RECENT = 12;
const SLUG = /^[a-z0-9-]{1,40}$/;
const EMPTY: string[] = [];

function parseSlugList(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((s): s is string => typeof s === 'string' && SLUG.test(s)).slice(0, 200) : EMPTY;
}

export function useFavorites() {
  const [list, set] = useStored('favorites', parseSlugList, EMPTY);
  const toggle = useCallback(
    (slug: string) => set(list.includes(slug) ? list.filter((s) => s !== slug) : [slug, ...list]),
    [list, set],
  );
  return { favorites: list, isFavorite: (slug: string) => list.includes(slug), toggle };
}

export function useRecent() {
  const [list, set] = useStored('recent', parseSlugList, EMPTY);
  const push = useCallback(
    (slug: string) => {
      const current = parseSlugList(read('recent'));
      if (current[0] === slug) return;
      set([slug, ...current.filter((s) => s !== slug)].slice(0, MAX_RECENT));
    },
    [set],
  );
  const clear = useCallback(() => set([]), [set]);
  return { recent: list, push, clear };
}

export function usePreferences(): [StreamPreferences, (patch: Partial<StreamPreferences>) => void] {
  const [prefs, set] = useStored('preferences', parsePreferences, DEFAULT_PREFERENCES);
  const update = useCallback((patch: Partial<StreamPreferences>) => set({ ...prefs, ...patch }), [prefs, set]);
  return [prefs, update];
}
