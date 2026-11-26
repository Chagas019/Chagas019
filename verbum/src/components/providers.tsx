"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { supabaseConfigured } from "@/lib/public-env";
import { localStore } from "@/lib/store/local";
import { cloudStore } from "@/lib/store/cloud";
import type { SavedItem, SavedKind, VerbumStore } from "@/lib/store/types";

type Ctx = {
  user: User | null;
  authReady: boolean;
  supabaseConfigured: boolean;
  store: VerbumStore;
  savedKeys: Set<string>;
  isSaved: (kind: SavedKind, refId: string) => boolean;
  toggleSaved: (item: Omit<SavedItem, "id" | "created_at">) => Promise<boolean>;
  refreshSaved: () => Promise<void>;
  toast: (msg: string) => void;
  signOut: () => Promise<void>;
};

const AppContext = createContext<Ctx | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const sb = getBrowserSupabase();
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(!sb);
  const [savedKeys, setSavedKeys] = useState<Set<string>>(new Set());
  const [toasts, setToasts] = useState<{ id: number; msg: string }[]>([]);

  useEffect(() => {
    if (!sb) return;
    sb.auth.getUser().then(({ data }) => { setUser(data.user); setAuthReady(true); });
    const { data } = sb.auth.onAuthStateChange((_e, session) => setUser(session?.user ?? null));
    return () => data.subscription.unsubscribe();
  }, [sb]);

  const store = useMemo<VerbumStore>(() => (sb && user ? cloudStore(sb) : localStore), [sb, user]);

  const refreshSaved = useCallback(async () => {
    try {
      const list = await store.listSaved();
      setSavedKeys(new Set(list.map((s) => `${s.kind}:${s.ref_id}`)));
    } catch { /* sem conexão: mantém estado */ }
  }, [store]);

  useEffect(() => { if (authReady) refreshSaved(); }, [authReady, refreshSaved]);

  const toast = useCallback((msg: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  const toggleSaved = useCallback(async (item: Omit<SavedItem, "id" | "created_at">) => {
    const key = `${item.kind}:${item.ref_id}`;
    try {
      if (savedKeys.has(key)) {
        await store.unsave(item.kind, item.ref_id);
        setSavedKeys((s) => { const n = new Set(s); n.delete(key); return n; });
        toast("Removido do Meu Espaço");
        return false;
      }
      await store.save(item);
      setSavedKeys((s) => new Set(s).add(key));
      toast(store.mode === "nuvem" ? "Salvo no Meu Espaço" : "Salvo neste navegador");
      return true;
    } catch (e) {
      toast(`Não foi possível salvar: ${(e as Error).message}`);
      return savedKeys.has(key);
    }
  }, [savedKeys, store, toast]);

  const signOut = useCallback(async () => {
    await sb?.auth.signOut();
    setUser(null);
    toast("Você saiu da sua conta");
  }, [sb, toast]);

  const value: Ctx = {
    user, authReady, supabaseConfigured, store, savedKeys,
    isSaved: (k, r) => savedKeys.has(`${k}:${r}`),
    toggleSaved, refreshSaved, toast, signOut,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4 print:hidden">
        {toasts.map((t) => (
          <div key={t.id} className="animate-fade-up rounded-full bg-royal-900 px-5 py-2.5 text-sm text-ivory-50 shadow-lift">{t.msg}</div>
        ))}
      </div>
    </AppContext.Provider>
  );
}

export function useApp() {
  const c = useContext(AppContext);
  if (!c) throw new Error("useApp fora do AppProvider");
  return c;
}
