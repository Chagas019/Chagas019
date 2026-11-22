import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';

interface Props { open: boolean; onClose: () => void; title: string; children: ReactNode; size?: 'md' | 'lg' | 'full'; description?: string; hideTitle?: boolean }

/** Diálogo acessível: foco preso dentro, Esc fecha, devolve o foco a quem abriu, rolagem do fundo bloqueada. */
export function Modal({ open, onClose, title, children, size = 'md', description, hideTitle }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const t = setTimeout(() => ref.current?.querySelector<HTMLElement>('[data-autofocus], button, [href], input, select, textarea')?.focus(), 30);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); }
      if (e.key !== 'Tab' || !ref.current) return;
      const els = [...ref.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])')].filter((el) => el.offsetParent !== null);
      if (!els.length) return;
      const first = els[0], last = els[els.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => { clearTimeout(t); document.removeEventListener('keydown', onKey); document.body.style.overflow = overflow; prev?.focus?.(); };
  }, [open, onClose]);

  const sizes = { md: 'max-w-lg', lg: 'max-w-3xl', full: 'max-w-none h-full sm:h-[calc(100%-3rem)] sm:max-w-[min(1400px,calc(100%-3rem))]' };
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-ink/80 backdrop-blur-sm" onClick={onClose} aria-hidden />
          <motion.div
            ref={ref}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${id}-t`}
            aria-describedby={description ? `${id}-d` : undefined}
            className={`relative flex max-h-full w-full flex-col overflow-hidden rounded-t-xl border border-white/10 bg-navy text-paper shadow-float sm:rounded-xl ${sizes[size]}`}
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className={`flex items-start justify-between gap-4 px-5 pt-5 ${hideTitle ? 'absolute right-0 top-0 z-10' : 'pb-3'}`}>
              <div className={hideTitle ? 'sr-only' : ''}>
                <h2 id={`${id}-t`} className="text-lg font-medium tracking-tight">{title}</h2>
                {description && <p id={`${id}-d`} className="mt-1 text-sm text-mist">{description}</p>}
              </div>
              <button type="button" onClick={onClose} className="btn-icon shrink-0" aria-label="Fechar"><X size={18} /></button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
