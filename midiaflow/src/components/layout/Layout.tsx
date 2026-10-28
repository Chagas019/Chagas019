import { AnimatePresence, motion } from 'framer-motion';
import {
  Bell, CalendarDays, Cloud, CloudOff, GraduationCap, Loader2, ChevronDown, ClipboardList, FileBarChart, LayoutGrid, LogOut, Menu, Plus, Search, Settings, Shapes, Sparkles, Ticket, UserCheck, Users, X,
  type LucideIcon,
} from 'lucide-react';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { PERIODS, usePeriod, type PeriodKey } from '@/lib/period';
import { ACCESS_LABEL, useStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { cn, fmtDateShort } from '@/lib/utils';
import { useScheduleEditor } from '../schedule/ScheduleEditor';
import { useScheduleDetail } from '../schedule/ScheduleDetail';
import { Avatar, Badge, Button, Skeleton } from '../ui';
import { Logo } from './Logo';

type NavItem = { to: string; label: string; icon: LucideIcon; end?: boolean; staffOnly?: boolean };
export const NAV: NavItem[] = [
  { to: '/', label: 'Visão geral', icon: LayoutGrid, end: true },
  { to: '/minhas-escalas', label: 'Minhas escalas', icon: UserCheck },
  { to: '/escalas', label: 'Escalas', icon: ClipboardList },
  { to: '/calendario', label: 'Calendário', icon: CalendarDays },
  { to: '/equipe', label: 'Equipe', icon: Users, staffOnly: true },
  { to: '/funcoes', label: 'Funções', icon: Shapes },
  { to: '/eventos', label: 'Eventos', icon: Ticket },
  { to: '/formacao', label: 'Formação', icon: GraduationCap },
  { to: '/relatorios', label: 'Relatórios', icon: FileBarChart, staffOnly: true },
  { to: '/notificacoes', label: 'Notificações', icon: Bell },
  { to: '/configuracoes', label: 'Configurações', icon: Settings },
];

function useNav() {
  const { can } = useStore();
  return NAV.filter((n) => !n.staffOnly || can('manage:team'));
}

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const items = useNav();
  const unread = useStore().notifications.filter((n) => !n.read).length;
  return (
    <nav aria-label="Navegação principal" className="flex flex-col gap-0.5">
      {items.map((n) => (
        <NavLink key={n.to} to={n.to} end={n.end} onClick={onNavigate} className="group relative">
          {({ isActive }) => (
            <span className={cn('relative flex h-11 items-center gap-3 rounded-2xl px-3.5 text-sm transition-colors', isActive ? 'text-ink' : 'text-ink-muted hover:bg-white/[0.03] hover:text-ink')}>
              {isActive && (
                <motion.span layoutId="nav-active" className="absolute inset-0 rounded-2xl border border-neon/20 bg-gradient-to-r from-neon/[0.12] to-electric/[0.04]" transition={{ type: 'spring', stiffness: 420, damping: 36 }} />
              )}
              {isActive && <motion.span layoutId="nav-bar" className="absolute -left-3 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-neon shadow-[0_0_12px_#5BFF9A]" />}
              <n.icon className={cn('relative h-[18px] w-[18px]', isActive && 'text-neon')} />
              <span className="relative font-medium">{n.label}</span>
              {n.to === '/notificacoes' && unread > 0 && (
                <span className="relative ml-auto rounded-full bg-neon px-1.5 text-[11px] font-bold text-bg">{unread}</span>
              )}
            </span>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

function Sidebar() {
  const { parish } = useStore();
  return (
    <aside className="no-print fixed inset-y-3 left-3 z-30 hidden w-[252px] flex-col rounded-[28px] border border-white/[0.07] bg-white/[0.025] px-5 py-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-2xl backdrop-saturate-150 lg:flex">
      <Logo />
      <div className="mt-8 flex-1 overflow-y-auto pr-1">
        <SidebarNav />
      </div>
      <div className="glass mt-4 rounded-2xl p-4">
        <p className="text-xs text-ink-muted">Paróquia</p>
        <p className="mt-0.5 text-sm font-semibold">{parish.name}</p>
        <p className="text-xs text-ink-muted">{parish.pascomName}</p>
      </div>
    </aside>
  );
}

function GlobalSearch() {
  const { schedules, members, events, can } = useStore();
  const detail = useScheduleDetail();
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement))) {
        e.preventDefault();
        ref.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const results = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (t.length < 2) return [];
    const out: { key: string; label: string; meta: string; go: () => void }[] = [];
    schedules.filter((s) => s.title.toLowerCase().includes(t)).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5)
      .forEach((s) => out.push({ key: s.id, label: s.title, meta: `Escala · ${fmtDateShort(s.date)} ${s.start}`, go: () => detail.open(s.id) }));
    events.filter((e) => e.title.toLowerCase().includes(t)).slice(0, 3)
      .forEach((e) => out.push({ key: e.id, label: e.title, meta: `Evento · ${fmtDateShort(e.date)}`, go: () => nav('/eventos') }));
    if (can('manage:team'))
      members.filter((m) => m.name.toLowerCase().includes(t)).slice(0, 4)
        .forEach((m) => out.push({ key: m.id, label: m.name, meta: 'Integrante', go: () => nav(`/equipe?q=${encodeURIComponent(m.name)}`) }));
    return out;
  }, [q, schedules, events, members, can, detail, nav]);

  return (
    <div className="relative w-full max-w-md">
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
      <input
        ref={ref}
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Buscar escalas, eventos, pessoas…"
        aria-label="Busca"
        className="input h-10 rounded-full pl-10 pr-12"
      />
      <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-md border border-line px-1.5 text-[10px] text-ink-muted sm:block">⌘K</kbd>
      <AnimatePresence>
        {open && q.trim().length >= 2 && (
          <motion.ul
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            className="absolute left-0 right-0 top-12 z-40 overflow-hidden rounded-2xl border border-line bg-card p-1.5 shadow-2xl"
          >
            {results.length === 0 && <li className="px-3 py-3 text-sm text-ink-muted">Nada encontrado para “{q}”.</li>}
            {results.map((r) => (
              <li key={r.key}>
                <button className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-white/5" onMouseDown={(e) => e.preventDefault()} onClick={() => { r.go(); setOpen(false); setQ(''); }}>
                  <span className="truncate">{r.label}</span>
                  <span className="shrink-0 text-xs text-ink-muted">{r.meta}</span>
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

function NotificationsMenu() {
  const { notifications, markAllRead } = useStore();
  const [open, setOpen] = useState(false);
  const nav = useNavigate();
  const detail = useScheduleDetail();
  const unread = notifications.filter((n) => !n.read).length;
  return (
    <div className="relative">
      <Button size="icon" variant="ghost" aria-label={`Notificações (${unread} não lidas)`} onClick={() => setOpen((o) => !o)} className="glass relative">
        <Bell className="h-[18px] w-[18px]" />
        {unread > 0 && <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-neon shadow-[0_0_8px_#5BFF9A]" />}
      </Button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
            <motion.div initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6 }}
              className="absolute right-0 top-12 z-40 mt-2 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-3xl border border-line bg-card shadow-2xl">
              <div className="flex items-center justify-between border-b border-line/60 px-4 py-3">
                <p className="text-sm font-semibold">Notificações</p>
                {unread > 0 && <button className="text-xs text-neon hover:underline" onClick={markAllRead}>Marcar todas como lidas</button>}
              </div>
              <ul className="max-h-80 overflow-y-auto p-1.5">
                {notifications.slice(0, 6).map((n) => (
                  <li key={n.id}>
                    <button className="flex w-full gap-3 rounded-2xl px-3 py-2.5 text-left hover:bg-white/5" onClick={() => { setOpen(false); if (n.scheduleId) detail.open(n.scheduleId); else nav('/notificacoes'); }}>
                      <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', n.read ? 'bg-line' : n.kind === 'recusa' || n.kind === 'substituicao' ? 'bg-danger' : 'bg-neon')} />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium">{n.title}</span>
                        <span className="line-clamp-2 block text-xs text-ink-muted">{n.body}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              <button className="w-full border-t border-line/60 py-3 text-center text-xs text-ink-muted hover:text-ink" onClick={() => { setOpen(false); nav('/notificacoes'); }}>Ver todas</button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function ProfileMenu() {
  const { me, members, switchUser, parish, mode } = useStore();
  const [open, setOpen] = useState(false);
  const demoUsers = [members.find((m) => m.access === 'admin'), members.find((m) => m.access === 'coordenador'), ...members.filter((m) => m.access === 'integrante' && m.status === 'ativo').slice(0, 3)].filter(Boolean);
  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} className="glass flex items-center gap-2.5 rounded-full border border-white/[0.07] py-1 pl-1 pr-3 transition-colors hover:bg-white/[0.06]" aria-haspopup="menu" aria-expanded={open} aria-label={`Perfil: ${me.name}`}>
        <Avatar name={me.name} size={32} />
        <span className="hidden text-left leading-tight md:block">
          <span className="block max-w-[140px] truncate text-[13px] font-medium">{me.name}</span>
          <span className="block text-[11px] text-ink-muted">{ACCESS_LABEL[me.access]}</span>
        </span>
        <ChevronDown className="h-4 w-4 text-ink-muted" />
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
            <motion.div role="menu" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
              className="absolute right-0 z-40 mt-2 w-72 rounded-3xl border border-line bg-card p-2 shadow-2xl">
              <div className="px-3 py-2">
                <p className="text-sm font-semibold">{me.name}</p>
                <p className="text-xs text-ink-muted">{parish.name}</p>
              </div>
              {mode === 'demo' && (
                <>
                  <p className="mt-1 border-t border-line/60 px-3 pb-1 pt-3 text-[11px] uppercase tracking-wider text-ink-muted">Demonstração · ver como</p>
                  {demoUsers.map((m) => m && (
                    <button key={m.id} role="menuitem" onClick={() => { switchUser(m.id); setOpen(false); }}
                      className={cn('flex w-full items-center gap-2.5 rounded-2xl px-3 py-2 text-left text-sm hover:bg-white/5', m.id === me.id && 'bg-neon/[0.06]')}>
                      <Avatar name={m.name} size={26} />
                      <span className="min-w-0 flex-1 truncate">{m.name}</span>
                      <Badge tone={m.access === 'admin' ? 'electric' : m.access === 'coordenador' ? 'neon' : 'muted'}>{ACCESS_LABEL[m.access]}</Badge>
                    </button>
                  ))}
                </>
              )}
              {mode === 'remote' && supabase && (
                <button role="menuitem" onClick={() => supabase?.auth.signOut()} className="mt-1 flex w-full items-center gap-2.5 rounded-2xl border-t border-line/60 px-3 py-2.5 text-left text-sm text-danger hover:bg-white/5">
                  <LogOut className="h-4 w-4" />Sair
                </button>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function Header({ onMenu }: { onMenu: () => void }) {
  const { period, setPeriod } = usePeriod();
  const { can, parish } = useStore();
  const editor = useScheduleEditor();
  return (
    <header className="no-print sticky top-0 z-20 border-b border-white/[0.05] bg-bg/40 backdrop-blur-2xl backdrop-saturate-150">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
        <button className="rounded-full p-2 text-ink-muted hover:bg-white/5 hover:text-ink lg:hidden" onClick={onMenu} aria-label="Abrir menu">
          <Menu className="h-5 w-5" />
        </button>
        <div className="lg:hidden"><Logo compact /></div>
        <div className="hidden flex-1 md:block"><GlobalSearch /></div>
        <div className="ml-auto flex items-center gap-2">
          <span className="hidden text-xs text-ink-muted xl:block">{parish.name}</span>
          <select aria-label="Período" value={period} onChange={(e) => setPeriod(e.target.value as PeriodKey)}
            className="glass hidden h-10 rounded-full border border-white/[0.07] px-3 text-[13px] text-ink sm:block [&>option]:bg-[#10151D]">
            {PERIODS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
          {can('manage:schedules') && (
            <Button variant="primary" size="sm" icon={Plus} className="hidden h-10 sm:inline-flex" onClick={() => editor.open()}>Criar escala</Button>
          )}
          <SyncBadge />
          <NotificationsMenu />
          <ProfileMenu />
        </div>
      </div>
      <div className="px-4 pb-3 md:hidden"><GlobalSearch /></div>
    </header>
  );
}

function MobileDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.aside
            className="fixed inset-y-0 left-0 z-50 flex w-[86%] max-w-[320px] flex-col border-r border-white/10 bg-bg/60 px-5 py-6 backdrop-blur-2xl backdrop-saturate-150 lg:hidden"
            initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'spring', stiffness: 380, damping: 38 }}
          >
            <div className="mb-8 flex items-center justify-between">
              <Logo />
              <button onClick={onClose} className="rounded-full p-2 text-ink-muted hover:bg-white/5" aria-label="Fechar menu"><X className="h-5 w-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto"><SidebarNav onNavigate={onClose} /></div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

/** Barra inferior no celular, inspirada em apps nativos. */
function BottomBar() {
  const { can } = useStore();
  const editor = useScheduleEditor();
  const items: NavItem[] = [
    { to: '/', label: 'Início', icon: LayoutGrid, end: true },
    { to: '/escalas', label: 'Escalas', icon: ClipboardList },
    { to: '/calendario', label: 'Agenda', icon: CalendarDays },
    { to: '/minhas-escalas', label: 'Minhas', icon: UserCheck },
  ];
  return (
    <nav aria-label="Navegação rápida" className="no-print fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-30 rounded-[28px] border border-white/10 bg-bg/45 shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_20px_40px_-12px_rgba(0,0,0,0.8)] backdrop-blur-2xl backdrop-saturate-150 lg:hidden">
      <div className="relative mx-auto grid max-w-lg grid-cols-5">
        {items.slice(0, 2).map((n) => <BottomLink key={n.to} n={n} />)}
        <div className="flex items-center justify-center">
          {can('manage:schedules') ? (
            <button onClick={() => editor.open()} aria-label="Criar escala" className="-mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-flow text-bg shadow-glow transition-transform active:scale-95">
              <Plus className="h-6 w-6" />
            </button>
          ) : (
            <NavLink to="/notificacoes" className="flex h-16 flex-col items-center justify-center gap-1 text-[11px] text-ink-muted"><Bell className="h-5 w-5" />Avisos</NavLink>
          )}
        </div>
        {items.slice(2).map((n) => <BottomLink key={n.to} n={n} />)}
      </div>
    </nav>
  );
}

function BottomLink({ n }: { n: NavItem }) {
  return (
    <NavLink to={n.to} end={n.end} className="relative flex h-16 flex-col items-center justify-center gap-1 text-[11px]">
      {({ isActive }) => (
        <>
          {isActive && <motion.span layoutId="bottom-active" className="absolute inset-x-1.5 inset-y-1.5 rounded-[22px] bg-white/[0.07] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]" />}
          <n.icon className={cn('relative h-5 w-5', isActive ? 'text-neon' : 'text-ink-muted')} />
          <span className={cn('relative', isActive ? 'font-medium text-neon' : 'text-ink-muted')}>{n.label}</span>
        </>
      )}
    </NavLink>
  );
}

function DemoBanner() {
  const { mode } = useStore();
  if (mode === 'remote') return null;
  return (
    <div className="no-print flex items-center justify-center gap-2 border-b border-electric/20 bg-electric/[0.06] px-4 py-1.5 text-center text-[12px] text-electric">
      <Sparkles className="h-3.5 w-3.5 shrink-0" />
      <span>Modo demonstração: dados fictícios salvos apenas neste navegador. Nada é enviado a servidores.</span>
    </div>
  );
}

/** Mostra se as alterações já foram gravadas no banco. */
function SyncBadge() {
  const { sync, mode } = useStore();
  if (mode !== 'remote') return null;
  const map = {
    saved: { label: 'Salvo', cls: 'text-neon', Icon: Cloud },
    saving: { label: 'Salvando…', cls: 'text-ink-muted', Icon: Loader2 },
    error: { label: 'Não salvo', cls: 'text-danger', Icon: CloudOff },
    demo: { label: '', cls: '', Icon: Cloud },
  } as const;
  const m = map[sync];
  return (
    <span role="status" aria-live="polite" className={cn('hidden items-center gap-1.5 text-xs sm:flex', m.cls)} title={sync === 'error' ? 'Verifique a internet. Vamos tentar de novo.' : undefined}>
      <m.Icon className={cn('h-3.5 w-3.5', sync === 'saving' && 'animate-spin')} />
      {m.label}
    </span>
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Carregando">
      <Skeleton className="h-10 w-56" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}</div>
      <Skeleton className="h-64" />
    </div>
  );
}

export function Layout() {
  const [drawer, setDrawer] = useState(false);
  const loc = useLocation();
  useEffect(() => { window.scrollTo({ top: 0 }); }, [loc.pathname]);
  return (
    <div className="ambient min-h-dvh">
      <Sidebar />
      <MobileDrawer open={drawer} onClose={() => setDrawer(false)} />
      <div className="relative z-10 lg:pl-[276px]">
        <DemoBanner />
        <Header onMenu={() => setDrawer(true)} />
        <main id="conteudo" className="print-full mx-auto max-w-[1400px] px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-12">
          <AnimatePresence mode="wait">
            <motion.div key={loc.pathname} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}>
              <Suspense fallback={<PageSkeleton />}>
                <Outlet />
              </Suspense>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      <BottomBar />
    </div>
  );
}
