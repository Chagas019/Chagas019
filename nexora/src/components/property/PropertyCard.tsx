import { Box, Scale } from 'lucide-react';
import type { Property } from '@/types/property';
import { TLink } from '@/components/ui/TLink';
import { Picture } from '@/components/ui/Picture';
import { formatPrice, isNew, location, TYPE_LABEL } from '@/lib/format';
import { useCollections } from '@/hooks/useCollections';
import { FavoriteButton } from './FavoriteButton';
import { Specs } from './Specs';

const TAG_LABEL = { lancamento: 'Lançamento', exclusivo: 'Exclusivo' } as const;

export function PropertyTags({ p }: { p: Property }) {
  const tags = [...p.tags.map((t) => TAG_LABEL[t]), ...(isNew(p) ? ['Recém-adicionado'] : [])];
  return (
    <>
      {tags.map((t) => <span key={t} className="chip border-white/20 bg-ink/50 text-paper backdrop-blur-md">{t}</span>)}
      {p.demo && <span className="chip border-white/20 bg-ink/50 text-paper/80 backdrop-blur-md">Demonstração</span>}
    </>
  );
}

/** Card de imóvel. A imagem tem view-transition-name igual à capa da página de detalhes (elemento compartilhado). */
export function PropertyCard({ p, size = 'md', priority = false }: { p: Property; size?: 'md' | 'lg' | 'wide'; priority?: boolean }) {
  const { inCompare, toggleCompare } = useCollections();
  const ratio = size === 'lg' ? 'aspect-[4/5] md:aspect-[5/6]' : size === 'wide' ? 'aspect-[16/10]' : 'aspect-[4/3]';
  return (
    <article className="group relative">
      <TLink to={`/imovel/${p.slug}`} className="block rounded-lg" aria-label={`${p.name}, ${TYPE_LABEL[p.type]} em ${location(p)}, ${formatPrice(p)}`}>
        <div className={`relative overflow-hidden rounded-lg ${ratio}`}>
          <Picture
            media={p.cover}
            className="absolute inset-0"
            imgClassName="transition-transform duration-[1.2s] ease-arch group-hover:scale-[1.04]"
            sizes={size === 'lg' ? '(min-width: 1024px) 50vw, 100vw' : '(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw'}
            priority={priority}
            style={{ viewTransitionName: `capa-${p.slug}` }}
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/70 via-transparent to-ink/20" />
          <div className="absolute left-3 top-3 flex flex-wrap gap-1.5"><PropertyTags p={p} /></div>
          {p.model3d && (
            <span className="chip absolute bottom-3 left-3 border-signal/50 bg-signal/25 text-paper backdrop-blur-md"><Box size={12} /> Tour 3D</span>
          )}
          <span className="absolute bottom-3 right-3 font-mono text-[11px] uppercase tracking-wider text-paper/80">{p.purpose === 'aluguel' ? 'Aluguel' : 'Venda'}</span>
        </div>
      </TLink>
      <div className="absolute right-3 top-3 flex gap-1.5">
        <button
          type="button"
          onClick={() => toggleCompare(p.id, p.name)}
          aria-pressed={inCompare(p.id)}
          aria-label={inCompare(p.id) ? `Remover ${p.name} da comparação` : `Comparar ${p.name}`}
          className={`inline-flex h-10 w-10 items-center justify-center rounded border backdrop-blur-md transition ${inCompare(p.id) ? 'border-signal bg-signal text-white' : 'border-white/15 bg-ink/45 text-paper hover:bg-ink/70'}`}
        >
          <Scale size={16} />
        </button>
        <FavoriteButton id={p.id} name={p.name} />
      </div>
      <div className="mt-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="eyebrow truncate">{TYPE_LABEL[p.type]} · {location(p)}</p>
          <h3 className={`mt-1.5 font-medium tracking-tight ${size === 'lg' ? 'text-display-sm' : 'text-lg'}`}>
            <TLink to={`/imovel/${p.slug}`} className="hover:text-signal-soft">{p.name}</TLink>
          </h3>
        </div>
        <p className="shrink-0 pt-5 text-right text-[15px] font-medium tabular-nums">{formatPrice(p)}</p>
      </div>
      <div className="mt-2.5"><Specs p={p} /></div>
    </article>
  );
}
