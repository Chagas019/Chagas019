import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Expand } from 'lucide-react';
import type { Media } from '@/types/property';
import { Modal } from '@/components/ui/Modal';
import { Picture } from '@/components/ui/Picture';

/** Galeria em mosaico + visualizador em tela cheia (setas do teclado e gesto de arrastar no celular) */
export function Gallery({ items, title }: { items: Media[]; title: string }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <>
      <ul className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
        {items.map((m, i) => (
          <li key={m.src + i} className={i === 0 ? 'col-span-2 row-span-2' : ''}>
            <button type="button" onClick={() => setOpen(i)} className="group relative block h-full w-full overflow-hidden rounded-lg" aria-label={`Ampliar foto ${i + 1} de ${items.length}: ${m.alt}`}>
              <Picture media={m} className={i === 0 ? 'aspect-[4/3] h-full' : 'aspect-[4/3]'} imgClassName="transition duration-700 ease-arch group-hover:scale-105" sizes={i === 0 ? '(min-width: 768px) 50vw, 100vw' : '(min-width: 768px) 25vw, 50vw'} />
              <span className="absolute right-2 top-2 rounded bg-ink/60 p-1.5 text-paper opacity-0 backdrop-blur transition group-hover:opacity-100 group-focus-visible:opacity-100"><Expand size={14} /></span>
            </button>
          </li>
        ))}
      </ul>
      {items[0]?.caption && <p className="mt-3 font-mono text-[11px] uppercase tracking-wider text-muted">{items[0].caption}</p>}
      <Lightbox items={items} index={open} onIndex={setOpen} title={title} />
    </>
  );
}

export function Lightbox({ items, index, onIndex, title }: { items: Media[]; index: number | null; onIndex: (i: number | null) => void; title: string }) {
  const [dir, setDir] = useState(0);
  const go = useCallback((d: number) => {
    if (index === null) return;
    setDir(d);
    onIndex((index + d + items.length) % items.length);
  }, [index, items.length, onIndex]);
  useEffect(() => {
    if (index === null) return;
    const k = (e: KeyboardEvent) => { if (e.key === 'ArrowRight') go(1); if (e.key === 'ArrowLeft') go(-1); };
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, [index, go]);
  const m = index !== null ? items[index] : null;
  return (
    <Modal open={index !== null} onClose={() => onIndex(null)} title={`${title} — galeria`} size="full" hideTitle>
      {m && (
        <div className="flex h-full min-h-[60vh] flex-col bg-ink">
          <div className="relative flex-1 overflow-hidden">
            <AnimatePresence initial={false} custom={dir} mode="popLayout">
              <motion.img
                key={m.src}
                src={m.src}
                alt={m.alt}
                custom={dir}
                initial={{ opacity: 0, x: dir * 60 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: dir * -60 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.4}
                onDragEnd={(_, info) => { if (info.offset.x < -60) go(1); else if (info.offset.x > 60) go(-1); }}
                className="absolute inset-0 m-auto h-full w-full cursor-grab touch-pan-y object-contain active:cursor-grabbing"
              />
            </AnimatePresence>
            {items.length > 1 && (
              <>
                <button type="button" onClick={() => go(-1)} className="btn-icon absolute left-3 top-1/2 -translate-y-1/2 border-white/15 bg-ink/60 text-paper" aria-label="Foto anterior"><ChevronLeft size={20} /></button>
                <button type="button" onClick={() => go(1)} className="btn-icon absolute right-3 top-1/2 -translate-y-1/2 border-white/15 bg-ink/60 text-paper" aria-label="Próxima foto"><ChevronRight size={20} /></button>
              </>
            )}
          </div>
          <div className="flex items-center justify-between gap-4 border-t border-white/10 px-5 py-3 text-sm text-paper/80">
            <p className="min-w-0 truncate">{m.alt}{m.caption ? <span className="text-mist"> · {m.caption}</span> : null}</p>
            <p className="shrink-0 font-mono text-xs text-mist" aria-live="polite">{index! + 1} / {items.length}</p>
          </div>
        </div>
      )}
    </Modal>
  );
}
