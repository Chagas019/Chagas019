import { Heart } from 'lucide-react';
import { motion } from 'framer-motion';
import { useCollections } from '@/hooks/useCollections';

export function FavoriteButton({ id, name, variant = 'overlay', className = '' }: { id: string; name: string; variant?: 'overlay' | 'ghost'; className?: string }) {
  const { isFavorite, toggleFavorite } = useCollections();
  const on = isFavorite(id);
  const base = variant === 'overlay' ? 'h-10 w-10 border-white/15 bg-ink/45 text-paper backdrop-blur-md hover:bg-ink/70' : 'min-h-[44px] gap-2 px-4 text-sm hairline hover:bg-fg/5';
  return (
    <button
      type="button"
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFavorite(id, name); }}
      aria-pressed={on}
      aria-label={on ? `Remover ${name} dos favoritos` : `Favoritar ${name}`}
      className={`inline-flex items-center justify-center rounded border transition ${base} ${className}`}
    >
      <motion.span key={String(on)} initial={{ scale: 0.6 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 18 }} className="inline-flex">
        <Heart size={17} className={on ? 'fill-signal text-signal' : ''} />
      </motion.span>
      {variant === 'ghost' && <span>{on ? 'Favoritado' : 'Favoritar'}</span>}
    </button>
  );
}
