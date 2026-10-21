import { AnimatePresence, motion } from 'framer-motion';
import { Scale, X } from 'lucide-react';
import { useLocation } from 'react-router';
import { TLink } from '@/components/ui/TLink';
import { COMPARE_MAX, useCollections } from '@/hooks/useCollections';
import { useProperties } from '@/hooks/useData';

/** Barra flutuante com os imóveis escolhidos para comparar */
export function CompareBar() {
  const { compare, toggleCompare, clearCompare } = useCollections();
  const { data } = useProperties();
  const { pathname } = useLocation();
  const items = compare.map((id) => data?.find((p) => p.id === id)).filter(Boolean);
  const show = items.length > 0 && pathname !== '/comparar' && !pathname.startsWith('/imovel/');
  return (
    <AnimatePresence>
      {show && (
        <motion.aside aria-label="Imóveis para comparar" initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }} className="fixed inset-x-3 bottom-3 z-[70] mx-auto flex max-w-2xl items-center gap-3 rounded-xl border border-white/10 bg-navy/95 p-2.5 pl-4 text-paper shadow-float backdrop-blur md:bottom-6">
          <Scale size={18} className="shrink-0 text-signal-soft" />
          <ul className="flex min-w-0 flex-1 gap-2 overflow-x-auto no-scrollbar">
            {items.map((p) => (
              <li key={p!.id} className="flex shrink-0 items-center gap-2 rounded-lg border border-white/10 bg-white/5 py-1 pl-1 pr-1.5">
                <img src={p!.cover.thumb ?? p!.cover.src} alt="" width={40} height={28} className="h-7 w-10 rounded object-cover" />
                <span className="max-w-[9rem] truncate text-xs">{p!.name}</span>
                <button type="button" onClick={() => toggleCompare(p!.id)} className="rounded p-1 text-mist hover:text-paper" aria-label={`Remover ${p!.name} da comparação`}><X size={13} /></button>
              </li>
            ))}
          </ul>
          <span className="hidden font-mono text-[11px] text-mist sm:inline">{items.length}/{COMPARE_MAX}</span>
          <button type="button" onClick={clearCompare} className="hidden text-xs text-mist hover:text-paper sm:inline">Limpar</button>
          <TLink to="/comparar" className="btn-primary min-h-[40px] shrink-0 px-4">Comparar</TLink>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
