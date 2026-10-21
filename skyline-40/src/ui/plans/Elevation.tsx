import { FLOORS, FLOOR_COUNT, ROOF_Y, floorBaseY, floorHeight, floorLabel, floorSector, getFloorInfo } from '../../data/building';
import { GARAGE_CONFIG, garageLevels } from '../../data/garage';

interface Props {
  selected?: number | null;
  onSelect?: (n: number) => void;
  onGarage?: (level: number) => void;
  onRoof?: () => void;
  height?: number;
}

/** Corte esquemático vertical do edifício (40 pavimentos + subsolos), clicável. */
export function Elevation({ selected, onSelect, onGarage, onRoof, height = 520 }: Props) {
  const depth = GARAGE_CONFIG.levels * GARAGE_CONFIG.levelHeight;
  const total = ROOF_Y + 9 + depth;
  const top = ROOF_Y + 9;
  const k = height / total;
  const y = (v: number) => (top - v) * k;
  const w = 120;
  return (
    <svg className="elevation" viewBox={`-70 -4 ${w + 140} ${height + 8}`} role="group" aria-label="Corte esquemático com os 40 pavimentos e subsolos">
      {/* coroamento e cobertura */}
      <rect x={-4} y={y(ROOF_Y + 7)} width={w + 8} height={(7) * k} className="elev__crown" />
      <g
        className={`elev__floor elev__roof${onRoof ? ' is-link' : ''}`}
        onClick={onRoof}
        role={onRoof ? 'button' : undefined}
        tabIndex={onRoof ? 0 : undefined}
        aria-label="Cobertura com piscina"
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onRoof?.()}
      >
        <rect x={-4} y={y(ROOF_Y + 7)} width={w + 70} height={8 * k} className="elev__hit" />
        <rect x={0} y={y(ROOF_Y + 1.2)} width={w} height={1.2 * k} />
        <rect x={8} y={y(ROOF_Y + 0.7)} width={w * 0.55} height={0.5 * k} className="elev__pool" />
        <text x={w + 10} y={y(ROOF_Y + 0.5)}>Cobertura</text>
      </g>
      {FLOORS.map((n) => {
        const info = getFloorInfo(n);
        const sector = floorSector(n);
        const yy = y(floorBaseY(n) + floorHeight(n));
        const hh = floorHeight(n) * k - 0.6;
        const showLabel = n === 1 || n % 5 === 0 || n === FLOOR_COUNT || selected === n;
        return (
          <g
            key={n}
            className={`elev__floor${selected === n ? ' is-selected' : ''}${onSelect ? ' is-link' : ''}`}
            onClick={() => onSelect?.(n)}
            role={onSelect ? 'button' : undefined}
            tabIndex={onSelect ? 0 : undefined}
            aria-label={`Pavimento ${floorLabel(n)} — ${info.title}`}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelect?.(n)}
          >
            <rect x={-30} y={yy} width={w + 100} height={Math.max(hh, 1)} className="elev__hit" />
            <rect x={0} y={yy} width={w} height={Math.max(hh, 1)} style={{ fill: sector.color }} />
            {showLabel && <text x={-8} y={yy + hh / 2 + 3} textAnchor="end">{floorLabel(n)}</text>}
            {info.units === 0 && <text x={w + 10} y={yy + hh / 2 + 3}>{info.title}</text>}
          </g>
        );
      })}
      <line x1={-60} x2={w + 70} y1={y(0)} y2={y(0)} className="elev__ground" />
      <text x={-60} y={y(0) - 4} className="elev__muted">térreo ±0,00</text>
      {garageLevels().map((g) => (
        <g
          key={g.id}
          className={`elev__floor elev__garage${onGarage ? ' is-link' : ''}`}
          onClick={() => onGarage?.(g.index)}
          role={onGarage ? 'button' : undefined}
          tabIndex={onGarage ? 0 : undefined}
          aria-label={`Garagem ${g.id}`}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onGarage?.(g.index)}
        >
          <rect x={-40} y={y(g.y + GARAGE_CONFIG.levelHeight) + 0.5} width={w + 80} height={GARAGE_CONFIG.levelHeight * k - 1} />
          <text x={-8} y={y(g.y + GARAGE_CONFIG.levelHeight / 2) + 3} textAnchor="end">{g.id}</text>
        </g>
      ))}
    </svg>
  );
}
