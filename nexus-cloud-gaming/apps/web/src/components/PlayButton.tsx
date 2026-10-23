import { callToAction, type Game } from '@nexus/core';
import { CircleX, ExternalLink, Hourglass, Play } from 'lucide-react';
import Link from 'next/link';

/**
 * Botão principal de um jogo. O tipo de botão vem de `callToAction`, a mesma
 * regra testada no pacote de domínio: sem integração operacional, não há
 * botão "Jogar" clicável.
 */
export function PlayButton({ game, compact = false }: { game: Game; compact?: boolean }) {
  const cta = callToAction(game);
  const size = compact ? 'min-h-10 px-4 text-sm' : '';
  switch (cta.kind) {
    case 'play':
      return (
        <Link href={cta.href} className={`btn btn-primary ${size}`}>
          <Play className="h-4 w-4 fill-current" aria-hidden="true" /> {cta.label}
        </Link>
      );
    case 'official':
      return (
        <a href={cta.href} target="_blank" rel="noopener noreferrer" className={`btn btn-ghost ${size}`}>
          {cta.label} <ExternalLink className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only">(abre site externo)</span>
        </a>
      );
    case 'soon':
      return (
        <button type="button" disabled className={`btn btn-ghost ${size}`} title="O streaming deste jogo ainda não está implantado">
          <Hourglass className="h-4 w-4" aria-hidden="true" /> {cta.label}
        </button>
      );
    default:
      return (
        <button type="button" disabled className={`btn btn-ghost ${size}`}>
          <CircleX className="h-4 w-4" aria-hidden="true" /> {cta.label}
        </button>
      );
  }
}
