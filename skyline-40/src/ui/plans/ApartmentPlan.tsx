import { DOORS, FURNITURE, ROOMS, WALLS, roomArea } from '../../data/apartment';

interface Props {
  activeRoom?: string;
  onRoom?: (id: string) => void;
  compact?: boolean;
  title?: string;
}

const PAD = 0.8;
const minX = -PAD;
const minZ = -PAD;
const W = 15 + PAD * 2;
const D = 13 + PAD * 2;

/**
 * Planta superior do apartamento tipo em SVG: paredes, portas com arco de abertura,
 * mobiliário e áreas (exemplos editáveis). Norte da planta = fachada frontal (mar) no topo.
 */
export function ApartmentPlan({ activeRoom, onRoom, compact, title = 'Planta do apartamento tipo — unidade B' }: Props) {
  // Z local cresce em direção à fachada frontal; no desenho a fachada fica em cima.
  const fy = (z: number) => D - (z - minZ);
  const clickable = (id: string) => Boolean(onRoom && ROOMS.find((r) => r.id === id)?.eye);
  return (
    <figure className={`plan${compact ? ' plan--compact' : ''}`}>
      <svg viewBox={`${minX} 0 ${W} ${D}`} role="img" aria-label={title}>
        <title>{title}</title>
        {/* áreas */}
        {ROOMS.filter((r) => r.id !== 'lavabo').map((r) => (
          <rect
            key={r.id}
            x={r.x[0]}
            y={fy(r.z[1])}
            width={r.x[1] - r.x[0]}
            height={r.z[1] - r.z[0]}
            className={`plan__room plan__room--${r.id}${activeRoom === r.id ? ' is-active' : ''}${clickable(r.id) ? ' is-link' : ''}`}
            onClick={clickable(r.id) ? () => onRoom?.(r.id) : undefined}
          />
        ))}
        <rect x={6} y={fy(4.2)} width={1.5} height={1.7} className="plan__room plan__room--lavabo" />
        {/* núcleo / hall (fora da unidade) */}
        <rect x={0} y={fy(2.5)} width={6} height={2.5} className="plan__core" />
        <text x={3} y={fy(1.1)} className="plan__muted">hall · núcleo</text>
        {/* fachadas envidraçadas */}
        <line x1={0} y1={fy(11)} x2={15} y2={fy(11)} className="plan__glass" />
        <line x1={15} y1={fy(0)} x2={15} y2={fy(11)} className="plan__glass" />
        <line x1={1} y1={fy(13)} x2={15} y2={fy(13)} className="plan__rail" />
        {/* mobiliário */}
        {FURNITURE.filter((f) => f.kind !== 'pendant' && f.kind !== 'lamp').map((f, i) => {
          const rot = f.rot ?? 0;
          return (
            <rect
              key={i}
              x={-f.w / 2}
              y={-f.d / 2}
              width={f.w}
              height={f.d}
              rx={f.kind === 'plant' ? f.w / 2 : 0.05}
              transform={`translate(${f.x} ${fy(f.z)}) rotate(${-rot})`}
              className={`plan__furn plan__furn--${f.kind}`}
            />
          );
        })}
        {/* paredes */}
        {WALLS.map((w, i) => {
          const horizontal = w.a[1] === w.b[1];
          const x = Math.min(w.a[0], w.b[0]) - w.t / 2;
          const z1 = Math.max(w.a[1], w.b[1]);
          return horizontal ? (
            <rect key={i} x={x} y={fy(w.a[1]) - w.t / 2} width={Math.abs(w.b[0] - w.a[0]) + w.t} height={w.t} className="plan__wall" />
          ) : (
            <rect key={i} x={w.a[0] - w.t / 2} y={fy(z1) - w.t / 2} width={w.t} height={Math.abs(w.b[1] - w.a[1]) + w.t} className="plan__wall" />
          );
        })}
        {/* portas com arco */}
        {DOORS.map((d, i) => {
          const r = d.width - 0.06;
          if (d.axis === 'x') {
            const hx = d.at[0] - d.width / 2;
            const hz = fy(d.at[1]);
            const tipY = hz - d.swing * r;
            return (
              <g key={i} className="plan__door">
                <line x1={hx} y1={hz} x2={hx} y2={tipY} />
                <path d={`M ${hx} ${tipY} A ${r} ${r} 0 0 ${d.swing > 0 ? 1 : 0} ${hx + r} ${hz}`} />
              </g>
            );
          }
          const hx = d.at[0];
          const hz = fy(d.at[1] - d.width / 2);
          const tipX = hx + d.swing * r;
          return (
            <g key={i} className="plan__door">
              <line x1={hx} y1={hz} x2={tipX} y2={hz} />
              <path d={`M ${tipX} ${hz} A ${r} ${r} 0 0 0 ${hx} ${hz - r}`} />
            </g>
          );
        })}
        {/* rótulos */}
        {!compact &&
          ROOMS.filter((r) => !['lavabo', 'circulacao', 'closet', 'banhoMaster', 'banho2'].includes(r.id)).map((r) => (
            <g key={r.id} className="plan__label" pointerEvents="none">
              <text x={(r.x[0] + r.x[1]) / 2} y={fy((r.z[0] + r.z[1]) / 2) - 0.15}>{r.name}</text>
              <text x={(r.x[0] + r.x[1]) / 2} y={fy((r.z[0] + r.z[1]) / 2) + 0.45} className="plan__area">{roomArea(r).toFixed(1).replace('.', ',')} m²</text>
            </g>
          ))}
        {/* escala e orientação */}
        <g className="plan__scale" transform={`translate(${minX + 0.2} ${D - 0.35})`}>
          <line x1={0} y1={0} x2={5} y2={0} />
          <line x1={0} y1={-0.15} x2={0} y2={0.15} />
          <line x1={5} y1={-0.15} x2={5} y2={0.15} />
          <text x={2.5} y={-0.25}>5 m</text>
        </g>
        <text x={7.5} y={0.5} className="plan__muted">↑ fachada frontal · mar</text>
      </svg>
      {!compact && <figcaption>Medidas e áreas são exemplos editáveis — não representam áreas oficiais.</figcaption>}
    </figure>
  );
}
