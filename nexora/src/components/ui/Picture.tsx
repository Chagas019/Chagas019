import type { CSSProperties } from 'react';
import type { Media } from '@/types/property';

/** Imagem responsiva com dimensões definidas (sem mudança de layout) e carregamento preguiçoso por padrão. */
export function Picture({ media, className = '', sizes = '(min-width: 1024px) 50vw, 100vw', priority = false, style, imgClassName = '' }: { media: Media; className?: string; sizes?: string; priority?: boolean; style?: CSSProperties; imgClassName?: string }) {
  const srcSet = media.thumb ? `${media.thumb} ${thumbWidth(media)}w, ${media.src} ${media.width}w` : undefined;
  return (
    <div className={`overflow-hidden bg-navy ${className}`} style={style}>
      <img
        src={media.src}
        srcSet={srcSet}
        sizes={srcSet ? sizes : undefined}
        alt={media.alt}
        width={media.width}
        height={media.height}
        loading={priority ? 'eager' : 'lazy'}
        decoding={priority ? 'sync' : 'async'}
        fetchPriority={priority ? 'high' : 'auto'}
        className={`h-full w-full object-cover ${imgClassName}`}
      />
    </div>
  );
}

const thumbWidth = (m: Media) => Number(m.thumb?.match(/-(\d+)\.\w+$/)?.[1] ?? 800);
