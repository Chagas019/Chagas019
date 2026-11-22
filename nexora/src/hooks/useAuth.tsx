/**
 * Autenticação. Com Supabase: Supabase Auth + papel lido de public.profiles (o banco decide o acesso).
 * Sem Supabase: não existe login real; o painel pode ser aberto em "modo demonstração", que só mexe em
 * dados deste navegador — nada privado existe para proteger nesse modo.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export type Role = 'visitante' | 'cliente' | 'corretor' | 'admin';
interface AuthUser { id: string; email: string; name: string }
interface AuthState {
  user: AuthUser | null;
  role: Role;
  isStaff: boolean;
  loading: boolean;
  /** true quando o painel está aberto no modo demonstração (sem Supabase) */
  demoStaff: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<{ needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
  enterDemoStaff: () => void;
}

const Ctx = createContext<AuthState | null>(null);
const DEMO_STAFF_KEY = 'nexora:demo-staff';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [role, setRole] = useState<Role>('visitante');
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [demoStaff, setDemoStaff] = useState(() => {
    try { return !isSupabaseConfigured && sessionStorage.getItem(DEMO_STAFF_KEY) === '1'; } catch { return false; }
  });

  const loadRole = useCallback(async (id: string) => {
    if (!supabase) return;
    const { data } = await supabase.from('profiles').select('role').eq('id', id).maybeSingle();
    setRole((data?.role as Role) ?? 'cliente');
  }, []);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(async ({ data }) => {
      const u = data.session?.user;
      if (u) { setUser({ id: u.id, email: u.email ?? '', name: (u.user_metadata?.full_name as string) ?? '' }); await loadRole(u.id); }
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const u = session?.user;
      if (u) { setUser({ id: u.id, email: u.email ?? '', name: (u.user_metadata?.full_name as string) ?? '' }); void loadRole(u.id); }
      else { setUser(null); setRole('visitante'); }
    });
    return () => sub.subscription.unsubscribe();
  }, [loadRole]);

  const value = useMemo<AuthState>(() => ({
    user,
    role: demoStaff ? 'admin' : role,
    isStaff: demoStaff || role === 'corretor' || role === 'admin',
    loading,
    demoStaff,
    async signIn(email, password) {
      if (!supabase) throw new Error('Login indisponível: o Supabase não está configurado nesta instalação.');
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message.includes('Invalid') ? 'E-mail ou senha incorretos.' : 'Não foi possível entrar agora.');
    },
    async signUp(email, password, name) {
      if (!supabase) throw new Error('Cadastro indisponível: o Supabase não está configurado nesta instalação.');
      const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name }, emailRedirectTo: `${location.origin}/entrar` } });
      if (error) throw new Error(error.message.includes('registered') ? 'Este e-mail já tem cadastro.' : 'Não foi possível criar a conta.');
      return { needsConfirmation: !data.session };
    },
    async signOut() {
      try { sessionStorage.removeItem(DEMO_STAFF_KEY); } catch { /* sem armazenamento */ }
      setDemoStaff(false);
      if (supabase) await supabase.auth.signOut();
    },
    enterDemoStaff() {
      if (isSupabaseConfigured) return; // com backend real, só o banco concede acesso
      try { sessionStorage.setItem(DEMO_STAFF_KEY, '1'); } catch { /* sem armazenamento */ }
      setDemoStaff(true);
    },
  }), [user, role, loading, demoStaff]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth fora do AuthProvider');
  return v;
}
