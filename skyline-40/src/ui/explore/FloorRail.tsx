import { ChevronDown, ChevronUp } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { FLOORS, floorLabel, floorSector, getFloorInfo } from '../../data/building';
import { garageLevels } from '../../data/garage';
import { useSkyline } from '../../state/store';

/** Menu de pavimentos: cobertura, 40 → 01 e subsolos, com cor por setor. */
export function FloorRail({ embedded }: { embedded?: boolean }) {
  const selected = useSkyline((s) => s.selectedFloor);
  const hovered = useSkyline((s) => s.hoveredFloor);
  const mode = useSkyline((s) => s.mode);
  const garageLevel = useSkyline((s) => s.garageLevel);
  const list = useRef<HTMLDivElement>(null);
  const s = useSkyline.getState;
  const floors = [...FLOORS].reverse();

  useEffect(() => {
    if (!selected || !list.current) return;
    const el = list.current.querySelector<HTMLElement>(`[data-floor="${selected}"]`);
    el?.scrollIntoView({ block: 'nearest', behavior: s().reducedMotion ? 'auto' : 'smooth' });
  }, [selected, s]);

  return (
    <aside className={`rail${embedded ? ' rail--embedded' : ''}`} aria-label="Pavimentos">
      <div className="rail__head">Pavimentos</div>
      <button type="button" className={`rail__item rail__item--roof${mode === 'rooftop' ? ' is-on' : ''}`} onClick={() => s().openRooftop()}>
        <span>COB</span>
        <small>Piscina</small>
      </button>
      <button type="button" className="rail__step" onClick={() => s().stepFloor(1)} aria-label="Pavimento acima">
        <ChevronUp size={16} />
      </button>
      <div className="rail__list" ref={list} role="listbox" aria-label="Selecionar pavimento">
        {floors.map((n) => {
          const sector = floorSector(n);
          const info = getFloorInfo(n);
          const on = selected === n && (mode === 'floor' || mode === 'apartment');
          return (
            <button
              key={n}
              type="button"
              role="option"
              aria-selected={on}
              data-floor={n}
              className={`rail__item${on ? ' is-on' : ''}${hovered === n ? ' is-hover' : ''}${info.units === 0 ? ' is-common' : ''}`}
              style={{ ['--sector' as string]: sector.color }}
              onClick={() => s().selectFloor(n)}
              onMouseEnter={() => s().hoverFloor(n)}
              onMouseLeave={() => s().hoverFloor(null)}
              title={`${floorLabel(n)} · ${info.title}`}
            >
              <span>{floorLabel(n)}</span>
              {info.units === 0 && <small>{info.title.split(' ')[0]}</small>}
            </button>
          );
        })}
      </div>
      <button type="button" className="rail__step" onClick={() => s().stepFloor(-1)} aria-label="Pavimento abaixo">
        <ChevronDown size={16} />
      </button>
      {garageLevels().map((g) => (
        <button
          key={g.id}
          type="button"
          className={`rail__item rail__item--garage${mode === 'garage' && garageLevel === g.index ? ' is-on' : ''}`}
          onClick={() => s().openGarage(g.index)}
        >
          <span>{g.id}</span>
          <small>Garagem</small>
        </button>
      ))}
    </aside>
  );
}
