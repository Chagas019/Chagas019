import { useEffect, useState } from 'react';
import { useLocation } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import { Heart, Menu, X, Scale, User } from 'lucide-react';
import { TLink, TNavLink } from '@/components/ui/TLink';
import { useCollections } from '@/hooks/useCollections';
import { useAuth } from '@/hooks/useAuth';
import { Logo } from './Logo';

const NAV = [
  { to: '/imoveis', label: 'Imóveis' },
  { to: '/imoveis?finalidade=aluguel', label: 'Alugar' },
  { to: '/experiencia-3d', label: 'Experiência 3D' },
  { to: '/sobre', label: 'Como funciona' },
  { to: '/contato', label: 'Contato' },
];

export function Header({ overlay = false }: { overlay?: boolean }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { favorites, compare } = useCollections();
  const { user, isStaff } = useAuth();
  const { pathname, search } = useLocation();

  useEffect(() => setOpen(false), [pathname, search]);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', k);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', k); document.body.style.overflow = ''; };
  }, [open]);

  const solid = scrolled || !overlay || open;
  return (
    <header className={`fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-500 ${solid ? 'border-b border-white/[0.07] bg-ink/80 backdrop-blur-xl' : 'border-b border-transparent bg-transparent'}`} style={{ viewTransitionName: 'site-header' }}>
      <div className="container flex h-[var(--header-h)] items-center justify-between gap-6 text-paper">
        <TLink to="/" className="rounded" aria-label="NEXORA Real Estate — página inicial"><Logo /></TLink>
        <nav aria-label="Principal" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {NAV.map((n) => (
              <li key={n.to}>
                <TNavLink to={n.to} end className={({ isActive }) => `rounded px-3 py-2 text-[13.5px] transition hover:text-paper ${isActive && !n.to.includes('?') ? 'text-paper' : 'text-paper/65'}`}>{n.label}</TNavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex items-center gap-1.5">
          <TLink to="/comparar" className="relative hidden h-10 items-center gap-2 rounded px-3 text-[13px] text-paper/75 hover:text-paper sm:inline-flex" aria-label={`Comparar imóveis (${compare.length} selecionados)`}>
            <Scale size={16} /> <span className="hidden xl:inline">Comparar</span>
            {compare.length > 0 && <Count n={compare.length} />}
          </TLink>
          <TLink to="/favoritos" className="relative inline-flex h-10 items-center gap-2 rounded px-3 text-[13px] text-paper/75 hover:text-paper" aria-label={`Favoritos (${favorites.length})`}>
            <Heart size={16} /> <span className="hidden xl:inline">Favoritos</span>
            {favorites.length > 0 && <Count n={favorites.length} />}
          </TLink>
          <TLink to={isStaff ? '/admin' : '/entrar'} className="hidden h-10 items-center gap-2 rounded px-3 text-[13px] text-paper/75 hover:text-paper md:inline-flex">
            <User size={16} /> <span className="hidden xl:inline">{isStaff ? 'Painel' : user ? 'Minha conta' : 'Entrar'}</span>
            <span className="sr-only xl:hidden">{isStaff ? 'Painel' : user ? 'Minha conta' : 'Entrar'}</span>
          </TLink>
          <TLink to="/imoveis" className="btn-light ml-2 hidden min-h-[40px] px-4 text-[13px] md:inline-flex">Buscar imóveis</TLink>
          <button type="button" className="btn-icon ml-1 border-white/10 bg-white/5 lg:hidden" aria-expanded={open} aria-controls="menu-mobile" onClick={() => setOpen((v) => !v)} aria-label={open ? 'Fechar menu' : 'Abrir menu'}>
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>
      <AnimatePresence>
        {open && (
          <motion.nav id="menu-mobile" aria-label="Menu" className="fixed inset-x-0 bottom-0 top-[var(--header-h)] z-40 overflow-y-auto bg-ink lg:hidden" initial={{ clipPath: 'inset(0 0 100% 0)' }} animate={{ clipPath: 'inset(0 0 0% 0)' }} exit={{ clipPath: 'inset(0 0 100% 0)' }} transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}>
            <div className="container blueprint-grid flex min-h-full flex-col py-8">
              <ul className="space-y-1">
                {[...NAV, { to: '/favoritos', label: `Favoritos (${favorites.length})` }, { to: '/comparar', label: `Comparar (${compare.length})` }, { to: isStaff ? '/admin' : '/entrar', label: isStaff ? 'Painel' : user ? 'Minha conta' : 'Entrar' }].map((n, i) => (
                  <motion.li key={n.to + n.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 + i * 0.04, duration: 0.5 }}>
                    <TLink to={n.to} className="flex min-h-[56px] items-center justify-between border-b border-white/[0.07] text-2xl font-medium tracking-tight text-paper">
                      {n.label}
                      <span className="font-mono text-[11px] text-mist">0{i + 1}</span>
                    </TLink>
                  </motion.li>
                ))}
              </ul>
              <TLink to="/imoveis" className="btn-primary mt-8 w-full">Buscar imóveis</TLink>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}

const Count = ({ n }: { n: number }) => <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-signal px-1 font-mono text-[10px] text-white">{n}</span>;
