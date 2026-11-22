import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { TLink } from './TLink';

export function Toaster() {
  const { items, dismiss } = useToast();
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] z-[90] flex flex-col items-center gap-2 px-4 md:bottom-6 md:items-end md:px-6" role="region" aria-label="Notificações">
      <AnimatePresence initial={false}>
        {items.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8 }}
            role={t.tone === 'error' ? 'alert' : 'status'}
            className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border border-white/10 bg-navy/95 p-3.5 text-paper shadow-float backdrop-blur"
          >
            {t.tone === 'error' ? <TriangleAlert size={18} className="mt-0.5 shrink-0 text-danger" /> : t.tone === 'success' ? <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-success" /> : <Info size={18} className="mt-0.5 shrink-0 text-signal-soft" />}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{t.title}</p>
              {t.description && <p className="mt-0.5 truncate text-xs text-mist">{t.description}</p>}
              {t.action && (t.action.href ? (
                <TLink to={t.action.href} className="mt-1.5 inline-block text-xs font-medium text-signal-soft underline-offset-4 hover:underline" onClick={() => dismiss(t.id)}>{t.action.label}</TLink>
              ) : (
                <button type="button" className="mt-1.5 text-xs font-medium text-signal-soft" onClick={() => { t.action?.onClick?.(); dismiss(t.id); }}>{t.action.label}</button>
              ))}
            </div>
            <button type="button" onClick={() => dismiss(t.id)} className="-m-1 rounded p-1 text-mist hover:text-paper" aria-label="Fechar notificação"><X size={14} /></button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
