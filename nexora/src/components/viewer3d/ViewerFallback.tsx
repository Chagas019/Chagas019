import { ImageOff } from 'lucide-react';
import type { Media } from '@/types/property';

/** Mostrado quando não há WebGL, quando o modelo falha ao carregar ou quando o imóvel não tem modelo 3D. */
export function ViewerFallback({ reason, poster, onGallery, onRetry }: { reason: 'sem-webgl' | 'erro' | 'sem-modelo'; poster?: Media; onGallery?: () => void; onRetry?: () => void }) {
  const text = {
    'sem-webgl': 'Seu navegador ou dispositivo não suporta WebGL, necessário para o visualizador 3D.',
    erro: 'Não foi possível carregar o modelo 3D. Verifique sua conexão.',
    'sem-modelo': 'Este imóvel ainda não tem modelo 3D. Veja as fotos e a planta.',
  }[reason];
  return (
    <div className="relative flex aspect-[16/10] min-h-[320px] w-full items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-navy text-paper">
      {poster && <img src={poster.thumb ?? poster.src} alt="" className="absolute inset-0 h-full w-full object-cover opacity-30" />}
      <div className="relative max-w-sm px-6 text-center" role="status">
        <ImageOff className="mx-auto mb-4 text-mist" size={24} />
        <p className="text-sm">{text}</p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {onRetry && <button type="button" className="btn-light min-h-[40px]" onClick={onRetry}>Tentar de novo</button>}
          {onGallery && <button type="button" className="btn-ghost min-h-[40px] border-white/20" onClick={onGallery}>Ver galeria de fotos</button>}
        </div>
      </div>
    </div>
  );
}
