import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import { motion } from 'framer-motion';
import { ArrowLeft, CalendarCheck, FileText, MessageCircle, Scale } from 'lucide-react';
import { Picture } from '@/components/ui/Picture';
import { TLink } from '@/components/ui/TLink';
import { Tabs } from '@/components/ui/Tabs';
import { Modal } from '@/components/ui/Modal';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States';
import { Reveal } from '@/components/motion/Reveal';
import { FavoriteButton } from '@/components/property/FavoriteButton';
import { ShareButton } from '@/components/property/ShareButton';
import { PropertyCard, PropertyTags } from '@/components/property/PropertyCard';
import { Specs } from '@/components/property/Specs';
import { Gallery } from '@/components/property/Gallery';
import { LeadForm } from '@/components/property/LeadForm';
import { LocationMap } from '@/components/property/LocationMap';
import { FloorPlanViewer, type RoomSelection } from '@/components/floorplan/FloorPlanViewer';
import { Viewer3DLauncher } from '@/components/viewer3d/Viewer3DLauncher';
import { ViewerFallback } from '@/components/viewer3d/ViewerFallback';
import { useContent, useProperties, useProperty } from '@/hooks/useData';
import { useCollections } from '@/hooks/useCollections';
import { useMotionPref } from '@/hooks/useMotionPref';
import { useSeo } from '@/hooks/useSeo';
import { propertySeo } from '@/lib/seo';
import { similarProperties } from '@/lib/filters';
import { formatBRL, formatPrice, location as locationLabel, PURPOSE_LABEL, TYPE_LABEL } from '@/lib/format';
import { whatsappLink } from '@/lib/whatsapp';

const VirtualTour = lazy(() => import('@/components/tour/VirtualTour').then((m) => ({ default: m.VirtualTour })));

const TABS = ['visao-geral', 'galeria', 'tour-3d', 'planta', 'localizacao'] as const;
type Tab = (typeof TABS)[number];

export default function PropertyPage() {
  const { slug } = useParams();
  const { data: p, loading, error, retry } = useProperty(slug);
  const { data: all } = useProperties();
  const { data: content } = useContent();
  const { addRecent, inCompare, toggleCompare } = useCollections();
  const { reduced } = useMotionPref();
  const { hash } = useLocation();
  const navigate = useNavigate();
  const tabFromHash = (TABS as readonly string[]).includes(hash.slice(1)) ? (hash.slice(1) as Tab) : 'visao-geral';
  const [tab, setTab] = useState<Tab>(tabFromHash);
  const [room, setRoom] = useState<RoomSelection>();
  const [autoStart3d, setAutoStart3d] = useState(false);
  const [dialog, setDialog] = useState<'visita' | 'informacoes' | null>(null);

  useEffect(() => setTab(tabFromHash), [tabFromHash]);
  useEffect(() => { if (p) addRecent(p.id); }, [p?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useSeo(p ? propertySeo(p) : p === null ? { title: 'Imóvel não encontrado | NEXORA', description: 'Este imóvel não está mais disponível.', path: `/imovel/${slug}`, noindex: true } : null);

  const changeTab = useCallback((t: string) => {
    setTab(t as Tab);
    navigate({ hash: t === 'visao-geral' ? '' : t }, { replace: true, preventScrollReset: true });
  }, [navigate]);

  const levelNames = useMemo(() => (p?.floorPlan ? Object.fromEntries(p.floorPlan.levels.map((l) => [l.id, l.name])) : {}), [p]);

  if (loading) return <DetailSkeleton />;
  if (error) return <div className="container pt-40 pb-20"><ErrorState text={error.message} onRetry={retry} /></div>;
  if (!p) {
    return (
      <div className="container pb-24 pt-40">
        <EmptyState title="Imóvel não encontrado" text="Ele pode ter sido vendido, alugado ou retirado do site." action={<TLink to="/imoveis" className="btn-primary">Ver outros imóveis</TLink>} />
      </div>
    );
  }

  const has3d = !!p.model3d, hasTour = !!p.panoramas?.length, hasPlan = !!p.floorPlan;
  const waText = `Olá! Tenho interesse no imóvel ${p.name} (${locationLabel(p)}) — ${location.origin}/imovel/${p.slug}`;
  const wa = whatsappLink(content?.contact.whatsapp ?? '', waText);
  const similar = all ? similarProperties(all, p) : [];
  const rooms3d = p.model3d ? Object.keys(p.model3d.rooms) : [];

  const show3D = (roomId: string) => {
    setRoom((r) => ({ levelId: p.model3d?.rooms[roomId]?.level ?? r?.levelId ?? '', roomId }));
    setAutoStart3d(true);
    changeTab('tour-3d');
    requestAnimationFrame(() => document.getElementById('abas')?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' }));
  };

  const costs = [
    { k: PURPOSE_LABEL[p.purpose], v: formatPrice(p) },
    p.condoFee !== undefined ? { k: 'Condomínio', v: `${formatBRL(p.condoFee)}/mês` } : null,
    p.iptu !== undefined ? { k: 'IPTU', v: `${formatBRL(p.iptu)}/ano` } : null,
  ].filter(Boolean) as { k: string; v: string }[];

  return (
    <article>
      {/* capa — mesmo view-transition-name do card (elemento compartilhado) */}
      <header className="relative isolate flex min-h-[78svh] items-end overflow-hidden bg-ink text-paper">
        <Picture media={p.cover} priority sizes="100vw" className="absolute inset-0 -z-10" style={{ viewTransitionName: `capa-${p.slug}` }} />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-ink via-ink/40 to-ink/30" />
        <div className="container pb-10 pt-[calc(var(--header-h)+2rem)] md:pb-14">
          <nav aria-label="Trilha" className="mb-6 flex items-center gap-2 text-[13px] text-paper/70">
            <TLink to="/imoveis" className="inline-flex items-center gap-1.5 hover:text-paper"><ArrowLeft size={14} /> Imóveis</TLink>
            <span aria-hidden>/</span>
            <TLink to={`/imoveis?tipo=${p.type}`} className="hover:text-paper">{TYPE_LABEL[p.type]}</TLink>
          </nav>
          <div className="mb-4 flex flex-wrap gap-1.5"><PropertyTags p={p} /></div>
          <motion.h1 className="text-display-xl font-medium" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}>{p.name}</motion.h1>
          <motion.div className="mt-5 flex flex-wrap items-end justify-between gap-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45, duration: 0.8 }}>
            <div>
              <p className="text-paper/75">{locationLabel(p)}</p>
              <p className="mt-1 max-w-2xl text-lg text-paper/90">{p.headline}</p>
            </div>
            <p className="text-display-sm font-medium tabular-nums">{formatPrice(p)}</p>
          </motion.div>
          {p.demo && <p className="mt-6 inline-block rounded-sm border border-white/15 bg-ink/50 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-paper/80 backdrop-blur">Imóvel fictício de demonstração · imagens são renders ilustrativos</p>}
        </div>
      </header>

      <div className="theme-light bg-bg text-fg">
        <div className="container grid gap-12 pb-section pt-10 lg:grid-cols-12">
          <div className="min-w-0 lg:col-span-8">
            <Specs p={p} size="lg" />

            <div id="abas" className="sticky top-[var(--header-h)] z-20 -mx-5 mt-10 border-b bg-bg/90 px-5 backdrop-blur hairline md:mx-0 md:px-0">
              <Tabs
                idPrefix="imovel"
                label="Seções do imóvel"
                active={tab}
                onChange={changeTab}
                tabs={[
                  { id: 'visao-geral', label: 'Visão geral' },
                  { id: 'galeria', label: 'Galeria', badge: String(p.gallery.length) },
                  { id: 'tour-3d', label: 'Tour 3D', badge: has3d || hasTour ? (p.model3d?.demonstrative || p.panoramas?.[0]?.demonstrative ? 'demo' : undefined) : '—' },
                  { id: 'planta', label: 'Planta baixa', badge: hasPlan ? undefined : '—' },
                  { id: 'localizacao', label: 'Localização' },
                ]}
              />
            </div>

            <div role="tabpanel" id={`imovel-panel-${tab}`} aria-labelledby={`imovel-tab-${tab}`} tabIndex={0} className="pt-10 outline-none">
              {tab === 'visao-geral' && (
                <div className="space-y-12">
                  <section aria-labelledby="sobre">
                    <h2 id="sobre" className="text-display-sm font-medium">Sobre o imóvel</h2>
                    <div className="mt-5 space-y-4 text-[16px] leading-relaxed">{p.description.split('\n\n').map((t, i) => <p key={i} className={i > 0 && p.demo && t.includes('fictício') ? 'text-sm text-muted' : ''}>{t}</p>)}</div>
                  </section>
                  {(p.internalFeatures.length > 0 || p.externalFeatures.length > 0) && (
                    <section aria-labelledby="carac" className="grid gap-8 sm:grid-cols-2">
                      <h2 id="carac" className="sr-only">Características</h2>
                      {[['Características internas', p.internalFeatures], ['Características externas', p.externalFeatures]].map(([t, list]) => (list as string[]).length > 0 && (
                        <div key={t as string}>
                          <h3 className="eyebrow mb-4">{t as string}</h3>
                          <ul className="divide-y border-y hairline [&>li]:border-[rgb(var(--line)/var(--line-alpha))]">{(list as string[]).map((f) => <li key={f} className="py-2.5 text-[15px]">{f}</li>)}</ul>
                        </div>
                      ))}
                    </section>
                  )}
                  {p.video && (
                    <section aria-labelledby="video">
                      <h2 id="video" className="mb-4 text-xl font-medium">Vídeo</h2>
                      <video controls preload="none" poster={p.video.poster} className="aspect-video w-full rounded-lg bg-ink"><source src={p.video.src} /></video>
                      <p className="mt-2 text-xs text-muted">{p.video.caption}</p>
                    </section>
                  )}
                  <section aria-labelledby="ficha">
                    <h2 id="ficha" className="mb-4 text-xl font-medium">Ficha técnica</h2>
                    <dl className="grid gap-x-8 sm:grid-cols-2">
                      {[
                        ['Tipo', TYPE_LABEL[p.type]],
                        ['Finalidade', PURPOSE_LABEL[p.purpose]],
                        p.builtArea ? ['Área construída', `${p.builtArea} m²`] : null,
                        p.landArea ? ['Área do terreno', `${p.landArea} m²`] : null,
                        ['Quartos', p.type === 'studio' ? 'Integrado ao estar' : String(p.bedrooms)],
                        ['Suítes', String(p.suites)],
                        ['Banheiros', String(p.bathrooms)],
                        ['Vagas', String(p.parking)],
                        p.yearBuilt ? ['Ano de construção', String(p.yearBuilt)] : null,
                        p.architect ? ['Projeto', p.architect] : null,
                      ].filter((x): x is string[] => !!x).map(([k, v]) => (
                        <div key={k} className="flex justify-between gap-4 border-b py-3 text-[15px] hairline"><dt className="text-muted">{k}</dt><dd className="text-right font-medium">{v}</dd></div>
                      ))}
                    </dl>
                  </section>
                  {p.documentsAuthorized && p.documents && p.documents.length > 0 && (
                    <section aria-labelledby="docs">
                      <h2 id="docs" className="mb-4 flex items-center gap-2 text-xl font-medium"><FileText size={18} /> Documentos e informações técnicas</h2>
                      <dl className="surface divide-y [&>div]:border-[rgb(var(--line)/var(--line-alpha))]">
                        {p.documents.map((d) => <div key={d.label} className="flex justify-between gap-4 px-5 py-3 text-sm"><dt className="text-muted">{d.label}</dt><dd className="text-right">{d.value}</dd></div>)}
                      </dl>
                      <p className="mt-2 text-xs text-muted">Exibido com autorização do proprietário.</p>
                    </section>
                  )}
                </div>
              )}

              {tab === 'galeria' && (p.gallery.length ? <Gallery items={p.gallery} title={p.name} /> : <EmptyState title="Sem fotos adicionais" />)}

              {tab === 'tour-3d' && (
                <div className="space-y-12">
                  {has3d ? (
                    <section aria-labelledby="t3d" className="theme-dark">
                      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                        <h2 id="t3d" className="text-display-sm font-medium">Modelo 3D</h2>
                        {p.model3d!.demonstrative && <p className="text-xs text-muted">Modelo ilustrativo gerado a partir da planta. Não é um levantamento do imóvel.</p>}
                      </div>
                      <Viewer3DLauncher
                        key={String(autoStart3d)}
                        autoStart={autoStart3d}
                        model={p.model3d!}
                        title={p.name}
                        poster={p.gallery.find((m) => m.src.includes('aerea')) ?? p.cover}
                        selectedRoom={room?.roomId && rooms3d.includes(room.roomId) ? room.roomId : undefined}
                        onSelectRoom={(id) => setRoom(id ? { levelId: p.model3d!.rooms[id]?.level ?? '', roomId: id } : undefined)}
                        reducedMotion={reduced}
                        onGallery={() => changeTab('galeria')}
                        levelNames={levelNames}
                      />
                      {hasPlan && <p className="mt-3 text-sm text-muted">Dica: o ambiente escolhido aqui também fica marcado na <button type="button" className="text-signal hover:underline" onClick={() => changeTab('planta')}>planta baixa</button>.</p>}
                    </section>
                  ) : !hasTour && (
                    <ViewerFallback reason="sem-modelo" poster={p.cover} onGallery={() => changeTab('galeria')} />
                  )}
                  {hasTour && (
                    <section aria-labelledby="t360">
                      <h2 id="t360" className="mb-4 text-display-sm font-medium">Visita 360°</h2>
                      <Suspense fallback={<Skeleton className="aspect-[16/9] w-full" />}>
                        <VirtualTour panoramas={p.panoramas!} initial={room?.roomId} onRoomChange={(id) => setRoom((r) => ({ levelId: p.model3d?.rooms[id]?.level ?? r?.levelId ?? '', roomId: id }))} />
                      </Suspense>
                    </section>
                  )}
                </div>
              )}

              {tab === 'planta' && (hasPlan ? (
                <FloorPlanViewer plan={p.floorPlan!} selection={room} onSelect={setRoom} photos={p.gallery} rooms3d={rooms3d} onShow3D={has3d ? show3D : undefined} />
              ) : <EmptyState title="Planta não disponível" text="Peça a planta a um consultor." action={<button type="button" className="btn-primary" onClick={() => setDialog('informacoes')}>Solicitar planta</button>} />)}

              {tab === 'localizacao' && <LocationMap p={p} />}
            </div>
          </div>

          {/* ações principais */}
          <aside className="hidden lg:col-span-4 lg:block" aria-label="Contato sobre o imóvel">
            <div className="sticky top-[calc(var(--header-h)+1.5rem)] space-y-4">
              <div className="surface p-6">
                <dl className="space-y-2">
                  {costs.map((c, i) => <div key={c.k} className="flex items-baseline justify-between gap-4"><dt className="text-sm text-muted">{c.k}</dt><dd className={i === 0 ? 'text-2xl font-medium tabular-nums' : 'tabular-nums'}>{c.v}</dd></div>)}
                </dl>
                <div className="mt-6 grid gap-2">
                  <button type="button" className="btn-primary" onClick={() => setDialog('visita')}><CalendarCheck size={16} /> Agendar visita</button>
                  <a href={wa} target="_blank" rel="noopener noreferrer" className="btn-ghost"><MessageCircle size={16} /> Conversar no WhatsApp</a>
                  <button type="button" className="btn-ghost" onClick={() => setDialog('informacoes')}>Solicitar informações</button>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 border-t pt-4 hairline">
                  <FavoriteButton id={p.id} name={p.name} variant="ghost" className="px-2 text-[13px]" />
                  <ShareButton title={p.name} path={`/imovel/${p.slug}`} className="px-2 text-[13px]" />
                  <button type="button" onClick={() => toggleCompare(p.id, p.name)} aria-pressed={inCompare(p.id)} className={`inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded border px-2 text-[13px] transition ${inCompare(p.id) ? 'border-signal text-signal' : 'hairline hover:bg-fg/5'}`}><Scale size={15} /> Comparar</button>
                </div>
              </div>
              <div className="surface p-6">
                <h2 className="text-lg font-medium">Solicitar informações</h2>
                <p className="mb-5 mt-1 text-sm text-muted">Resposta por e-mail ou telefone.</p>
                <LeadForm kind="informacoes" propertyId={p.id} propertyName={p.name} source="pagina-imovel" />
              </div>
            </div>
          </aside>
        </div>

        {similar.length > 0 && (
          <section aria-labelledby="semelhantes" className="border-t pb-section pt-16 hairline">
            <div className="container">
              <h2 id="semelhantes" className="mb-10 text-display-md font-medium">Imóveis semelhantes</h2>
              <ul className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
                {similar.map((s, i) => <Reveal as="li" key={s.id} delay={i * 0.08}><PropertyCard p={s} /></Reveal>)}
              </ul>
            </div>
          </section>
        )}
      </div>

      {/* barra fixa no celular */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-ink/95 px-4 pb-[calc(env(safe-area-inset-bottom)+0.6rem)] pt-2.5 text-paper backdrop-blur lg:hidden">
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] text-mist">{p.name}</p>
            <p className="truncate text-[15px] font-medium tabular-nums">{formatPrice(p)}</p>
          </div>
          <FavoriteButton id={p.id} name={p.name} className="h-11 w-11 shrink-0" />
          <a href={wa} target="_blank" rel="noopener noreferrer" className="btn-icon h-11 w-11 shrink-0 border-white/15 bg-white/5" aria-label="Conversar no WhatsApp"><MessageCircle size={18} /></a>
          <button type="button" className="btn-primary min-h-[44px] shrink-0 px-4" onClick={() => setDialog('visita')}>Agendar</button>
        </div>
      </div>
      <div className="h-20 lg:hidden" aria-hidden />

      <Modal open={dialog !== null} onClose={() => setDialog(null)} title={dialog === 'visita' ? 'Agendar visita' : 'Solicitar informações'} description={p.name}>
        <div className="theme-dark px-5 pb-6">
          {dialog && <LeadForm kind={dialog} propertyId={p.id} propertyName={p.name} source={dialog === 'visita' ? 'agendamento' : 'pagina-imovel'} />}
          {dialog === 'visita' && <p className="mt-4 text-xs text-mist">Prefere outra forma? <ShareInline p={p} /></p>}
        </div>
      </Modal>
    </article>
  );
}

function ShareInline({ p }: { p: { name: string } }) {
  return <span>Fale com um consultor pela página de <TLink to="/contato" className="text-signal-soft hover:underline">contato</TLink> citando “{p.name}”.</span>;
}

function DetailSkeleton() {
  return (
    <div role="status" aria-label="Carregando imóvel">
      <Skeleton className="h-[78svh] w-full rounded-none" />
      <div className="container mt-10 grid gap-4 lg:w-2/3"><Skeleton className="h-6 w-1/2" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-5/6" /></div>
    </div>
  );
}
