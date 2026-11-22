/**
 * Favoritos, comparação e histórico de visualização.
 * Favoritos: guardados no navegador (funcionam para visitantes e sobrevivem ao recarregar) e, com login,
 * sincronizados com a tabela public.favorites — os locais são enviados para a conta ao entrar.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import { useLocalList } from './useLocalList';
import { useToast } from './useToast';
import { getConsent } from '@/components/layout/CookieConsent';

export const COMPARE_MAX = 3;

interface Collections {
  favorites: string[];
  isFavorite: (id: string) => boolean;
  toggleFavorite: (id: string, name?: string) => void;
  compare: string[];
  inCompare: (id: string) => boolean;
  toggleCompare: (id: string, name?: string) => void;
  clearCompare: () => void;
  recent: string[];
  addRecent: (id: string) => void;
  clearRecent: () => void;
  synced: boolean;
}

const Ctx = createContext<Collections | null>(null);

export function CollectionsProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useLocalList('nexora:favorites', 200);
  const [compare, setCompare] = useLocalList('nexora:compare', COMPARE_MAX);
  const [recent, setRecent] = useLocalList('nexora:recent', 12);
  const { user } = useAuth();
  const toast = useToast();

  // Ao entrar: une os favoritos locais com os da conta
  useEffect(() => {
    if (!supabase || !user) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.from('favorites').select('property_id');
      if (error || cancelled) return;
      const remote = (data ?? []).map((r) => String(r.property_id));
      const local = favorites.filter((id) => !remote.includes(id));
      if (local.length) await supabase.from('favorites').upsert(local.map((property_id) => ({ property_id })));
      setFavorites([...new Set([...remote, ...favorites])]);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const toggleFavorite = useCallback((id: string, name?: string) => {
    const has = favorites.includes(id);
    setFavorites(has ? favorites.filter((f) => f !== id) : [id, ...favorites]);
    toast.show(has ? 'Removido dos favoritos' : 'Salvo nos favoritos', { description: name, action: has ? undefined : { label: 'Ver favoritos', href: '/favoritos' } });
    if (supabase && user) {
      const q = has ? supabase.from('favorites').delete().eq('property_id', id) : supabase.from('favorites').upsert({ property_id: id });
      q.then(({ error }) => { if (error) toast.show('Não foi possível sincronizar com a sua conta', { tone: 'error' }); });
    }
  }, [favorites, setFavorites, toast, user]);

  const toggleCompare = useCallback((id: string, name?: string) => {
    if (compare.includes(id)) { setCompare(compare.filter((c) => c !== id)); return; }
    if (compare.length >= COMPARE_MAX) {
      toast.show(`Compare até ${COMPARE_MAX} imóveis`, { description: 'Remova um da comparação para adicionar outro.', tone: 'error', action: { label: 'Abrir comparação', href: '/comparar' } });
      return;
    }
    setCompare([...compare, id]);
    toast.show('Adicionado à comparação', { description: name, action: { label: 'Comparar', href: '/comparar' } });
  }, [compare, setCompare, toast]);

  const value = useMemo<Collections>(() => ({
    favorites,
    isFavorite: (id) => favorites.includes(id),
    toggleFavorite,
    compare,
    inCompare: (id) => compare.includes(id),
    toggleCompare,
    clearCompare: () => setCompare([]),
    recent,
    addRecent: (id) => { if (getConsent().history) setRecent([id, ...recent.filter((r) => r !== id)]); },
    clearRecent: () => setRecent([]),
    synced: !!(supabase && user),
  }), [favorites, toggleFavorite, compare, toggleCompare, setCompare, recent, setRecent, user]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCollections() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useCollections fora do provider');
  return v;
}
