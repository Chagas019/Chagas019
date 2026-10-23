import { FAMILY_LABEL, GAMES, PLATFORMS, getPlatform, isPlatformId } from '@nexus/core';
import { ExternalLink, ShieldAlert } from 'lucide-react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AvailabilityBadge } from '@/components/AvailabilityBadge';
import { GameCard } from '@/components/GameCard';
import { EmptyState, PageHeader, Section } from '@/components/Section';

export const dynamicParams = false;

export function generateStaticParams() {
  return PLATFORMS.map((p) => ({ id: p.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return isPlatformId(id) ? { title: getPlatform(id).name } : {};
}

export default async function PlatformPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isPlatformId(id)) notFound();
  const platform = getPlatform(id);
  const games = GAMES.filter((g) => g.platform === id);

  return (
    <>
      <PageHeader eyebrow={FAMILY_LABEL[platform.family]} title={platform.name}>
        <div className="mb-3"><AvailabilityBadge value={platform.defaultAvailability} /></div>
        {platform.summary}
      </PageHeader>

      <Section id="acesso" eyebrow="Como acessar" title={platform.officialServices.length ? 'Serviços oficiais' : 'Acesso'}>
        {platform.officialServices.length > 0 ? (
          <ul className="grid gap-4 md:grid-cols-2">
            {platform.officialServices.map((s) => (
              <li key={s.name} className="panel flex flex-col p-6">
                <p className="font-display text-xl font-bold">{s.name}</p>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{s.note}</p>
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost mt-5 self-start">
                  Abrir site oficial <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  <span className="sr-only">(abre site externo)</span>
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={<ShieldAlert className="h-6 w-6" aria-hidden="true" />} title={platform.family === 'livre' ? 'Streaming próprio em construção' : 'Sem acesso legítimo disponível'}>
            {platform.family === 'livre'
              ? 'Estes jogos têm licença livre e serão executados nos servidores do NEXUS a partir da Fase 4.'
              : 'Não existe hoje um serviço oficial de streaming no navegador para esta plataforma. O NEXUS não emula consoles nem distribui ROMs, ISOs ou BIOS.'}
          </EmptyState>
        )}
        <p className="mt-4 text-xs text-faint">O NEXUS não é afiliado aos serviços citados. Requisitos, preços e catálogos são definidos por eles.</p>
      </Section>

      <Section id="jogos" eyebrow="Catálogo" title="Jogos nesta plataforma">
        {games.length > 0 ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
            {games.map((g) => <GameCard key={g.slug} game={g} />)}
          </div>
        ) : (
          <EmptyState icon={<ShieldAlert className="h-6 w-6" aria-hidden="true" />} title="Nenhum título integrado">
            Títulos desta plataforma só entram no catálogo quando houver uma integração oficial validada.
          </EmptyState>
        )}
      </Section>
    </>
  );
}
