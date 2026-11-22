import { CircleHelp, Expand, Layers3, Moon, RotateCcw, RotateCw, Shrink, Sun, Tag } from 'lucide-react';
import { Tooltip } from '@/components/ui/Tooltip';

interface Props {
  night: boolean;
  onNight?: () => void;
  levels: { id: string; name: string }[];
  cut: string | null;
  onCut: (id: string | null) => void;
  labels: boolean;
  onLabels: () => void;
  autoRotate: boolean;
  onAutoRotate?: () => void;
  fullscreen: boolean;
  onFullscreen: () => void;
  onReset: () => void;
  onHelp: () => void;
}

const btn = 'inline-flex h-10 w-10 items-center justify-center rounded border border-white/10 bg-ink/60 text-paper backdrop-blur-md transition hover:bg-ink/90 aria-pressed:border-signal aria-pressed:bg-signal/80';

/** Controles do 3D — todos visíveis (não dependem de hover) e com rótulo acessível */
export function ViewerToolbar(p: Props) {
  return (
    <div className="absolute inset-x-3 bottom-3 flex flex-wrap items-end justify-end gap-2">
      {p.levels.length > 0 && (
        <div role="group" aria-label="Corte por pavimento" className="mr-auto flex items-center gap-1 rounded border border-white/10 bg-ink/60 p-1 backdrop-blur-md">
          <Layers3 size={15} className="mx-1.5 text-mist" aria-hidden />
          <button type="button" aria-pressed={p.cut === null} onClick={() => p.onCut(null)} className={`min-h-[32px] rounded-sm px-2.5 text-[12px] ${p.cut === null ? 'bg-paper text-ink' : 'text-paper/75 hover:text-paper'}`}>Externo</button>
          {p.levels.map((l) => (
            <button key={l.id} type="button" aria-pressed={p.cut === l.id} onClick={() => p.onCut(l.id)} className={`min-h-[32px] rounded-sm px-2.5 text-[12px] ${p.cut === l.id ? 'bg-paper text-ink' : 'text-paper/75 hover:text-paper'}`}>{l.name}</button>
          ))}
        </div>
      )}
      <div className="flex gap-1.5">
        {p.onNight && <Tooltip label={p.night ? 'Modo diurno' : 'Modo noturno'}><button type="button" className={btn} aria-pressed={p.night} aria-label={p.night ? 'Mudar para modo diurno' : 'Mudar para modo noturno'} onClick={p.onNight}>{p.night ? <Sun size={16} /> : <Moon size={16} />}</button></Tooltip>}
        <Tooltip label="Nomes dos ambientes"><button type="button" className={btn} aria-pressed={p.labels} aria-label="Mostrar nomes dos ambientes" onClick={p.onLabels}><Tag size={16} /></button></Tooltip>
        {p.onAutoRotate && <Tooltip label="Girar 360°"><button type="button" className={btn} aria-pressed={p.autoRotate} aria-label="Girar automaticamente em 360 graus" onClick={p.onAutoRotate}><RotateCw size={16} /></button></Tooltip>}
        <Tooltip label="Vista inicial"><button type="button" className={btn} aria-label="Voltar à vista inicial" onClick={p.onReset}><RotateCcw size={16} /></button></Tooltip>
        <Tooltip label="Ajuda"><button type="button" className={btn} aria-label="Como usar o visualizador" onClick={p.onHelp}><CircleHelp size={16} /></button></Tooltip>
        <Tooltip label={p.fullscreen ? 'Sair da tela cheia' : 'Tela cheia'}><button type="button" className={btn} aria-pressed={p.fullscreen} aria-label={p.fullscreen ? 'Sair da tela cheia' : 'Abrir em tela cheia'} onClick={p.onFullscreen}>{p.fullscreen ? <Shrink size={16} /> : <Expand size={16} />}</button></Tooltip>
      </div>
    </div>
  );
}
