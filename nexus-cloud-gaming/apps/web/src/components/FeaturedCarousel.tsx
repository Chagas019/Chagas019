'use client';

import { getPlatform, type Game } from '@nexus/core';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AvailabilityBadge, DemoBadge } from './AvailabilityBadge';
import { GameCover } from './GameCover';
import { PlayButton } from './PlayButton';

const ROTATE_MS = 7000;

/**
 * Banner de destaques. Troca sozinho a cada 7 s, mas pausa com o ponteiro em
 * cima, com foco dentro dele ou com "reduzir movimento" ativo.
 */
export function FeaturedCarousel({ games }: { games: Game[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const game = games[index];

  useEffect(() => {
    if (paused || games.length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = setTimeout(() => setIndex((i) => (i + 1) % games.length), ROTATE_MS);
    return () => clearTimeout(t);
  }, [index, paused, games.length]);

  const go = (d: number) => setIndex((i) => (i + d + games.length) % games.length);

  return (
    <div
      className="panel relative overflow-hidden p-0"
      role="region"
      aria-roledescription="carrossel"
      aria-label="Jogos em destaque"
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="grid min-h-[26rem] md:grid-cols-[1.1fr_1fr]">
        <div key={game.slug} className="relative h-56 md:order-2 md:h-auto animate-[fade_600ms_var(--ease-out-quint)]">
          <GameCover game={game} size="hero" />
          <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent md:bg-gradient-to-r md:from-surface md:via-surface/30" aria-hidden="true" />
        </div>
        <div className="relative flex flex-col justify-center gap-4 p-6 pb-20 sm:p-10 sm:pb-24" aria-live="polite">
          <div className="flex flex-wrap gap-2">
            <AvailabilityBadge value={game.availability} />
            <span className="chip">{getPlatform(game.platform).name}</span>
            <DemoBadge />
          </div>
          <h3 className="text-3xl font-bold sm:text-4xl">{game.name}</h3>
          <p className="max-w-md leading-relaxed text-muted">{game.description}</p>
          <div className="mt-2 flex flex-wrap gap-3">
            <PlayButton game={game} />
            <Link href={`/jogo/${game.slug}`} className="btn btn-ghost">Ver detalhes</Link>
          </div>
        </div>
      </div>
      <div className="absolute bottom-4 right-4 flex items-center gap-2 md:left-10 md:right-auto">
        <button type="button" onClick={() => go(-1)} className="grid h-11 w-11 place-items-center rounded-full border border-line-strong bg-void/60" aria-label="Destaque anterior">
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        </button>
        <div className="flex gap-1.5 px-1">
          {games.map((g, i) => (
            <button
              key={g.slug}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Mostrar ${g.name}`}
              aria-current={i === index}
              className="grid h-11 w-6 place-items-center"
            >
              <span className={`h-1.5 rounded-full transition-all ${i === index ? 'w-6 bg-cyan' : 'w-1.5 bg-white/30'}`} />
            </button>
          ))}
        </div>
        <button type="button" onClick={() => go(1)} className="grid h-11 w-11 place-items-center rounded-full border border-line-strong bg-void/60" aria-label="Próximo destaque">
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
