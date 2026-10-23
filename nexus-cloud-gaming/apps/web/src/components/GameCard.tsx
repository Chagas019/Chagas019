'use client';

import { getPlatform, type Game } from '@nexus/core';
import { Gamepad2, Hand, Keyboard } from 'lucide-react';
import Link from 'next/link';
import { useRef } from 'react';
import { AvailabilityBadge } from './AvailabilityBadge';
import { FavoriteButton } from './FavoriteButton';
import { GameCover } from './GameCover';

const CONTROLLER_ICON = { completo: Gamepad2, parcial: Gamepad2, 'teclado-mouse': Keyboard };
const CONTROLLER_LABEL = { completo: 'Controle completo', parcial: 'Controle parcial', 'teclado-mouse': 'Teclado e mouse' };

/**
 * Card com inclinação 3D que acompanha o ponteiro. A inclinação só existe em
 * dispositivos com hover real e sem "reduzir movimento"; no toque o card só
 * responde com leve escala ao pressionar.
 */
export function GameCard({ game, priority = false }: { game: Game; priority?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const ControllerIcon = CONTROLLER_ICON[game.controller];

  function onMove(e: React.PointerEvent) {
    if (e.pointerType !== 'mouse' || !ref.current) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const r = ref.current.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    ref.current.style.setProperty('--rx', `${(-y * 10).toFixed(2)}deg`);
    ref.current.style.setProperty('--ry', `${(x * 12).toFixed(2)}deg`);
    ref.current.style.setProperty('--gx', `${(x + 0.5) * 100}%`);
    ref.current.style.setProperty('--gy', `${(y + 0.5) * 100}%`);
  }
  function onLeave() {
    ref.current?.style.setProperty('--rx', '0deg');
    ref.current?.style.setProperty('--ry', '0deg');
  }

  return (
    <div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className="group relative w-full [perspective:900px]"
      data-priority={priority || undefined}
    >
      <div className="relative transition-transform duration-300 ease-out-quint [transform:rotateX(var(--rx,0))_rotateY(var(--ry,0))] [transform-style:preserve-3d]">
        <Link
          href={`/jogo/${game.slug}`}
          className="block rounded-[1.25rem] transition-transform duration-200 active:scale-[0.98]"
          aria-label={`${game.name}: ${game.tagline}`}
        >
          <div className="relative overflow-hidden rounded-[1.25rem] border border-line shadow-[0_24px_50px_-28px_rgb(0_0_0/0.9)] transition-[box-shadow,border-color] duration-300 group-hover:border-line-strong group-hover:shadow-[0_30px_60px_-24px_rgb(79_125_255/0.55)]">
            <div className="aspect-[4/5]">
              <GameCover game={game} />
            </div>
            <div
              className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              style={{ background: 'radial-gradient(circle at var(--gx,50%) var(--gy,50%), rgb(255 255 255 / .18), transparent 45%)' }}
              aria-hidden="true"
            />
            <div className="absolute left-3 top-3">
              <AvailabilityBadge value={game.availability} />
            </div>
          </div>
          <div className="mt-3 px-1">
            <p className="line-clamp-1 text-sm text-muted">{game.tagline}</p>
            <div className="mt-1.5 flex items-center gap-3 text-xs text-faint">
              <span>{getPlatform(game.platform).short}</span>
              <span className="flex items-center gap-1">
                <ControllerIcon className="h-3.5 w-3.5" aria-hidden="true" /> {CONTROLLER_LABEL[game.controller]}
              </span>
              {game.touchControls && (
                <span className="flex items-center gap-1">
                  <Hand className="h-3.5 w-3.5" aria-hidden="true" /> Toque
                </span>
              )}
            </div>
          </div>
        </Link>
        {/* Fora do link: um botão não pode ficar dentro de <a>. */}
        <div className="absolute right-3 top-3">
          <FavoriteButton slug={game.slug} name={game.name} />
        </div>
      </div>
    </div>
  );
}

export function GameCardSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="skeleton aspect-[4/5]" />
      <div className="skeleton mt-3 h-4 w-3/4" />
      <div className="skeleton mt-2 h-3 w-1/2" />
    </div>
  );
}
