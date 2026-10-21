import type { Model3D } from '@/types/property';
import type { AnchorMap } from './ScreenProjector';

/**
 * Marcadores dos ambientes: botões comuns sobre o canvas (focáveis pelo teclado), posicionados a cada quadro
 * pelo ScreenProjector a partir das posições 3D cadastradas.
 */
export function RoomHotspots({ rooms, selected, onSelect, anchors }: { rooms: Model3D['rooms']; selected?: string; onSelect: (id: string) => void; anchors: AnchorMap }) {
  return (
    <div role="group" className="pointer-events-none absolute inset-0 overflow-hidden" aria-label="Ambientes no modelo">
      {Object.entries(rooms).map(([id, r]) => (
        <button
          key={id}
          ref={(el) => { anchors.current.set(id, el); }}
          type="button"
          onClick={() => onSelect(id)}
          aria-pressed={selected === id}
          style={{ visibility: 'hidden' }}
          className={`pointer-events-auto absolute left-0 top-0 flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11.5px] font-medium shadow-lg backdrop-blur-md transition-colors ${selected === id ? 'border-signal bg-signal text-white' : 'border-white/25 bg-ink/60 text-paper hover:bg-ink/85'}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${selected === id ? 'bg-white' : 'bg-signal'}`} />
          {r.label}
        </button>
      ))}
    </div>
  );
}
