import { GAMES, getGame, isPlayable } from '@nexus/core';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { GamePlayer } from '@/components/GamePlayer';
import { RecordVisit } from '@/components/RecordVisit';
import { BROWSER_GAME_FACTORIES } from '@/games';

export const dynamicParams = false;

/** Só existem rotas de jogo para títulos jogáveis e com player implementado. */
export function generateStaticParams() {
  return GAMES.filter((g) => isPlayable(g) && BROWSER_GAME_FACTORIES[g.slug]).map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const game = getGame((await params).slug);
  return game ? { title: `Jogar ${game.name}` } : {};
}

export default async function PlayPage({ params }: { params: Promise<{ slug: string }> }) {
  const game = getGame((await params).slug);
  if (!game || !isPlayable(game) || !BROWSER_GAME_FACTORIES[game.slug]) notFound();
  return (
    <div className="pt-6 sm:pt-10">
      <RecordVisit slug={game.slug} />
      <h1 className="sr-only">Jogar {game.name}</h1>
      <GamePlayer game={game} />
    </div>
  );
}
