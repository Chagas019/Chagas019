import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Viewer3DLauncher } from '@/components/viewer3d/Viewer3DLauncher';
import { FloorPlanViewer, type RoomSelection } from '@/components/floorplan/FloorPlanViewer';
import { TLink } from '@/components/ui/TLink';
import { EmptyState, Skeleton } from '@/components/ui/States';
import { WordReveal, Reveal } from '@/components/motion/Reveal';
import { useProperties } from '@/hooks/useData';
import { useMotionPref } from '@/hooks/useMotionPref';
import { useSeo } from '@/hooks/useSeo';

/** Página dedicada à experiência 3D: modelo e planta lado a lado, sincronizados */
export default function ExperiencePage() {
  const { data, loading } = useProperties();
  const { reduced } = useMotionPref();
  const options = (data ?? []).filter((p) => p.model3d);
  const [slug, setSlug] = useState<string>();
  const p = options.find((o) => o.slug === slug) ?? options[0];
  const [room, setRoom] = useState<RoomSelection>();
  useSeo({ title: 'Experiência 3D | NEXORA Real Estate', description: 'Explore imóveis em 3D: gire o modelo, entre nos ambientes, alterne dia e noite e sincronize com a planta baixa.', path: '/experiencia-3d' });

  return (
    <div className="bg-ink pb-section pt-[calc(var(--header-h)+3rem)] text-paper">
      <div className="container">
        <header className="mb-10 grid gap-6 md:grid-cols-12 md:items-end">
          <div className="md:col-span-8">
            <p className="eyebrow mb-4">Experiência 3D</p>
            <WordReveal as="h1" text="Explore cada espaço antes de visitar." className="text-display-lg font-medium" />
          </div>
          <Reveal className="md:col-span-4">
            <p className="text-paper/70">Modelos demonstrativos gerados a partir das plantas. Quando a imobiliária enviar o modelo real de um imóvel (.glb), ele substitui a demonstração sem mudar nada na página.</p>
          </Reveal>
        </header>
        {loading ? <Skeleton className="aspect-[16/10] w-full" /> : !p ? (
          <EmptyState title="Nenhum imóvel com modelo 3D publicado" action={<TLink to="/imoveis" className="btn-primary">Ver imóveis</TLink>} />
        ) : (
          <>
            {options.length > 1 && (
              <div role="group" aria-label="Escolha o imóvel" className="mb-4 flex flex-wrap gap-2">
                {options.map((o) => (
                  <button key={o.slug} type="button" aria-pressed={o.slug === p.slug} onClick={() => { setSlug(o.slug); setRoom(undefined); }} className={`min-h-[40px] rounded border px-4 text-sm transition ${o.slug === p.slug ? 'border-paper bg-paper text-ink' : 'border-white/15 text-paper/75 hover:text-paper'}`}>{o.name}</button>
                ))}
              </div>
            )}
            <Viewer3DLauncher
              key={p.slug}
              model={p.model3d!}
              title={p.name}
              poster={p.gallery.find((m) => m.src.includes('aerea')) ?? p.cover}
              selectedRoom={room?.roomId}
              onSelectRoom={(id) => setRoom(id ? { levelId: p.model3d!.rooms[id]?.level ?? '', roomId: id } : undefined)}
              reducedMotion={reduced}
              levelNames={p.floorPlan ? Object.fromEntries(p.floorPlan.levels.map((l) => [l.id, l.name])) : {}}
            />
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-paper/60">{p.name} · imóvel de demonstração</p>
              <TLink to={`/imovel/${p.slug}`} className="inline-flex items-center gap-1.5 text-sm text-signal-soft hover:underline">Ver página do imóvel <ArrowRight size={14} /></TLink>
            </div>
            {p.floorPlan && (
              <section aria-labelledby="planta-sync" className="theme-light mt-16 rounded-xl bg-bg p-5 text-fg md:p-8">
                <h2 id="planta-sync" className="mb-2 text-display-sm font-medium">Planta sincronizada</h2>
                <p className="mb-6 text-sm text-muted">Escolha um ambiente aqui e use “Ver no 3D”: a câmera do modelo vai até ele.</p>
                <FloorPlanViewer plan={p.floorPlan} selection={room} onSelect={setRoom} photos={p.gallery} rooms3d={Object.keys(p.model3d!.rooms)} onShow3D={(id) => { setRoom({ levelId: p.model3d!.rooms[id]?.level ?? '', roomId: id }); window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' }); }} />
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
