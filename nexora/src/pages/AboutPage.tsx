import { Box, CalendarCheck, Heart, Layers3, Scale, Search } from 'lucide-react';
import { TLink } from '@/components/ui/TLink';
import { Reveal, WordReveal } from '@/components/motion/Reveal';
import { useSeo } from '@/hooks/useSeo';

const STEPS = [
  { Icon: Search, t: 'Encontre seu imóvel', d: 'Busque por texto ou combine filtros de bairro, tipo, finalidade, preço, quartos, área mínima e vagas. Ordene por preço, área ou data de cadastro.' },
  { Icon: Layers3, t: 'Explore os ambientes e a planta', d: 'A planta mostra cada cômodo com área em m². Toque em um ambiente para ver descrição e fotos; quando há modelo 3D, a câmera vai até ele.' },
  { Icon: CalendarCheck, t: 'Agende uma visita ou fale com um consultor', d: 'Escolha dia, horário e formato (presencial ou vídeo). Seu pedido chega direto à equipe, que acompanha o atendimento pelo painel.' },
];

export default function AboutPage() {
  useSeo({ title: 'Como funciona | NEXORA Real Estate', description: 'Como buscar, explorar em 3D, comparar e agendar visitas na NEXORA.', path: '/sobre' });
  return (
    <div className="bg-ink pb-section pt-[calc(var(--header-h)+3rem)] text-paper">
      <div className="container">
        <p className="eyebrow mb-4">Como funciona</p>
        <WordReveal as="h1" text="Menos visitas às cegas. Mais certeza antes de decidir." className="max-w-4xl text-display-lg font-medium" />
        <ol className="mt-16 grid gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10 md:grid-cols-3">
          {STEPS.map(({ Icon, t, d }, i) => (
            <Reveal as="li" key={t} delay={i * 0.1} className="bg-ink p-8 md:p-10">
              <span className="font-mono text-xs text-mist">0{i + 1}</span>
              <Icon className="mt-8 text-signal-soft" size={26} strokeWidth={1.4} />
              <h2 className="mt-6 text-xl font-medium">{t}</h2>
              <p className="mt-3 text-sm leading-relaxed text-paper/65">{d}</p>
            </Reveal>
          ))}
        </ol>
        <section aria-labelledby="recursos" className="mt-24 grid gap-10 md:grid-cols-12">
          <h2 id="recursos" className="text-display-sm font-medium md:col-span-4">O que você encontra em cada anúncio</h2>
          <ul className="grid gap-6 sm:grid-cols-2 md:col-span-8">
            {[
              [Box, 'Modelo 3D', 'Quando a imobiliária fornece o modelo. Os modelos marcados como demonstrativos são ilustrativos.'],
              [Layers3, 'Planta interativa', 'Desenhada a partir de dados geométricos. Plantas enviadas como imagem aparecem com marcadores, sem medidas inventadas.'],
              [Heart, 'Favoritos', 'Funcionam sem cadastro e continuam salvos ao recarregar. Com login, ficam na sua conta.'],
              [Scale, 'Comparação', 'Até três imóveis lado a lado. Dados ausentes aparecem como “não informado”.'],
            ].map(([Icon, t, d]) => {
              const I = Icon as typeof Box;
              return <li key={t as string} className="border-t border-white/10 pt-5"><I size={18} className="text-signal-soft" /><h3 className="mt-3 font-medium">{t as string}</h3><p className="mt-1.5 text-sm text-paper/65">{d as string}</p></li>;
            })}
          </ul>
        </section>
        <div className="mt-20 flex flex-wrap gap-3">
          <TLink to="/imoveis" className="btn-light px-6">Começar minha busca</TLink>
          <TLink to="/contato" className="btn-ghost border-white/15 px-6">Falar com um consultor</TLink>
        </div>
      </div>
    </div>
  );
}
