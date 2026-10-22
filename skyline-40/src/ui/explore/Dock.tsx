import {
  ArrowDownToLine, ArrowUpToLine, Expand, Globe2, Layers, Layers3, Maximize, Minimize, Moon, PanelLeft, RotateCcw, Sun, Sunset, Square,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useSkyline, type TimeOfDay } from '../../state/store';
import { useFullscreen } from '../../hooks/useEnvironmentSync';
import { QUALITY_LABEL, type Quality } from '../../config/performance';
import type { ViewId } from '../../three/camera/views';

function DockBtn({ label, icon, on, onClick, kbd }: { label: string; icon: ReactNode; on?: boolean; onClick: () => void; kbd?: string }) {
  return (
    <button type="button" className={`dock__btn${on ? ' is-on' : ''}`} onClick={onClick} aria-pressed={on} title={kbd ? `${label} (${kbd})` : label}>
      {icon}
      <span>{label}</span>
    </button>
  );
}

const TIME: { id: TimeOfDay; label: string; icon: ReactNode }[] = [
  { id: 'day', label: 'Dia', icon: <Sun size={16} strokeWidth={1.7} /> },
  { id: 'sunset', label: 'Pôr do sol', icon: <Sunset size={16} strokeWidth={1.7} /> },
  { id: 'night', label: 'Noite', icon: <Moon size={16} strokeWidth={1.7} /> },
];

/** Controles de câmera e de cena (todos funcionais). */
export function Dock() {
  const view = useSkyline((s) => s.activeView);
  const mode = useSkyline((s) => s.mode);
  const exploded = useSkyline((s) => s.exploded);
  const gap = useSkyline((s) => s.explodeGap);
  const tod = useSkyline((s) => s.timeOfDay);
  const [layersOpen, setLayersOpen] = useState(false);
  const { active: fs, toggle } = useFullscreen();
  const s = useSkyline.getState;
  const v = (id: ViewId) => mode === 'overview' && view === id;
  const ic = { size: 17, strokeWidth: 1.6 };

  return (
    <div className="dock-wrap">
      {exploded && (
        <div className="explode-ctl" role="group" aria-label="Distância entre pavimentos">
          <label htmlFor="gap">Distância entre pavimentos</label>
          <input id="gap" type="range" min={1} max={14} step={0.5} value={gap} onChange={(e) => s().setExplodeGap(Number(e.target.value))} />
          <output>{gap.toFixed(1).replace('.', ',')} m</output>
          <button type="button" className="chip" onClick={() => s().toggleExploded(false)}>Juntar</button>
        </div>
      )}
      {layersOpen && <LayersPanel onClose={() => setLayersOpen(false)} />}
      <nav className="dock" aria-label="Controles de câmera">
        <DockBtn label="Visão geral" kbd="1" icon={<Globe2 {...ic} />} on={v('overview')} onClick={() => s().setView('overview')} />
        <DockBtn label="Superior" kbd="2" icon={<ArrowDownToLine {...ic} />} on={v('top')} onClick={() => s().setView('top')} />
        <DockBtn label="Inferior" kbd="3" icon={<ArrowUpToLine {...ic} />} on={v('bottom')} onClick={() => s().setView('bottom')} />
        <DockBtn label="Frontal" kbd="4" icon={<Square {...ic} />} on={v('front')} onClick={() => s().setView('front')} />
        <DockBtn label="Lateral" kbd="5" icon={<PanelLeft {...ic} />} on={v('side')} onClick={() => s().setView('side')} />
        <DockBtn label="Explodida" kbd="E" icon={<Layers3 {...ic} />} on={exploded} onClick={() => s().toggleExploded()} />
        <span className="dock__sep" aria-hidden="true" />
        <div className="dock__time" role="group" aria-label="Horário">
          {TIME.map((t) => (
            <button key={t.id} type="button" className={tod === t.id ? 'is-on' : ''} aria-pressed={tod === t.id} onClick={() => s().setTimeOfDay(t.id)} title={`${t.label} (N alterna)`}>
              {t.icon}
              <span className="sr-only">{t.label}</span>
            </button>
          ))}
        </div>
        <DockBtn label={tod === 'night' ? 'Modo diurno' : 'Modo noturno'} icon={tod === 'night' ? <Sun {...ic} /> : <Moon {...ic} />} on={tod === 'night'} onClick={() => s().setTimeOfDay(tod === 'night' ? 'day' : 'night')} kbd="N" />
        <span className="dock__sep" aria-hidden="true" />
        <DockBtn label="Camadas" icon={<Layers {...ic} />} on={layersOpen} onClick={() => setLayersOpen((o) => !o)} />
        <DockBtn label={fs ? 'Sair da tela cheia' : 'Tela cheia'} kbd="F" icon={fs ? <Minimize {...ic} /> : <Maximize {...ic} />} onClick={toggle} />
        <DockBtn label="Reiniciar câmera" kbd="R" icon={<RotateCcw {...ic} />} onClick={() => s().resetCamera()} />
      </nav>
    </div>
  );
}

function Toggle({ label, desc, on, onChange }: { label: string; desc: string; on: boolean; onChange: () => void }) {
  return (
    <label className="toggle">
      <span>
        <strong>{label}</strong>
        <small>{desc}</small>
      </span>
      <input type="checkbox" role="switch" checked={on} onChange={onChange} />
      <i aria-hidden="true" />
    </label>
  );
}

export function LayersPanel({ onClose, embedded }: { onClose?: () => void; embedded?: boolean }) {
  const layers = useSkyline((s) => s.layers);
  const quality = useSkyline((s) => s.quality);
  const auto = useSkyline((s) => s.autoQuality);
  const s = useSkyline.getState;
  return (
    <div className={`layers${embedded ? ' layers--embedded' : ''}`} role="dialog" aria-label="Camadas da cena">
      <div className="layers__head">
        <strong>Camadas da cena</strong>
        {onClose && (
          <button type="button" className="icon-btn icon-btn--sm" onClick={onClose} aria-label="Fechar camadas">
            <Expand size={14} style={{ transform: 'rotate(45deg)' }} />
          </button>
        )}
      </div>
      <Toggle label="Fachada" desc="Oculte a pele de vidro para ver os interiores" on={layers.facade} onChange={() => s().setLayer('facade')} />
      <Toggle label="Modo técnico" desc="Estrutura, núcleo e elevadores em destaque" on={layers.technical} onChange={() => s().setLayer('technical')} />
      <Toggle label="Paisagismo" desc="Árvores, jardins e canteiros" on={layers.landscape} onChange={() => s().setLayer('landscape')} />
      <Toggle label="Iluminação arquitetônica" desc="LEDs, piscina, postes e balizadores" on={layers.archLights} onChange={() => s().setLayer('archLights')} />
      <Toggle label="Entorno" desc="Cidade e orla ao redor" on={layers.context} onChange={() => s().setLayer('context')} />
      <div className="layers__quality">
        <span>Qualidade gráfica</span>
        <div className="segmented segmented--sm" role="group" aria-label="Qualidade gráfica">
          {(['low', 'medium', 'high'] as Quality[]).map((q) => (
            <button key={q} type="button" className={quality === q ? 'is-on' : ''} aria-pressed={quality === q} onClick={() => s().setQuality(q, false)}>
              {QUALITY_LABEL[q]}
            </button>
          ))}
        </div>
        <small>{auto ? 'Ajuste automático ativo conforme o desempenho do aparelho.' : 'Ajuste manual.'}</small>
      </div>
    </div>
  );
}
