import { useCallback, useEffect, useState } from 'react';
import { msUntilNextDay, todayISO } from './lib/dates';
import { fetchLectio, type Liturgia } from './lib/lectio';

export function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? initial : (JSON.parse(raw) as T);
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* modo privado: fica só na memória */
    }
  }, [key, value]);
  return [value, setValue] as const;
}

/** Data de hoje (Brasília) que vira sozinha à meia-noite e ao voltar para a aba. */
export function useToday(): string {
  const [today, setToday] = useState(todayISO);
  useEffect(() => {
    const check = () => setToday(todayISO());
    let timer = window.setTimeout(function tick() {
      check();
      timer = window.setTimeout(tick, msUntilNextDay());
    }, msUntilNextDay());
    const onVisible = () => document.visibilityState === 'visible' && check();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', check);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', check);
    };
  }, []);
  return today;
}

type State = { status: 'loading' } | { status: 'ok'; data: Liturgia } | { status: 'error'; error: string };

export function useLectio(iso: string) {
  const [state, setState] = useState<State>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let alive = true;
    setState({ status: 'loading' });
    fetchLectio(iso)
      .then((data) => alive && setState({ status: 'ok', data }))
      .catch((e) => alive && setState({ status: 'error', error: String(e?.message || e) }));
    return () => {
      alive = false;
    };
  }, [iso, attempt]);
  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { ...state, retry };
}
