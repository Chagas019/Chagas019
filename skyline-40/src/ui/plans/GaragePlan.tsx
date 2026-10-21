import { useMemo } from 'react';
import { GARAGE_CONFIG, TECH_ROOMS, garageBands, garageColumns, garageRamps, garageSpots } from '../../data/garage';
import { BUILDING } from '../../data/building';

/** Planta esquemática de um nível da garagem, gerada a partir dos mesmos parâmetros do 3D. */
export function GaragePlan({ level = 0, compact }: { level?: number; compact?: boolean }) {
  const cfg = GARAGE_CONFIG;
  const spots = useMemo(() => garageSpots(level), [level]);
  const bands = useMemo(() => garageBands(), []);
  const cols = useMemo(() => garageColumns(), []);
  const ramps = useMemo(() => garageRamps(), []);
  const pad = 2;
  const W = cfg.halfX * 2 + pad * 2;
  const H = cfg.halfZ * 2 + pad * 2 + (level === 0 ? 6 : 0);
  const fy = (z: number) => cfg.halfZ + pad - z; // frente (+Z) para cima
  const occupied = spots.filter((s) => s.occupied).length;
  return (
    <figure className={`plan plan--garage${compact ? ' plan--compact' : ''}`}>
      <svg viewBox={`${-cfg.halfX - pad} 0 ${W} ${H}`} role="img" aria-label={`Planta esquemática do nível G${level + 1}`}>
        <rect x={-cfg.halfX} y={fy(cfg.halfZ)} width={cfg.halfX * 2} height={cfg.halfZ * 2} className="gplan__slab" />
        {bands.filter((b) => b.kind === 'aisle').map((b, i) => (
          <rect key={i} x={-cfg.halfX + cfg.crossAisle} y={fy(b.z1)} width={(cfg.halfX - cfg.crossAisle) * 2} height={b.z1 - b.z0} className="gplan__aisle" />
        ))}
        {[-1, 1].map((sx) => (
          <rect key={sx} x={sx > 0 ? cfg.halfX - cfg.crossAisle : -cfg.halfX} y={fy(cfg.halfZ)} width={cfg.crossAisle} height={cfg.halfZ * 2} className="gplan__aisle" />
        ))}
        {spots.map((s) => (
          <g key={s.id}>
            <rect x={s.x - cfg.spotWidth / 2} y={fy(s.z + cfg.spotDepth / 2)} width={cfg.spotWidth} height={cfg.spotDepth} className="gplan__spot" />
            {s.occupied && <rect x={s.x - 0.9} y={fy(s.z + 2.2)} width={1.8} height={4.4} rx={0.4} className="gplan__car" />}
          </g>
        ))}
        {cols.map(([x, z], i) => <rect key={i} x={x - 0.3} y={fy(z) - 0.3} width={0.6} height={0.6} className="gplan__col" />)}
        <rect x={-BUILDING.core.halfX} y={fy(BUILDING.core.halfZ)} width={BUILDING.core.halfX * 2} height={BUILDING.core.halfZ * 2} className="gplan__core" />
        {TECH_ROOMS.filter((r) => r.level === level).map((r) => (
          <g key={r.id}>
            <rect x={r.x[0]} y={fy(cfg.spineHalf - 0.3)} width={r.x[1] - r.x[0]} height={(cfg.spineHalf - 0.3) * 2} className="gplan__tech" />
            {!compact && <text x={(r.x[0] + r.x[1]) / 2} y={fy(0) + 0.35} className="gplan__txt">{r.name}</text>}
          </g>
        ))}
        {level < cfg.levels - 1 && (
          <rect x={ramps.inner.x0} y={fy(ramps.inner.halfWidth)} width={ramps.inner.length} height={ramps.inner.halfWidth * 2} className="gplan__ramp" />
        )}
        {level === 0 && (
          <rect x={ramps.access.x0} y={fy(-cfg.halfZ)} width={ramps.access.x1 - ramps.access.x0} height={6} className="gplan__ramp" />
        )}
        {!compact && (
          <>
            <text x={0} y={fy(0) + 0.35} className="gplan__txt gplan__txt--light">elev.</text>
            {level < cfg.levels - 1 && <text x={(ramps.inner.x0 + ramps.inner.x1) / 2} y={fy(0) + 0.35} className="gplan__txt">rampa ↓ G{level + 2}</text>}
            {level === 0 && <text x={(ramps.access.x0 + ramps.access.x1) / 2} y={fy(-cfg.halfZ) + 3.4} className="gplan__txt">acesso</text>}
          </>
        )}
      </svg>
      <figcaption>
        G{level + 1}: {spots.length} vagas ({occupied} ocupadas na simulação). Parâmetros conceituais e editáveis.
      </figcaption>
    </figure>
  );
}
