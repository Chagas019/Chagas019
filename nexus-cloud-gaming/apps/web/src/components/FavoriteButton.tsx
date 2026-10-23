'use client';

import { Heart } from 'lucide-react';
import { useFavorites } from '@/lib/storage';

export function FavoriteButton({ slug, name, variant = 'icon' }: { slug: string; name: string; variant?: 'icon' | 'full' }) {
  const { isFavorite, toggle } = useFavorites();
  const active = isFavorite(slug);
  const label = active ? `Remover ${name} dos favoritos` : `Adicionar ${name} aos favoritos`;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(slug);
      }}
      aria-pressed={active}
      aria-label={variant === 'icon' ? label : undefined}
      title={label}
      className={
        variant === 'icon'
          ? 'grid h-11 w-11 place-items-center rounded-full border border-white/15 bg-black/45 backdrop-blur-md transition hover:bg-black/70'
          : 'btn btn-ghost'
      }
    >
      <Heart className={`h-5 w-5 transition ${active ? 'fill-[#f472b6] text-[#f472b6]' : 'text-white'}`} aria-hidden="true" />
      {variant === 'full' && (active ? 'Favorito' : 'Favoritar')}
    </button>
  );
}
