import { GAMES } from '@nexus/core';
import { FlaskConical } from 'lucide-react';
import Link from 'next/link';
import { ControllerTeaser } from '@/components/ControllerTeaser';
import { FeaturedCarousel } from '@/components/FeaturedCarousel';
import { GameCard } from '@/components/GameCard';
import { Hero } from '@/components/Hero';
import { FavoritesShelf, RecentShelf } from '@/components/LibraryShelf';
import { PlatformGrid } from '@/components/PlatformGrid';
import { Plans } from '@/components/Plans';
import { Section } from '@/components/Section';
import { ServerRegions } from '@/components/ServerRegions';
import { ServiceStatus } from '@/components/ServiceStatus';

export default function HomePage() {
  const featured = GAMES.filter((g) => g.featured);
  const popular = GAMES.filter((g) => g.popular);
  const added = [...GAMES].reverse().slice(0, 8);

  return (
    <>
      <Hero />

      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="panel flex items-start gap-3 p-4 text-sm text-muted" role="note">
          <FlaskConical className="mt-0.5 h-5 w-5 shrink-0 text-violet" aria-hidden="true" />
          <p>
            <strong className="text-ink">Dados demonstrativos.</strong> O catálogo lista jogos de código aberto que poderão ser
            transmitidos legalmente, mas nenhum servidor de jogo está ativo.{' '}
            <Link href="/transparencia" className="font-semibold text-cyan underline-offset-2 hover:underline">Veja o que já funciona</Link>.
          </p>
        </div>
      </div>

      <Section id="destaques" eyebrow="Em destaque" title="Para jogar primeiro">
        <FeaturedCarousel games={featured} />
      </Section>

      <Section id="plataformas" eyebrow="Plataformas" title="Escolha por onde jogar" description="Cada plataforma mostra como pode ser acessada hoje. Consoles só por serviços oficiais; o NEXUS não emula consoles nem distribui jogos.">
        <PlatformGrid />
      </Section>

      <Section id="recentes" eyebrow="Continue" title="Acessados recentemente" action={{ href: '/biblioteca', label: 'Biblioteca' }}>
        <RecentShelf />
      </Section>

      <Section id="populares" eyebrow="Populares" title="Os mais procurados" action={{ href: '/catalogo', label: 'Ver catálogo' }}>
        <div className="rail auto-cols-[minmax(10.5rem,46%)] sm:auto-cols-[14rem]">
          {popular.map((g, i) => <GameCard key={g.slug} game={g} priority={i < 2} />)}
        </div>
      </Section>

      <Section id="favoritos" eyebrow="Sua biblioteca" title="Favoritos">
        <FavoritesShelf />
      </Section>

      <Section id="novidades" eyebrow="Lançamentos" title="Chegaram ao catálogo">
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
          {added.map((g) => <GameCard key={g.slug} game={g} />)}
        </div>
      </Section>

      <Section id="controle" eyebrow="Controles" title="Jogue com controle ou toque">
        <ControllerTeaser />
      </Section>

      <Section id="status" eyebrow="Disponibilidade" title="Estado do serviço" action={{ href: '/servidores', label: 'Diagnóstico' }}>
        <ServiceStatus />
      </Section>

      <Section id="servidores" eyebrow="Infraestrutura" title="Servidores" description="Onde os jogos vão rodar. Nenhuma região está ativa ainda.">
        <ServerRegions />
      </Section>

      <Section id="planos" eyebrow="Assinatura" title="Planos" description="Estrutura dos planos, pronta para integração de pagamento. Os preços dependem do custo real medido na infraestrutura.">
        <Plans />
      </Section>
    </>
  );
}
