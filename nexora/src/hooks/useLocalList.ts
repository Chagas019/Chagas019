import { useCallback, useEffect, useState } from 'react';
import { readJSON, writeJSON } from '@/lib/storage';

/** Lista persistida no localStorage e sincronizada entre abas e componentes */
export function useLocalList(key: string, max = 50) {
  const [list, setList] = useState<string[]>(() => readJSON<string[]>(key, []));
  useEffect(() => {
    const sync = () => setList(readJSON<string[]>(key, []));
    const onStorage = (e: StorageEvent) => { if (e.key === key) sync(); };
    const onLocal = (e: Event) => { if ((e as CustomEvent).detail === key) sync(); };
    window.addEventListener('storage', onStorage);
    window.addEventListener('nexora:storage', onLocal);
    return () => { window.removeEventListener('storage', onStorage); window.removeEventListener('nexora:storage', onLocal); };
  }, [key]);
  const set = useCallback((next: string[]) => { writeJSON(key, next.slice(0, max)); }, [key, max]);
  return [list, set] as const;
}
