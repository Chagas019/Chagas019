import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Box, Maximize2, Minus, Plus, Sofa } from 'lucide-react';
import type { FloorPlan, Media } from '@/types/property';
import { bounds, roomArea } from '@/lib/plan';
import { formatNumber } from '@/lib/format';
import { PanZoom, type PanZoomHandle } from './PanZoom';
import { PAD, PlanSvg, S } from './PlanSvg';

export interface RoomSelection { levelId: string; roomId: string }

interface Props {
  plan: FloorPlan;
  selection?: RoomSelection;
  onSelect: (s: RoomSelection | undefined) => void;
  photos: Media[];
  /** ambientes que existem no modelo 3D (para o botão "Ver no 3D") */
  rooms3d?: string[];
  onShow3D?: (roomId: string) => void;
}

/** Planta interativa (vetorial) ou planta em imagem com marcadores — nunca finge geometria que não existe. */
export function FloorPlanViewer({ plan, selection, onSelect, photos, rooms3d = [], onShow3D }: Props) {
  const [levelId, setLevelId] = useState(selection?.levelId ?? plan.levels[0].id);
  const [furniture, setFurniture] = useState(true);
  const [hover, setHover] = useState<string>();
  const pz = useRef<PanZoomHandle>(null);
  useEffect(() => { if (selection && selection.levelId !== levelId) setLevelId(selection.levelId); }, [selection]); // eslint-disable-line react-hooks/exhaustive-deps

  const selected = selection?.levelId === levelId ? selection.roomId : undefined;
  const select = (roomId: string) => onSelect(roomId === selected ? undefined : { levelId, roomId });

  let content: React.ReactNode;
  let size = { w: 0, h: 0 };
  let roomList: { id: string; name: string; area?: number; description?: string; features?: string[] }[] = [];

  if (plan.kind === 'vetorial') {
    const level = plan.levels.find((l) => l.id === levelId) ?? plan.levels[0];
    size = { w: (level.width + PAD * 2) * S, h: (level.depth + PAD * 2) * S };
    content = <PlanSvg level={level} selected={selected} hovered={hover} onSelect={select} onHover={setHover} showFurniture={furniture} />;
    roomList = level.rooms.map((r) => ({ id: r.id, name: r.name, area: roomArea(r), description: r.description, features: r.features }));
  } else {
    const level = plan.levels.find((l) => l.id === levelId) ?? plan.levels[0];
    size = { w: level.image.width, h: level.image.height };
    roomList = level.hotspots.map((h) => ({ id: h.roomId, name: h.name, area: h.area }));
    content = (
      <div className="relative" style={{ width: size.w, height: size.h }}>
        <img src={level.image.src} alt={level.image.alt} width={size.w} height={size.h} draggable={false} className="block" />
        {level.hotspots.map((h) => (
          <button
            key={h.roomId}
            type="button"
            onClick={() => select(h.roomId)}
            className={`absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border-2 px-4 py-2 text-[26px] font-medium shadow-lg transition ${selected === h.roomId ? 'border-white bg-signal text-white' : 'border-white bg-ink/80 text-paper hover:bg-ink'}`}
            style={{ left: `${h.x}%`, top: `${h.y}%` }}
          >
            {h.name}
          </button>
        ))}
      </div>
    );
  }

  const info = roomList.find((r) => r.id === selected);
  const roomPhotos = selected ? photos.filter((m) => m.roomId === selected) : [];

  const focusRoom = (id: string) => {
    if (plan.kind !== 'vetorial') return;
    const level = plan.levels.find((l) => l.id === levelId)!;
    const r = level.rooms.find((x) => x.id === id);
    if (!r) return;
    const b = bounds(r.polygon);
    pz.current?.focus((b.cx + PAD) * S, (b.cy + PAD) * S, Math.min(3, Math.max(1.4, 8 / Math.max(b.w, b.h))));
  };

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <div className="lg:col-span-8">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          {plan.levels.length > 1 ? (
            <div role="group" aria-label="Pavimento" className="inline-flex rounded border p-1 hairline">
              {plan.levels.map((l) => (
                <button key={l.id} type="button" aria-pressed={l.id === levelId} onClick={() => { setLevelId(l.id); onSelect(undefined); }} className={`min-h-[36px] rounded-sm px-3 text-[13px] transition ${l.id === levelId ? 'bg-fg text-bg' : 'text-muted hover:text-fg'}`}>{l.name}</button>
              ))}
            </div>
          ) : <span className="eyebrow">{plan.levels[0].name}</span>}
          <div className="flex items-center gap-1.5">
            {plan.kind === 'vetorial' && (
              <button type="button" aria-pressed={furniture} onClick={() => setFurniture((v) => !v)} className={`btn-icon h-10 w-10 ${furniture ? '' : 'opacity-60'}`} aria-label={furniture ? 'Ocultar mobiliário' : 'Mostrar mobiliário'} title="Mobiliário ilustrativo"><Sofa size={16} /></button>
            )}
            <button type="button" onClick={() => pz.current?.zoomOut()} className="btn-icon h-10 w-10" aria-label="Afastar"><Minus size={16} /></button>
            <button type="button" onClick={() => pz.current?.zoomIn()} className="btn-icon h-10 w-10" aria-label="Aproximar"><Plus size={16} /></button>
            <button type="button" onClick={() => pz.current?.fit()} className="btn-icon h-10 w-10" aria-label="Ajustar à tela"><Maximize2 size={16} /></button>
          </div>
        </div>
        <PanZoom ref={pz} width={size.w} height={size.h} label="Planta baixa" className="h-[58vh] min-h-[360px] rounded-lg border bg-[#F5F7FB] hairline">
          {content}
        </PanZoom>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-muted">
          <p>{plan.source}</p>
          {plan.kind === 'vetorial' && (
            <ul className="flex flex-wrap gap-4" aria-label="Legenda">
              <li className="flex items-center gap-1.5"><span className="h-1.5 w-4 bg-ink" /> Parede</li>
              <li className="flex items-center gap-1.5"><span className="h-0.5 w-4 bg-signal" /> Vidro / janela</li>
              <li className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm border border-dashed border-muted" /> Mobiliário ilustrativo</li>
            </ul>
          )}
        </div>
        <p className="mt-2 text-xs text-muted">Arraste para mover, use a roda do mouse ou a pinça para aproximar e toque em um ambiente para ver os detalhes.</p>
      </div>

      <aside className="lg:col-span-4" aria-label="Ambientes">
        <AnimatePresence mode="wait">
          {info ? (
            <motion.div key={info.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="surface overflow-hidden" aria-live="polite">
              {roomPhotos[0] && <img src={roomPhotos[0].thumb ?? roomPhotos[0].src} alt={roomPhotos[0].alt} width={800} height={533} className="aspect-[3/2] w-full object-cover" />}
              <div className="p-5">
                <p className="eyebrow">{plan.levels.find((l) => l.id === levelId)?.name}</p>
                <h3 className="mt-1 text-xl font-medium tracking-tight">{info.name}</h3>
                {info.area !== undefined && <p className="mt-1 font-mono text-sm text-muted">{formatNumber(info.area)} m²{plan.kind === 'imagem' ? ' (informada)' : ''}</p>}
                {info.description && <p className="mt-3 text-sm leading-relaxed">{info.description}</p>}
                {info.features && info.features.length > 0 && <ul className="mt-3 space-y-1 text-sm text-muted">{info.features.map((f) => <li key={f}>— {f}</li>)}</ul>}
                <div className="mt-5 flex flex-wrap gap-2">
                  {plan.kind === 'vetorial' && <button type="button" className="btn-ghost min-h-[40px] text-[13px]" onClick={() => focusRoom(info.id)}>Aproximar na planta</button>}
                  {onShow3D && rooms3d.includes(info.id) && <button type="button" className="btn-primary min-h-[40px] text-[13px]" onClick={() => onShow3D(info.id)}><Box size={15} /> Ver no 3D</button>}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.p key="hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="surface p-5 text-sm text-muted">Selecione um ambiente na planta ou na lista para ver área, descrição e fotos.</motion.p>
          )}
        </AnimatePresence>
        <ul className="mt-4 divide-y rounded-lg border hairline [&>li]:border-[rgb(var(--line)/var(--line-alpha))]">
          {roomList.map((r) => (
            <li key={r.id}>
              <button type="button" aria-pressed={r.id === selected} onClick={() => select(r.id)} onMouseEnter={() => setHover(r.id)} onMouseLeave={() => setHover(undefined)} className={`flex min-h-[44px] w-full items-center justify-between gap-3 px-4 text-left text-sm transition ${r.id === selected ? 'bg-signal/10 text-signal' : 'hover:bg-fg/[0.04]'}`}>
                <span>{r.name}</span>
                {r.area !== undefined && <span className="font-mono text-xs text-muted">{formatNumber(r.area)} m²</span>}
              </button>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
