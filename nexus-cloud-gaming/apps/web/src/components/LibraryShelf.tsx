'use client';

import { GAMES, type Game } from '@nexus/core';
import { Clock, Heart, RotateCcw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useFavorites, useRecent } from '@/lib/storage';
import { GameCard, GameCardSkeleton } from './GameCard';
import { EmptyState } from './Section';

const bySlug = (slugs: string[]) => slugs.map((s) => GAMES.find((g) => g.slug === s)).filter((g): g is Game => Boolean(g));

/** Mostra esqueleto até ler o armazenamento local (evita piscar "vazio" na hidratação). */
function useMounted() {
  const [m, setM] = useState(false);
  useEffect(() => setM(true), []);
  return m;
}

function Rail({ games }: { games: Game[] }) {
  return (
    <div className="rail auto-cols-[minmax(10.5rem,46%)] sm:auto-cols-[14rem]">
      {games.map((g) => <GameCard key={g.slug} game={g} />)}
    </div>
  );
}

function Loading() {
  return (
    <div className="rail auto-cols-[minmax(10.5rem,46%)] sm:auto-cols-[14rem]">
      {[0, 1, 2, 3].map((i) => <GameCardSkeleton key={i} />)}
    </div>
  );
}

export function RecentShelf({ showClear = false }: { showClear?: boolean }) {
  const mounted = useMounted();
  const { recent, clear } = useRecent();
  if (!mounted) return <Loading />;
  const games = bySlug(recent);
  if (games.length === 0) {
    return (
      <EmptyState icon={<Clock className="h-6 w-6" aria-hidden="true" />} title="Nada por aqui ainda">
        Os jogos que você abrir aparecem aqui para voltar rápido. O histórico fica só neste aparelho.
      </EmptyState>
    );
  }
  return (
    <>
      <Rail games={games} />
      {showClear && (
        <button type="button" onClick={clear} className="btn btn-ghost mt-4 text-sm">
          <RotateCcw className="h-4 w-4" aria-hidden="true" /> Limpar histórico
        </button>
      )}
    </>
  );
}

export function FavoritesShelf() {
  const mounted = useMounted();
  const { favorites } = useFavorites();
  if (!mounted) return <Loading />;
  const games = bySlug(favorites);
  if (games.length === 0) {
    return (
      <EmptyState icon={<Heart className="h-6 w-6" aria-hidden="true" />} title="Sem favoritos">
        Toque no coração de um jogo para guardá-lo na sua biblioteca.
      </EmptyState>
    );
  }
  return <Rail games={games} />;
}
