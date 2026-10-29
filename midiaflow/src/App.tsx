import { MotionConfig } from 'framer-motion';
import { Component, lazy, Suspense, useCallback, useEffect, useRef, useState, type ErrorInfo, type ReactNode } from 'react';
import { BrowserRouter, Link, Route, Routes, useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';
import { Layout } from './components/layout/Layout';
import { ScheduleDetailProvider } from './components/schedule/ScheduleDetail';
import { ScheduleEditorProvider } from './components/schedule/ScheduleEditor';
import { Button, Skeleton } from './components/ui';
import { PeriodProvider } from './lib/period';
import { fetchParish, fetchProfile } from './lib/remote';
import { StoreProvider, type RemoteSession } from './lib/store';
import { supabase } from './lib/supabase';
import Dashboard from './pages/Dashboard';
import Login, { NewPassword, Onboarding, rememberInviteFromUrl } from './pages/Login';
import Setup from './pages/Setup';

// Páginas carregadas sob demanda: o primeiro acesso fica mais leve.
const MySchedules = lazy(() => import('./pages/MySchedules'));
const Schedules = lazy(() => import('./pages/Schedules'));
const CalendarPage = lazy(() => import('./pages/CalendarPage'));
const Team = lazy(() => import('./pages/Team'));
const Roles = lazy(() => import('./pages/Roles'));
const Events = lazy(() => import('./pages/Events'));
const Training = lazy(() => import('./pages/Training'));
const Reports = lazy(() => import('./pages/Reports'));
const Notifications = lazy(() => import('./pages/Notifications'));
const Settings = lazy(() => import('./pages/Settings'));
const Servo = lazy(() => import('./pages/Servo'));
const BoardPage = lazy(() => import('./pages/Board'));

const TITLES: Record<string, string> = {
  '': 'Visão geral', 'minhas-escalas': 'Minhas escalas', escalas: 'Escalas', calendario: 'Calendário', quadro: 'Quadro de tarefas', equipe: 'Equipe',
  funcoes: 'Funções', eventos: 'Eventos', formacao: 'Formação', relatorios: 'Relatórios', notificacoes: 'Notificações', configuracoes: 'Configurações',
};

function PageTitle() {
  const { pathname } = useLocation();
  useEffect(() => {
    const t = TITLES[pathname.split('/')[1] ?? ''];
    document.title = t ? `${t} · MídiaFlow` : 'MídiaFlow — Escalas da PASCOM';
  }, [pathname]);
  return null;
}

export function PageLoading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Carregando">
      <Skeleton className="h-10 w-56" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}</div>
      <Skeleton className="h-64" />
    </div>
  );
}

function FullLoading() {
  return (
    <div className="ambient mx-auto max-w-5xl space-y-4 p-8">
      <PageLoading />
    </div>
  );
}

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('MídiaFlow: erro na tela', error, info.componentStack);
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="ambient flex min-h-dvh items-center justify-center p-6">
        <div className="card relative z-10 max-w-md p-8 text-center">
          <p className="text-lg font-semibold">Algo deu errado nesta tela</p>
          <p className="mt-2 text-sm text-ink-muted">Seus dados estão seguros. Recarregue a página para continuar.</p>
          <Button className="mt-6" variant="primary" onClick={() => location.reload()}>Recarregar</Button>
        </div>
      </div>
    );
  }
}

function NotFound() {
  return (
    <div className="flex flex-col items-center py-20 text-center">
      <p className="text-gradient text-6xl font-bold">404</p>
      <p className="mt-3 text-lg font-semibold">Página não encontrada</p>
      <p className="mt-1 text-sm text-ink-muted">O endereço pode ter mudado.</p>
      <Link to="/" className="mt-6"><Button variant="primary">Voltar para o início</Button></Link>
    </div>
  );
}

function AppRoutes() {
  return (
    <ScheduleEditorProvider>
      <ScheduleDetailProvider>
        <PageTitle />
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="minhas-escalas" element={<MySchedules />} />
            <Route path="escalas" element={<Schedules />} />
            <Route path="calendario" element={<CalendarPage />} />
            <Route path="quadro" element={<BoardPage />} />
            <Route path="equipe" element={<Team />} />
            <Route path="funcoes" element={<Roles />} />
            <Route path="eventos" element={<Events />} />
            <Route path="formacao" element={<Training />} />
            <Route path="formacao/:moduleId" element={<Training />} />
            <Route path="formacao/:moduleId/:lessonId" element={<Training />} />
            <Route path="relatorios" element={<Reports />} />
            <Route path="notificacoes" element={<Notifications />} />
            <Route path="configuracoes" element={<Settings />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </ScheduleDetailProvider>
    </ScheduleEditorProvider>
  );
}

type GateState =
  | { s: 'loading' }
  | { s: 'out' }
  | { s: 'recovery' }
  | { s: 'onboarding'; email: string; name: string }
  | { s: 'ready'; session: RemoteSession }
  | { s: 'error'; message: string };

/** Com Supabase configurado: login real, vínculo com a paróquia e dados do banco. */
function RemoteApp() {
  const [state, setState] = useState<GateState>({ s: 'loading' });
  const stateRef = useRef(state);
  stateRef.current = state;

  const load = useCallback(async () => {
    if (!supabase) return;
    const { data } = await supabase.auth.getSession();
    const user = data.session?.user;
    if (!user) return setState({ s: 'out' });
    try {
      const profile = await fetchProfile();
      if (!profile) return setState({ s: 'onboarding', email: user.email ?? '', name: (user.user_metadata?.full_name as string) ?? (user.user_metadata?.name as string) ?? '' });
      const initial = await fetchParish(profile);
      setState({ s: 'ready', session: { profile, initial } });
    } catch (e) {
      setState({ s: 'error', message: (e as Error).message });
    }
  }, []);

  useEffect(() => {
    rememberInviteFromUrl();
    if (!supabase) return;
    void load();
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setState({ s: 'recovery' });
      else if (event === 'SIGNED_OUT') setState({ s: 'out' });
      else if (event === 'SIGNED_IN' && stateRef.current.s === 'out') {
        setState({ s: 'loading' });
        void load();
      }
    });
    return () => data.subscription.unsubscribe();
  }, [load]);

  switch (state.s) {
    case 'loading':
      return <FullLoading />;
    case 'out':
      return <Login />;
    case 'recovery':
      return <NewPassword onDone={() => { setState({ s: 'loading' }); void load(); }} />;
    case 'onboarding':
      return <Onboarding email={state.email} defaultName={state.name} onDone={() => { setState({ s: 'loading' }); void load(); }} />;
    case 'error':
      return (
        <div className="ambient flex min-h-dvh items-center justify-center p-6">
          <div className="card relative z-10 max-w-md p-8 text-center">
            <p className="text-lg font-semibold">Não foi possível carregar</p>
            <p className="mt-2 text-sm text-ink-muted">{state.message}</p>
            <div className="mt-6 flex justify-center gap-2">
              <Button variant="primary" onClick={() => { setState({ s: 'loading' }); void load(); }}>Tentar de novo</Button>
              <Button onClick={() => supabase?.auth.signOut()}>Sair</Button>
            </div>
          </div>
        </div>
      );
    case 'ready':
      return (
        <StoreProvider key={state.session.profile.id} remote={state.session}>
          <PeriodProvider>
            <AppRoutes />
          </PeriodProvider>
        </StoreProvider>
      );
  }
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <ErrorBoundary>
        <BrowserRouter>
          <Suspense fallback={<FullLoading />}>
            <Routes>
              {/* Tela do servo: abre pelo link da coordenação, sem cadastro e sem login. */}
              <Route path="/servo" element={<Servo />} />
              <Route
                path="*"
                element={
                  supabase ? (
                    <RemoteApp />
                  ) : (
                    <StoreProvider setup={(done) => <Setup onDone={done} />}>
                      <PeriodProvider>
                        <AppRoutes />
                      </PeriodProvider>
                    </StoreProvider>
                  )
                }
              />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </ErrorBoundary>
      <Toaster theme="dark" position="top-center" richColors closeButton toastOptions={{ style: { background: '#10151D', border: '1px solid #252F3C', borderRadius: 16 } }} />
    </MotionConfig>
  );
}

