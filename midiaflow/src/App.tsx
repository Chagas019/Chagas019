import { useEffect, useState, type ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'sonner';
import { MotionConfig } from 'framer-motion';
import { Layout } from './components/layout/Layout';
import { ScheduleDetailProvider } from './components/schedule/ScheduleDetail';
import { ScheduleEditorProvider } from './components/schedule/ScheduleEditor';
import { Skeleton } from './components/ui';
import { PeriodProvider } from './lib/period';
import { StoreProvider } from './lib/store';
import { supabase } from './lib/supabase';
import CalendarPage from './pages/CalendarPage';
import Dashboard from './pages/Dashboard';
import Events from './pages/Events';
import Login from './pages/Login';
import MySchedules from './pages/MySchedules';
import Notifications from './pages/Notifications';
import Reports from './pages/Reports';
import Roles from './pages/Roles';
import Schedules from './pages/Schedules';
import Settings from './pages/Settings';
import Team from './pages/Team';
import Training from './pages/Training';

/** Com Supabase configurado, exige sessão válida. Sem ele, abre a demonstração. */
function AuthGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<'loading' | 'in' | 'out'>(supabase ? 'loading' : 'in');
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setState(data.session ? 'in' : 'out'));
    const { data } = supabase.auth.onAuthStateChange((_e, session) => setState(session ? 'in' : 'out'));
    return () => data.subscription.unsubscribe();
  }, []);
  if (state === 'loading')
    return (
      <div className="mx-auto max-w-5xl space-y-4 p-8">
        <Skeleton className="h-40" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}</div>
        <Skeleton className="h-72" />
      </div>
    );
  if (state === 'out') return <Login />;
  return <>{children}</>;
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <BrowserRouter>
        <AuthGate>
          <StoreProvider>
            <PeriodProvider>
              <ScheduleEditorProvider>
                <ScheduleDetailProvider>
                  <Routes>
                    <Route element={<Layout />}>
                      <Route index element={<Dashboard />} />
                      <Route path="minhas-escalas" element={<MySchedules />} />
                      <Route path="escalas" element={<Schedules />} />
                      <Route path="calendario" element={<CalendarPage />} />
                      <Route path="equipe" element={<Team />} />
                      <Route path="funcoes" element={<Roles />} />
                      <Route path="eventos" element={<Events />} />
                      <Route path="formacao" element={<Training />} />
                      <Route path="formacao/:moduleId" element={<Training />} />
                      <Route path="formacao/:moduleId/:lessonId" element={<Training />} />
                      <Route path="relatorios" element={<Reports />} />
                      <Route path="notificacoes" element={<Notifications />} />
                      <Route path="configuracoes" element={<Settings />} />
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Route>
                  </Routes>
                </ScheduleDetailProvider>
              </ScheduleEditorProvider>
            </PeriodProvider>
          </StoreProvider>
        </AuthGate>
      </BrowserRouter>
      <Toaster theme="dark" position="top-center" richColors closeButton toastOptions={{ style: { background: '#10151D', border: '1px solid #252F3C', borderRadius: 16 } }} />
    </MotionConfig>
  );
}
