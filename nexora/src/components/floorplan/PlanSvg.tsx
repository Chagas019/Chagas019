/** Desenho técnico da planta (SVG). Separado dos dados: recebe um PlanLevel e desenha. 1 unidade = 1 metro × S. */
import { memo } from 'react';
import type { PlanFurniture, PlanLevel, PlanRoom } from '@/types/property';
import { autoFurniture, bounds, labelPoint, resolveWalls, roomArea, isIndoor, type ResolvedWall } from '@/lib/plan';
import { formatNumber } from '@/lib/format';

export const S = 40; // px por metro no desenho
export const PAD = 1.6; // margem em metros (cotas)

const FILL: Partial<Record<PlanRoom['kind'], string>> = {
  piscina: '#bfe3ef',
  jardim: '#dfe9d6',
  gourmet: '#efe7da',
  varanda: '#efe7da',
  garagem: '#eceef1',
  banheiro: '#e8eef6',
};

export const PlanSvg = memo(function PlanSvg({ level, selected, hovered, onSelect, onHover, showFurniture = true }: { level: PlanLevel; selected?: string; hovered?: string; onSelect: (id: string) => void; onHover?: (id?: string) => void; showFurniture?: boolean }) {
  const walls = resolveWalls(level);
  const furniture = showFurniture ? autoFurniture(level) : [];
  const W = (level.width + PAD * 2) * S, H = (level.depth + PAD * 2) * S;
  const all = level.rooms.flatMap((r) => r.polygon);
  const b = bounds(all);
  const ordered = [...level.rooms].sort((a, c) => Number(isIndoor(a)) - Number(isIndoor(c)) || (a.kind === 'jardim' ? -1 : c.kind === 'jardim' ? 1 : 0));

  return (
    <svg width={W} height={H} viewBox={`${-PAD} ${-PAD} ${level.width + PAD * 2} ${level.depth + PAD * 2}`} className="block" role="img" aria-label={`Planta do ${level.name}`} fontFamily="'JetBrains Mono Variable', ui-monospace, monospace">
      <defs>
        <pattern id="grid" width="1" height="1" patternUnits="userSpaceOnUse"><path d="M1 0H0V1" fill="none" stroke="#0D1424" strokeOpacity=".06" strokeWidth=".02" /></pattern>
        <pattern id="hatch" width=".25" height=".25" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0V.25" stroke="#0D1424" strokeOpacity=".25" strokeWidth=".03" /></pattern>
      </defs>
      <rect x={-PAD} y={-PAD} width={level.width + PAD * 2} height={level.depth + PAD * 2} fill="#F5F7FB" />
      <rect x={-PAD} y={-PAD} width={level.width + PAD * 2} height={level.depth + PAD * 2} fill="url(#grid)" />

      {/* ambientes */}
      {ordered.map((r) => {
        const sel = r.id === selected, hov = r.id === hovered;
        return (
          <polygon
            key={r.id}
            points={r.polygon.map((p) => p.join(',')).join(' ')}
            fill={sel ? '#3478F6' : FILL[r.kind] ?? '#ffffff'}
            fillOpacity={sel ? 0.22 : hov ? 0.9 : 1}
            stroke={sel ? '#3478F6' : 'none'}
            strokeWidth={0.06}
            className="cursor-pointer transition-[fill,fill-opacity] duration-300"
            onClick={() => onSelect(r.id)}
            onPointerEnter={() => onHover?.(r.id)}
            onPointerLeave={() => onHover?.(undefined)}
          >
            <title>{r.name} — {formatNumber(roomArea(r))} m²</title>
          </polygon>
        );
      })}
      {level.rooms.filter((r) => r.kind === 'piscina').map((r) => <polygon key={`${r.id}-edge`} points={r.polygon.map((p) => p.join(',')).join(' ')} fill="none" stroke="#2b7fa0" strokeWidth=".05" pointerEvents="none" />)}
      {hovered && hovered !== selected && <polygon points={level.rooms.find((r) => r.id === hovered)!.polygon.map((p) => p.join(',')).join(' ')} fill="none" stroke="#3478F6" strokeOpacity=".5" strokeWidth=".04" pointerEvents="none" />}

      {/* mobiliário ilustrativo */}
      <g pointerEvents="none" stroke="#0D1424" strokeOpacity=".45" strokeWidth=".025" fill="none">
        {furniture.map((f, i) => <Furniture key={i} f={f} />)}
      </g>

      {/* escada */}
      {level.stairs && <Stairs s={level.stairs} />}

      {/* paredes */}
      <g pointerEvents="none">{walls.map((w, i) => <Wall key={i} w={w} />)}</g>

      {/* rótulos */}
      <g pointerEvents="none">
        {level.rooms.map((r) => {
          const [x, y] = labelPoint(r);
          const small = Math.min(bounds(r.polygon).w, bounds(r.polygon).h) < 2.6;
          return (
            <g key={r.id} transform={`translate(${x} ${y})`} textAnchor="middle">
              <text y={small ? -0.05 : -0.1} fontSize={small ? 0.3 : 0.42} fontWeight={600} fill={r.id === selected ? '#1F5ED6' : '#0D1424'} fontFamily="'Inter Tight Variable', system-ui, sans-serif" letterSpacing="-0.01">{r.name}</text>
              <text y={small ? 0.3 : 0.42} fontSize={small ? 0.24 : 0.3} fill="#525B6E">{formatNumber(roomArea(r))} m²</text>
            </g>
          );
        })}
      </g>

      {/* cotas gerais */}
      <Dimension x1={b.minX} x2={b.maxX} y={-0.8} label={`${formatNumber(b.w)} m`} />
      <Dimension y1={b.minY} y2={b.maxY} x={-0.8} label={`${formatNumber(b.h)} m`} vertical />

      {/* norte e escala */}
      <g transform={`translate(${level.width + PAD - 0.8} ${-PAD + 0.8})`} pointerEvents="none">
        <circle r=".42" fill="none" stroke="#0D1424" strokeWidth=".03" />
        <path d="M0 -.34 L.16 .2 L0 .1 L-.16 .2Z" fill="#0D1424" />
        <text y="-.52" fontSize=".24" textAnchor="middle" fill="#0D1424">N</text>
      </g>
      <g transform={`translate(${level.width + PAD - 3.4} ${level.depth + PAD - 0.6})`} pointerEvents="none">
        {[0, 1, 2].map((i) => <rect key={i} x={i} y={0} width={1} height={0.12} fill={i % 2 ? '#F5F7FB' : '#0D1424'} stroke="#0D1424" strokeWidth=".02" />)}
        <text x="0" y="-.12" fontSize=".2" fill="#0D1424">0</text>
        <text x="3" y="-.12" fontSize=".2" fill="#0D1424" textAnchor="end">3 m</text>
      </g>
    </svg>
  );
});

function Wall({ w }: { w: ResolvedWall }) {
  const dx = w.b[0] - w.a[0], dy = w.b[1] - w.a[1];
  const len = Math.hypot(dx, dy);
  const ux = dx / len, uy = dy / len;
  const at = (d: number) => [w.a[0] + ux * d, w.a[1] + uy * d] as const;
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  return (
    <>
      {w.segments.map((s, i) => {
        const [x, y] = at(s.from);
        const L = s.to - s.from;
        const t = w.thickness;
        const g = (child: React.ReactNode) => <g key={i} transform={`translate(${x} ${y}) rotate(${angle})`}>{child}</g>;
        switch (s.kind) {
          case 'solid':
            return g(<rect x={-0.01} y={-t / 2} width={L + 0.02} height={t} fill="#0D1424" />);
          case 'glass':
          case 'window':
            return g(<>
              <rect x={0} y={-t / 2} width={L} height={t} fill="#F5F7FB" stroke="#0D1424" strokeWidth=".02" />
              <line x1={0} x2={L} y1={0} y2={0} stroke="#3478F6" strokeWidth={s.kind === 'glass' ? 0.04 : 0.03} />
            </>);
          case 'door':
            return g(<>
              <path d={`M0 0 A${L} ${L} 0 0 1 ${L} ${-L}`} transform="scale(1 1)" fill="none" stroke="#0D1424" strokeOpacity=".5" strokeWidth=".02" strokeDasharray=".08 .06" />
              <line x1={L} y1={0} x2={L} y2={-L} stroke="#0D1424" strokeWidth=".035" />
            </>);
          default:
            return null;
        }
      })}
    </>
  );
}

function Furniture({ f }: { f: PlanFurniture }) {
  const [w, d] = f.size;
  const tr = `translate(${f.at[0]} ${f.at[1]}) rotate(${f.rotation ?? 0})`;
  switch (f.kind) {
    case 'arvore':
      return <g transform={tr}><circle r={w / 2} fill="#9fbf8a" fillOpacity=".55" stroke="#5f7848" /><circle r={0.08} fill="#5f7848" /></g>;
    case 'arbusto':
      return <circle cx={f.at[0]} cy={f.at[1]} r={w / 2} fill="#9fbf8a" fillOpacity=".5" stroke="#5f7848" />;
    case 'cama':
      return <g transform={tr}><rect x={-w / 2} y={-d / 2} width={w} height={d} rx=".05" /><rect x={-w / 2 + 0.08} y={-d / 2 + 0.08} width={w / 2 - 0.12} height={0.35} rx=".05" /><rect x={0.04} y={-d / 2 + 0.08} width={w / 2 - 0.12} height={0.35} rx=".05" /><line x1={-w / 2} x2={w / 2} y1={-d / 2 + 0.6} y2={-d / 2 + 0.6} /></g>;
    case 'sofa':
      return <g transform={tr}><rect x={-w / 2} y={-d / 2} width={w} height={d} rx=".08" /><line x1={-w / 2} x2={w / 2} y1={d / 2 - 0.22} y2={d / 2 - 0.22} /></g>;
    case 'mesa': {
      const n = Math.max(2, Math.floor(w / 0.7));
      return (
        <g transform={tr}>
          <rect x={-w / 2} y={-d / 2} width={w} height={d} rx=".04" />
          {Array.from({ length: n }, (_, i) => {
            const x = -w / 2 + (w / n) * (i + 0.5);
            return <g key={i}><rect x={x - 0.2} y={-d / 2 - 0.5} width={0.4} height={0.4} rx=".05" /><rect x={x - 0.2} y={d / 2 + 0.1} width={0.4} height={0.4} rx=".05" /></g>;
          })}
        </g>
      );
    }
    case 'carro':
      return <g transform={tr}><rect x={-w / 2} y={-d / 2} width={w} height={d} rx=".35" strokeDasharray=".1 .08" /></g>;
    case 'vaso':
      return <g transform={tr}><ellipse rx={w / 2} ry={d / 2} /></g>;
    case 'pia':
      return <g transform={tr}><rect x={-w / 2} y={-d / 2} width={w} height={d} /><ellipse rx={0.18} ry={0.12} /></g>;
    case 'chuveiro':
      return <g transform={tr}><rect x={-w / 2} y={-d / 2} width={w} height={d} /><line x1={-w / 2} y1={-d / 2} x2={w / 2} y2={d / 2} /></g>;
    case 'espreguicadeira':
      return <g transform={tr}><rect x={-w / 2} y={-d / 2} width={w} height={d} rx=".08" /></g>;
    case 'tapete':
      return <rect transform={tr} x={-w / 2} y={-d / 2} width={w} height={d} strokeDasharray=".05 .05" strokeOpacity=".5" />;
    case 'escada':
      return null;
    default:
      return <rect transform={tr} x={-w / 2} y={-d / 2} width={w} height={d} rx=".03" />;
  }
}

function Stairs({ s }: { s: NonNullable<PlanLevel['stairs']> }) {
  const vertical = s.dir === 'n' || s.dir === 's';
  const n = 14;
  return (
    <g pointerEvents="none" stroke="#0D1424" strokeWidth=".025" strokeOpacity=".7">
      <rect x={s.x} y={s.y} width={s.w} height={s.d} fill="#fff" />
      {Array.from({ length: n }, (_, i) => vertical
        ? <line key={i} x1={s.x} x2={s.x + s.w} y1={s.y + (s.d / n) * i} y2={s.y + (s.d / n) * i} />
        : <line key={i} y1={s.y} y2={s.y + s.d} x1={s.x + (s.w / n) * i} x2={s.x + (s.w / n) * i} />)}
      <path
        d={vertical ? `M${s.x + s.w / 2} ${s.dir === 's' ? s.y + 0.2 : s.y + s.d - 0.2}V${s.dir === 's' ? s.y + s.d - 0.3 : s.y + 0.3}` : `M${s.dir === 'e' ? s.x + 0.2 : s.x + s.w - 0.2} ${s.y + s.d / 2}H${s.dir === 'e' ? s.x + s.w - 0.3 : s.x + 0.3}`}
        stroke="#3478F6" strokeWidth=".04" markerEnd="none"
      />
      <text x={s.x + s.w / 2} y={s.y + s.d / 2} fontSize=".2" textAnchor="middle" fill="#3478F6" stroke="none" transform={vertical ? `rotate(-90 ${s.x + s.w / 2} ${s.y + s.d / 2})` : undefined} dy="-.08">{s.dir === 's' || s.dir === 'e' ? 'SOBE' : 'DESCE'}</text>
    </g>
  );
}

function Dimension({ x1, x2, y, y1, y2, x, label, vertical }: { x1?: number; x2?: number; y?: number; y1?: number; y2?: number; x?: number; label: string; vertical?: boolean }) {
  if (vertical) {
    return (
      <g stroke="#525B6E" strokeWidth=".02" pointerEvents="none">
        <line x1={x} x2={x} y1={y1} y2={y2} />
        <line x1={x! - 0.12} x2={x! + 0.12} y1={y1! + 0.12} y2={y1! - 0.12} />
        <line x1={x! - 0.12} x2={x! + 0.12} y1={y2! + 0.12} y2={y2! - 0.12} />
        <text x={x! - 0.18} y={(y1! + y2!) / 2} fontSize=".26" textAnchor="middle" fill="#525B6E" stroke="none" transform={`rotate(-90 ${x! - 0.18} ${(y1! + y2!) / 2})`}>{label}</text>
      </g>
    );
  }
  return (
    <g stroke="#525B6E" strokeWidth=".02" pointerEvents="none">
      <line x1={x1} x2={x2} y1={y} y2={y} />
      <line x1={x1! - 0.12} x2={x1! + 0.12} y1={y! + 0.12} y2={y! - 0.12} />
      <line x1={x2! - 0.12} x2={x2! + 0.12} y1={y! + 0.12} y2={y! - 0.12} />
      <text x={(x1! + x2!) / 2} y={y! - 0.16} fontSize=".26" textAnchor="middle" fill="#525B6E" stroke="none">{label}</text>
    </g>
  );
}
