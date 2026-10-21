import { Suspense } from 'react';
import { NavLink, Outlet, ScrollRestoration } from 'react-router';
import { Building2, ExternalLink, FileText, Inbox, LayoutDashboard, LogOut } from 'lucide-react';
import { Logo } from '@/components/layout/Logo';
import { Toaster } from '@/components/ui/Toaster';
import { PageFallback } from '@/components/layout/PageFallback';
import { useAuth } from '@/hooks/useAuth';
import { useSeo } from '@/hooks/useSeo';

const NAV = [
  { to: '/admin', label: 'Visão geral', Icon: LayoutDashboard, end: true },
  { to: '/admin/imoveis', label: 'Imóveis', Icon: Building2 },
  { to: '/admin/contatos', label: 'Contatos e visitas', Icon: Inbox },
  { to: '/admin/conteudo', label: 'Conteúdo do site', Icon: FileText },
];

export default function AdminLayout() {
  const { user, demoStaff, role, signOut } = useAuth();
  useSeo({ title: 'Painel | NEXORA', description: 'Painel administrativo', path: '/admin', noindex: true });
  return (
    <div className="min-h-screen bg-ink text-paper md:grid md:grid-cols-[240px_1fr]">
      <aside className="border-b border-white/10 md:sticky md:top-0 md:h-screen md:border-b-0 md:border-r">
        <div className="flex items-center justify-between p-5 md:block">
          <a href="/" aria-label="Ir para o site"><Logo /></a>
          <p className="font-mono text-[10px] uppercase tracking-widest text-mist md:mt-2">Painel · {role}</p>
        </div>
        <nav aria-label="Painel" className="no-scrollbar flex gap-1 overflow-x-auto px-3 pb-3 md:block md:space-y-1 md:px-3">
          {NAV.map(({ to, label, Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `flex min-h-[42px] shrink-0 items-center gap-3 rounded px-3 text-sm transition ${isActive ? 'bg-white/10 text-paper' : 'text-paper/65 hover:bg-white/5 hover:text-paper'}`}>
              <Icon size={16} /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="hidden space-y-1 border-t border-white/10 p-3 md:absolute md:bottom-0 md:left-0 md:right-0 md:block">
          <a href="/" className="flex min-h-[40px] items-center gap-3 rounded px-3 text-sm text-paper/65 hover:text-paper"><ExternalLink size={15} /> Ver site</a>
          <button type="button" onClick={signOut} className="flex min-h-[40px] w-full items-center gap-3 rounded px-3 text-sm text-paper/65 hover:text-paper"><LogOut size={15} /> Sair{user ? ` (${user.email})` : ''}</button>
        </div>
      </aside>
      <div className="min-w-0">
        {demoStaff && (
          <p className="border-b border-warning/30 bg-warning/10 px-5 py-2.5 text-[13px] text-paper/90" role="note">
            <strong className="font-medium">Modo demonstração:</strong> o Supabase não está configurado. As alterações ficam só neste navegador e você pode desfazê-las em “Visão geral”.
          </p>
        )}
        <main className="p-5 md:p-8">
          <Suspense fallback={<PageFallback />}><Outlet /></Suspense>
        </main>
      </div>
      <Toaster />
      <ScrollRestoration />
    </div>
  );
}
