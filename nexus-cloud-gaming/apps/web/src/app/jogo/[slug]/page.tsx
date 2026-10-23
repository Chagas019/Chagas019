import { GAMES, getGame, getPlatform, type Game } from '@nexus/core';
import { ExternalLink, Info } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AvailabilityBadge, DemoBadge } from '@/components/AvailabilityBadge';
import { FavoriteButton } from '@/components/FavoriteButton';
import { GameCard } from '@/components/GameCard';
import { GameCover } from '@/components/GameCover';
import { PlayButton } from '@/components/PlayButton';
import { RecordVisit } from '@/components/RecordVisit';
import { Section } from '@/components/Section';

export const dynamicParams = false;

export function generateStaticParams() {
  return GAMES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const game = getGame((await params).slug);
  return game ? { title: game.name, description: game.tagline } : {};
}

const PENDING = 'A confirmar';
const ACCESS_LABEL = { navegador: 'Roda no navegador, neste aparelho', 'nexus-stream': 'Streaming próprio NEXUS (WebRTC)', 'servico-oficial': 'Serviço oficial externo', nenhum: 'Sem acesso' };
const CONTROLLER_LABEL = { completo: 'Controle completo', parcial: 'Controle parcial (teclado recomendado)', 'teclado-mouse': 'Teclado e mouse' };

function facts(game: Game): [string, string][] {
  const local = game.access === 'navegador';
  return [
    ['Plataforma', getPlatform(game.platform).name],
    ['Desenvolvedora', game.developer],
    ['Publicadora', game.publisher],
    ['Gênero', game.genres.join(', ')],
    ['Primeira versão', game.releaseYear ? String(game.releaseYear) : PENDING],
    ['Classificação indicativa', game.ageRating ?? `${PENDING} (ClassInd)`],
    ['Licença', game.license],
    ['Método de acesso', ACCESS_LABEL[game.access]],
    ['Controle', CONTROLLER_LABEL[game.controller]],
    ['Controles de toque', game.touchControls ? 'Previstos' : 'Não'],
    ['Qualidade máxima', local ? 'Resolução nativa da tela' : game.maxQuality ?? `${PENDING} após medição`],
    ['Tempo de inicialização', local ? 'Imediato' : game.bootSeconds ? `~${game.bootSeconds} s` : `${PENDING} após medição`],
    [local ? 'Requisitos' : 'Requisitos do servidor', local ? 'Navegador atual (Chrome, Safari, Edge ou Firefox)' : game.serverRequirements ?? `${PENDING} após benchmark (Fase 4)`],
  ];
}

export default async function GamePage({ params }: { params: Promise<{ slug: string }> }) {
  const game = getGame((await params).slug);
  if (!game) notFound();
  const related = GAMES.filter((g) => g.slug !== game.slug && g.genres.some((x) => game.genres.includes(x))).slice(0, 4);

  return (
    <>
      <RecordVisit slug={game.slug} />
      <div className="relative">
        <div className="absolute inset-x-0 top-0 -z-10 h-[28rem] opacity-60 [mask-image:linear-gradient(to_bottom,black,transparent)]" aria-hidden="true">
          <GameCover game={game} size="hero" />
        </div>
        <div className="mx-auto grid max-w-7xl gap-8 px-4 pt-10 sm:px-6 sm:pt-16 lg:grid-cols-[20rem_1fr] lg:gap-14">
          <div className="mx-auto w-56 overflow-hidden rounded-3xl border border-white/15 shadow-[0_40px_80px_-30px_rgb(0_0_0/0.9)] sm:w-64 lg:w-full">
            <div className="aspect-[4/5]"><GameCover game={game} /></div>
          </div>
          <div>
            <nav aria-label="Trilha" className="text-sm text-faint">
              <Link href="/catalogo" className="hover:text-ink">Catálogo</Link> /{' '}
              <Link href={`/plataformas/${game.platform}`} className="hover:text-ink">{getPlatform(game.platform).name}</Link>
            </nav>
            <div className="mt-4 flex flex-wrap gap-2">
              <AvailabilityBadge value={game.availability} />
              {game.demo && <DemoBadge />}
            </div>
            <h1 className="mt-4 text-4xl font-bold sm:text-6xl">{game.name}</h1>
            <p className="mt-3 text-lg text-muted">{game.tagline}</p>
            <p className="mt-5 max-w-2xl leading-relaxed text-ink/90">{game.description}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <PlayButton game={game} />
              <FavoriteButton slug={game.slug} name={game.name} variant="full" />
              <a href={game.sourceUrl} target="_blank" rel="noopener noreferrer" className="btn btn-ghost">
                Código-fonte <ExternalLink className="h-4 w-4" aria-hidden="true" />
                <span className="sr-only">(abre site externo)</span>
              </a>
            </div>
            {!game.demo && game.access === 'navegador' && (
              <p className="mt-5 max-w-2xl text-sm text-muted">Jogo original do NEXUS: roda direto no seu aparelho, com toque, controle Bluetooth ou teclado. Não precisa de instalação.</p>
            )}
            {game.availability !== 'operacional' && (
              <p className="mt-5 flex max-w-2xl gap-2 text-sm text-muted">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-warn" aria-hidden="true" />
                Ainda não há servidor executando este jogo. Ele está na fila da prova de conceito de streaming; o botão
                “Jogar” só aparece quando a integração for validada.
              </p>
            )}
          </div>
        </div>
      </div>

      <Section id="ficha" eyebrow="Ficha técnica" title="Detalhes">
        <dl className="panel grid gap-x-8 px-5 sm:grid-cols-2 sm:px-8">
          {facts(game).map(([k, v]) => (
            <div key={k} className="flex flex-col gap-0.5 border-b border-line py-3.5 last:border-0 sm:[&:nth-last-child(2)]:border-0">
              <dt className="text-xs font-semibold uppercase tracking-wider text-faint">{k}</dt>
              <dd className={v.startsWith(PENDING) ? 'text-muted italic' : ''}>{v}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-xs text-faint">
          Capa gerada pelo NEXUS. Imagens oficiais só serão usadas com direito de uso confirmado.
        </p>
      </Section>

      {related.length > 0 && (
        <Section id="relacionados" eyebrow="Parecidos" title="Você também pode gostar">
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-4">
            {related.map((g) => <GameCard key={g.slug} game={g} />)}
          </div>
        </Section>
      )}
    </>
  );
}
