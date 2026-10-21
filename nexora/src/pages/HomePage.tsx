import { useNavigate } from 'react-router';
import { ArrowRight, ArrowUpRight, Box, Layers3, MousePointerClick, Search, CalendarCheck } from 'lucide-react';
import { Hero } from '@/components/home/Hero';
import { SearchPanel } from '@/components/property/SearchPanel';
import { PropertyCard } from '@/components/property/PropertyCard';
import { Specs } from '@/components/property/Specs';
import { TLink } from '@/components/ui/TLink';
import { Picture } from '@/components/ui/Picture';
import { ErrorState, LoadingGrid } from '@/components/ui/States';
import { MaskReveal, Parallax, Reveal, WordReveal, CountUp } from '@/components/motion/Reveal';
import { useContent, useProperties } from '@/hooks/useData';
import { useSeo } from '@/hooks/useSeo';
import { EMPTY_FILTERS, locationOptions, toSearchParams } from '@/lib/filters';
import { formatPrice, location, TYPE_LABEL } from '@/lib/format';
import { defaultContent } from '@/data/content';

export default function HomePage() {
  const { data: list, loading, error, retry } = useProperties();
  const { data: content = defaultContent } = useContent();
  const navigate = useNavigate();
  useSeo({ title: content.seo.defaultTitle, description: content.seo.defaultDescription, path: '/' });

  const featured = (list ?? []).filter((p) => p.featured);
  const heroProperty = featured.find((p) => p.model3d) ?? featured[0] ?? list?.[0];
  const with3d = (list ?? []).find((p) => p.model3d);
  const editorial = (list ?? []).filter((p) => p.gallery.length >= 2 && p.builtArea).slice(0, 3);

  return (
    <>
      <Hero p={heroProperty} content={content.home} />

      {/* A. Busca */}
      <section id="busca" aria-labelledby="busca-titulo" className="relative z-10 -mt-px bg-ink pb-16 pt-14 text-paper md:pb-24">
        <div className="container">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <h2 id="busca-titulo" className="text-display-sm font-medium">Busque pelo que importa para você</h2>
            {list && <p className="font-mono text-xs text-mist"><CountUp value={list.length} /> imóveis publicados</p>}
          </div>
          <SearchPanel
            variant="hero"
            value={EMPTY_FILTERS}
            locations={locationOptions(list ?? [])}
            onApply={(f) => navigate(`/imoveis?${toSearchParams(f)}`)}
            onClear={() => undefined}
          />
        </div>
      </section>

      {/* B. Destaques — grade editorial */}
      <section aria-labelledby="destaques" className="theme-light section bg-bg text-fg">
        <div className="container">
          <header className="mb-12 grid gap-6 md:grid-cols-12 md:items-end">
            <div className="md:col-span-7">
              <p className="eyebrow mb-4">01 — Seleção</p>
              <WordReveal id="destaques" text="Imóveis em destaque" className="text-display-lg font-medium" />
            </div>
            <p className="text-muted md:col-span-4 md:col-start-9">Uma curadoria de casas, apartamentos e espaços comerciais, cada um com ficha técnica completa e, quando disponível, planta interativa e tour 3D.</p>
          </header>
          {loading ? <LoadingGrid n={3} /> : error ? <ErrorState text={error.message} onRetry={retry} /> : (
            <div className="grid grid-cols-1 gap-x-6 gap-y-14 md:grid-cols-12">
              {featured.slice(0, 4).map((p, i) => (
                <Reveal key={p.id} delay={(i % 2) * 0.1} className={i === 0 ? 'md:col-span-7' : i === 1 ? 'md:col-span-5 md:mt-24' : i === 2 ? 'md:col-span-5' : 'md:col-span-7 md:-mt-16'}>
                  <PropertyCard p={p} size={i === 0 ? 'lg' : i === 3 ? 'wide' : 'md'} />
                </Reveal>
              ))}
            </div>
          )}
          <div className="mt-16 flex justify-center">
            <TLink to="/imoveis" className="btn-ghost px-6">Ver todos os imóveis <ArrowRight size={16} /></TLink>
          </div>
        </div>
      </section>

      {/* C. Estilo de vida */}
      <section aria-labelledby="estilos" className="section bg-navy text-paper">
        <div className="container">
          <header className="mb-12 flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="eyebrow mb-4">02 — Estilo de vida</p>
              <WordReveal id="estilos" text="Explore pelo jeito de morar" className="text-display-lg font-medium" />
            </div>
          </header>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {content.categories.filter((c) => c.visible).map((c, i) => {
              const cover = list?.find((p) => p.slug === c.coverFrom)?.cover ?? list?.find((p) => p.lifestyle.includes(c.id))?.cover;
              const count = list?.filter((p) => p.lifestyle.includes(c.id)).length ?? 0;
              return (
                <Reveal as="li" key={c.id} delay={(i % 4) * 0.06} className={i === 0 ? 'sm:col-span-2 lg:row-span-2' : ''}>
                  <TLink to={`/imoveis?estilo=${c.id}`} className={`group relative flex h-full flex-col justify-end overflow-hidden rounded-lg border border-white/10 p-5 ${i === 0 ? 'min-h-[22rem] lg:min-h-full' : 'min-h-[13rem]'}`}>
                    {cover && <Picture media={{ ...cover, alt: '' }} className="absolute inset-0 -z-10" imgClassName="opacity-70 transition duration-700 ease-arch group-hover:scale-105 group-hover:opacity-90" sizes="(min-width: 1024px) 25vw, 50vw" />}
                    <div className="absolute inset-0 -z-10 bg-gradient-to-t from-ink via-ink/40 to-transparent" />
                    <span className="absolute right-4 top-4 font-mono text-[11px] text-paper/70">{String(count).padStart(2, '0')} {count === 1 ? 'imóvel' : 'imóveis'}</span>
                    <h3 className={`font-medium tracking-tight ${i === 0 ? 'text-display-sm' : 'text-lg'}`}>{c.label}</h3>
                    <p className="mt-1 text-sm text-paper/70">{c.description}</p>
                    <ArrowUpRight size={18} className="absolute bottom-5 right-5 text-paper/60 transition group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-paper" />
                  </TLink>
                </Reveal>
              );
            })}
          </ul>
        </div>
      </section>

      {/* D. Experiência 3D */}
      <section aria-labelledby="exp3d" className="relative overflow-hidden bg-ink text-paper">
        <div className="container grid gap-12 py-section lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-5">
            <p className="eyebrow mb-4">03 — Visita 3D</p>
            <WordReveal id="exp3d" text={content.home.experienceTitle} className="text-display-lg font-medium" />
            <Reveal delay={0.15}>
              <p className="mt-6 max-w-md text-paper/70">{content.home.experienceText}</p>
              <ul className="mt-8 space-y-3 text-sm text-paper/80">
                {[[MousePointerClick, 'Gire, aproxime e entre nos ambientes'], [Layers3, 'Corte por pavimento, como uma maquete'], [Box, 'Modo noturno com a iluminação da casa']].map(([Icon, t]) => {
                  const I = Icon as typeof Box;
                  return <li key={t as string} className="flex items-center gap-3"><span className="flex h-8 w-8 items-center justify-center rounded border border-white/10"><I size={15} /></span>{t as string}</li>;
                })}
              </ul>
              {with3d && (
                <div className="mt-10 flex flex-wrap gap-3">
                  <TLink to="/experiencia-3d" className="btn-primary px-6"><Box size={16} /> Abrir o visualizador 3D</TLink>
                  <TLink to={`/imovel/${with3d.slug}`} className="btn-ghost border-white/15 px-6">Ver o imóvel</TLink>
                </div>
              )}
            </Reveal>
          </div>
          <div className="lg:col-span-7">
            {with3d && (
              <MaskReveal className="relative">
                <TLink to="/experiencia-3d" className="group relative block overflow-hidden rounded-xl border border-white/10" aria-label={`Abrir o visualizador 3D de ${with3d.name}`}>
                  <Picture media={with3d.gallery.find((m) => m.src.includes('aerea')) ?? with3d.cover} className="aspect-[4/3]" imgClassName="transition duration-1000 ease-arch group-hover:scale-[1.03]" />
                  <div className="blueprint-grid pointer-events-none absolute inset-0 opacity-60 mix-blend-overlay" />
                  <span className="absolute left-4 top-4 chip border-white/20 bg-ink/50 text-paper backdrop-blur">Modelo demonstrativo</span>
                  <span className="absolute inset-0 m-auto flex h-20 w-20 items-center justify-center rounded-full border border-white/30 bg-ink/40 backdrop-blur-md transition group-hover:scale-110"><Box size={26} /></span>
                </TLink>
              </MaskReveal>
            )}
          </div>
        </div>
      </section>

      {/* E. Arquitetura em destaque */}
      <section aria-labelledby="arquitetura" className="theme-light section bg-surface text-fg">
        <div className="container">
          <header className="mb-16 max-w-3xl">
            <p className="eyebrow mb-4">04 — Arquitetura</p>
            <WordReveal id="arquitetura" text="Projetos que merecem ser vistos de perto" className="text-display-lg font-medium" />
          </header>
          <div className="space-y-24 md:space-y-32">
            {editorial.map((p, i) => (
              <article key={p.id} className="grid gap-8 md:grid-cols-12 md:items-center">
                <div className={`md:col-span-7 ${i % 2 ? 'md:order-2 md:col-start-6' : ''}`}>
                  <Parallax className="aspect-[4/3] rounded-lg" amount={40}>
                    <Picture media={p.gallery[1] ?? p.cover} className="h-full" />
                  </Parallax>
                </div>
                <Reveal className={`md:col-span-4 ${i % 2 ? 'md:order-1 md:col-start-1' : 'md:col-start-9'}`}>
                  <p className="font-mono text-xs text-muted">{String(i + 1).padStart(2, '0')} / {String(editorial.length).padStart(2, '0')} · {TYPE_LABEL[p.type]}</p>
                  <h3 className="mt-4 text-display-md font-medium">{p.name}</h3>
                  <p className="mt-2 text-sm text-muted">{location(p)}</p>
                  <p className="mt-5 text-[15px] leading-relaxed">{p.headline}</p>
                  <div className="mt-5"><Specs p={p} /></div>
                  <div className="mt-6 flex items-center justify-between border-t pt-5 hairline">
                    <span className="font-medium tabular-nums">{formatPrice(p)}</span>
                    <TLink to={`/imovel/${p.slug}`} className="inline-flex items-center gap-1.5 text-sm font-medium text-signal hover:underline">Conhecer o projeto <ArrowRight size={15} /></TLink>
                  </div>
                </Reveal>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* F. Como funciona */}
      <section aria-labelledby="como-funciona" className="section bg-ink text-paper">
        <div className="container">
          <header className="mb-14 grid gap-6 md:grid-cols-12 md:items-end">
            <div className="md:col-span-7">
              <p className="eyebrow mb-4">05 — Como funciona</p>
              <WordReveal id="como-funciona" text="Do primeiro clique às chaves" className="text-display-lg font-medium" />
            </div>
          </header>
          <ol className="grid border-l border-t border-white/10 md:grid-cols-3">
            {[
              { Icon: Search, t: 'Encontre seu imóvel', d: 'Filtre por bairro, tipo, preço, quartos, área e vagas. Salve favoritos e compare até três imóveis lado a lado.' },
              { Icon: Layers3, t: 'Explore os ambientes e a planta', d: 'Abra a planta, toque em cada cômodo para ver medidas e fotos, e percorra o modelo 3D quando ele estiver disponível.' },
              { Icon: CalendarCheck, t: 'Agende uma visita ou fale com um consultor', d: 'Escolha o dia e o formato da visita, presencial ou por vídeo, ou mande sua dúvida. Um consultor responde.' },
            ].map(({ Icon, t, d }, i) => (
              <Reveal as="li" key={t} delay={i * 0.12} className="relative border-b border-r border-white/10 p-8 md:p-10">
                <span className="font-mono text-xs text-mist">0{i + 1}</span>
                <Icon className="mt-10 text-signal-soft" size={26} strokeWidth={1.4} />
                <h3 className="mt-6 text-xl font-medium tracking-tight">{t}</h3>
                <p className="mt-3 text-sm leading-relaxed text-paper/65">{d}</p>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {content.testimonials.filter((t) => t.published && t.authorized).length > 0 && (
        <section aria-labelledby="depoimentos" className="theme-light section bg-bg text-fg">
          <div className="container">
            <h2 id="depoimentos" className="mb-10 text-display-md font-medium">Quem já encontrou seu lugar</h2>
            <ul className="grid gap-6 md:grid-cols-3">
              {content.testimonials.filter((t) => t.published && t.authorized).map((t) => (
                <li key={t.id} className="surface p-6"><blockquote className="text-[15px] leading-relaxed">“{t.text}”</blockquote><p className="mt-4 text-sm text-muted">{t.author}</p></li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* G. CTA final */}
      <section aria-labelledby="cta" className="relative isolate overflow-hidden bg-navy text-paper">
        {heroProperty && <Parallax className="absolute inset-0 -z-10 opacity-35" amount={50}><Picture media={{ ...(heroProperty.gallery.find((m) => m.src.includes('piscina')) ?? heroProperty.cover), alt: '' }} className="h-full" /></Parallax>}
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-navy via-navy/70 to-navy/40" />
        <div className="container py-section text-center">
          <WordReveal id="cta" text={content.home.ctaTitle} className="mx-auto max-w-4xl text-display-lg font-medium" />
          <Reveal delay={0.2}>
            <TLink to="/imoveis" className="btn-light mt-10 px-8">{content.home.ctaButton} <ArrowRight size={16} /></TLink>
          </Reveal>
        </div>
      </section>
    </>
  );
}
