// PAFIES 2027 v2 — ilustrações vetoriais originais (estilo editorial: formas chapadas, sombra recortada, contorno marinho).
// Cada componente é um SVG autônomo; scripts/export_illustrations.mjs exporta todos para 02_ILLUSTRATOR/v2.
import React from 'react';
import { P } from './kit';

type Pos = { x: number; y: number; s?: number; rot?: number; style?: React.CSSProperties; flip?: boolean };
const OL = P.navy; // cor de contorno
const wrap = (w: number, h: number, { x, y, s = 1, rot = 0, style, flip }: Pos, ox: number, oy: number, children: React.ReactNode) => (
  <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{
    position: 'absolute', left: x - ox, top: y - oy, overflow: 'visible',
    transform: `rotate(${rot}deg) scale(${flip ? -s : s}, ${s})`, transformOrigin: `${ox}px ${oy}px`, ...style,
  }}>{children}</svg>
);

/* ---------- MEGAFONE + MÃO + MANGA (âncora = centro da boca do megafone) ---------- */
export const MegaphoneHand: React.FC<Pos & { mouth?: string }> = (p) => wrap(640, 700, p, 470, 200, <g strokeLinejoin="round" strokeLinecap="round">
  {/* manga */}
  <path d="M150,320 L262,300 L360,700 L150,700 Z" fill={P.royal} stroke={OL} strokeWidth={8} />
  <path d="M232,306 L262,300 L360,700 L300,700 Z" fill={P.royalDark} />
  <path d="M140,300 L268,280 L282,345 L150,365 Z" fill={P.cream} stroke={OL} strokeWidth={8} />
  <path d="M146,322 L272,302 M149,342 L277,322" stroke={P.red} strokeWidth={7} />
  {/* corpo traseiro + cabo */}
  <ellipse cx={70} cy={200} rx={24} ry={52} fill={P.navy} />
  <rect x={70} y={150} width={140} height={100} fill={P.yellow} stroke={OL} strokeWidth={8} />
  <rect x={70} y={205} width={140} height={45} fill={P.yellowDark} />
  <path d="M150,240 L205,240 L215,330 L165,335 Z" fill={P.navy} />
  {/* sino */}
  <path d="M205,140 L470,40 L470,360 L205,260 Z" fill={P.yellow} stroke={OL} strokeWidth={8} />
  <path d="M205,205 L470,200 L470,360 L205,260 Z" fill={P.yellowDark} />
  <path d="M290,108 L325,95 L325,305 L290,292 Z" fill={P.red} stroke={OL} strokeWidth={6} />
  {/* boca */}
  <ellipse cx={470} cy={200} rx={58} ry={164} fill={p.mouth ?? P.red} stroke={OL} strokeWidth={8} />
  <ellipse cx={478} cy={200} rx={34} ry={124} fill={P.redDark} />
  {/* mão segurando o cabo */}
  <path d="M120,262 C150,236 230,236 246,262 C262,290 250,330 228,346 C200,362 150,360 130,338 C112,318 108,280 120,262 Z" fill={P.skin} stroke={OL} strokeWidth={8} />
  <path d="M140,270 C170,262 210,262 236,272 M134,296 C170,288 212,290 240,298 M140,322 C170,316 206,318 232,326" stroke={P.skinDark} strokeWidth={7} fill="none" />
  <path d="M200,248 C240,236 262,270 246,300 C238,316 220,320 210,316 Z" fill={P.skinDark} />
</g>);

/* ---------- MÃO ABERTA (âncora = punho) ---------- */
export const Hand: React.FC<Pos & { sleeve?: string; cuff?: string }> = (p) => wrap(320, 640, p, 160, 400, <g strokeLinejoin="round">
  <path d="M86,390 L234,390 L262,640 L58,640 Z" fill={p.sleeve ?? P.royal} stroke={OL} strokeWidth={8} />
  <path d="M190,390 L234,390 L262,640 L214,640 Z" fill="rgba(0,0,0,0.18)" />
  <rect x={76} y={370} width={168} height={50} rx={10} fill={p.cuff ?? P.cream} stroke={OL} strokeWidth={8} />
  <g fill={P.skin} stroke={OL} strokeWidth={8}>
    <rect x={30} y={240} width={46} height={150} rx={23} transform="rotate(-38 53 315)" />
    <rect x={78} y={58} width={46} height={190} rx={23} transform="rotate(-8 101 153)" />
    <rect x={128} y={36} width={48} height={210} rx={24} />
    <rect x={180} y={56} width={46} height={190} rx={23} transform="rotate(8 203 151)" />
    <rect x={224} y={110} width={42} height={150} rx={21} transform="rotate(16 245 185)" />
    <path d="M78,200 C76,170 250,170 252,205 L246,330 C240,380 90,384 86,330 Z" />
  </g>
  <path d="M200,190 C240,200 250,240 246,330 C242,370 200,384 168,384 C210,350 214,260 200,190 Z" fill={P.skinDark} />
  <path d="M120,300 C140,320 180,320 200,300" stroke={P.skinDark} strokeWidth={7} fill="none" strokeLinecap="round" />
</g>);

/* ---------- CAIXA DE DOAÇÃO (âncora = centro da abertura) ---------- */
export const DonationBox: React.FC<Pos> = (p) => wrap(420, 360, p, 205, 110, <g strokeLinejoin="round" stroke={OL} strokeWidth={7}>
  <path d="M40,120 L130,80 L370,100 L280,140 Z" fill={P.maroon} />
  <path d="M280,140 L370,100 L370,290 L280,330 Z" fill={P.yellowDark} />
  <path d="M40,120 L280,140 L280,330 L40,310 Z" fill={P.yellow} />
  <path d="M40,120 L280,140 L250,58 L16,46 Z" fill="#FFE36B" />
  <path d="M280,140 L370,100 L398,36 L302,66 Z" fill={P.yellowDark} />
  <path d="M160,262 C120,236 110,206 132,196 C146,190 156,198 160,208 C164,198 174,190 188,196 C210,206 200,236 160,262 Z" fill={P.red} strokeWidth={6} />
</g>);

/* ---------- ALIMENTOS ---------- */
export const Apple: React.FC<Pos> = (p) => wrap(200, 200, p, 100, 110, <g strokeLinejoin="round">
  <path d="M100,55 C140,30 190,60 185,115 C180,170 140,195 100,180 C60,195 20,170 15,115 C10,60 60,30 100,55Z" fill={P.red} stroke={OL} strokeWidth={7} />
  <path d="M128,48 C178,58 192,118 168,160 C150,188 122,190 104,182 C152,166 172,108 128,48Z" fill={P.redDark} />
  <ellipse cx={58} cy={92} rx={11} ry={20} fill={P.cream} opacity={0.85} transform="rotate(-25 58 92)" />
  <rect x={94} y={18} width={12} height={42} rx={6} fill={P.navy} transform="rotate(10 100 40)" />
  <ellipse cx={130} cy={34} rx={30} ry={13} fill="#2FA36B" stroke={OL} strokeWidth={6} transform="rotate(-24 130 34)" />
</g>);
export const Can: React.FC<Pos> = (p) => wrap(200, 200, p, 100, 105, <g strokeLinejoin="round">
  <rect x={45} y={40} width={110} height={132} rx={8} fill={P.royal} stroke={OL} strokeWidth={7} />
  <rect x={45} y={80} width={110} height={54} fill={P.cream} stroke={OL} strokeWidth={6} />
  <rect x={58} y={96} width={84} height={22} rx={4} fill={P.red} />
  <rect x={124} y={42} width={28} height={128} fill="rgba(0,0,0,0.2)" />
  <ellipse cx={100} cy={40} rx={55} ry={14} fill={P.sky} stroke={OL} strokeWidth={7} />
  <ellipse cx={100} cy={40} rx={38} ry={8} fill={P.skyDark} />
</g>);
export const Rice: React.FC<Pos> = (p) => wrap(200, 210, p, 100, 110, <g strokeLinejoin="round">
  <path d="M50,40 L150,40 L162,184 Q100,198 38,184 Z" fill={P.cream} stroke={OL} strokeWidth={7} />
  <path d="M128,40 L150,40 L162,184 Q148,188 134,190 Z" fill={P.creamDark} />
  <path d="M50,40 L58,22 L66,40 L74,22 L82,40 L90,22 L98,40 L106,22 L114,40 L122,22 L130,40 L138,22 L146,40 L150,40" fill={P.cream} stroke={OL} strokeWidth={6} />
  <rect x={56} y={92} width={88} height={58} rx={6} fill={P.yellow} stroke={OL} strokeWidth={6} />
  <text x={100} y={131} textAnchor="middle" fontFamily="Anton, Impact" fontSize={26} fill={P.navy}>ARROZ</text>
</g>);
export const Milk: React.FC<Pos> = (p) => wrap(200, 210, p, 100, 110, <g strokeLinejoin="round">
  <path d="M55,70 L100,28 L145,70 Z" fill={P.cream} stroke={OL} strokeWidth={7} />
  <rect x={55} y={70} width={90} height={118} fill={P.sky} stroke={OL} strokeWidth={7} />
  <rect x={120} y={72} width={23} height={114} fill={P.skyDark} />
  <rect x={55} y={112} width={90} height={36} fill={P.cream} stroke={OL} strokeWidth={6} />
  <text x={96} y={140} textAnchor="middle" fontFamily="Anton, Impact" fontSize={22} fill={P.royal}>LEITE</text>
  <circle cx={116} cy={52} r={10} fill={P.red} stroke={OL} strokeWidth={5} />
</g>);
export const HeartIcon: React.FC<Pos & { color?: string }> = (p) => wrap(200, 200, p, 100, 100, <g strokeLinejoin="round">
  <path d="M100,175 C30,125 10,80 35,52 C58,28 90,38 100,62 C110,38 142,28 165,52 C190,80 170,125 100,175Z" fill={p.color ?? P.red} stroke={OL} strokeWidth={7} />
  <path d="M138,40 C168,40 190,74 165,110 C148,135 124,154 100,175 C140,138 168,92 138,40Z" fill="rgba(0,0,0,0.22)" />
</g>);

/* ---------- PESSOA DA GALERA (âncora = pés) ---------- */
const SKINS = ['#F2C3A0', '#C98A5E', '#8A5A3C', '#5A3A28', '#E0A57E'];
export const Person: React.FC<Pos & { i: number; shirt: string; wave: number }> = (p) => {
  const skin = SKINS[p.i % SKINS.length];
  const hair = p.i % 4;
  const a = -150 + p.wave * 25, b = 150 - p.wave * 25;
  return wrap(200, 340, p, 100, 330, <g strokeLinejoin="round" stroke={OL} strokeWidth={7}>
    <g transform={`rotate(${a} 52 168)`}><rect x={36} y={168} width={32} height={120} rx={16} fill={p.shirt} /><circle cx={52} cy={292} r={20} fill={skin} /></g>
    <g transform={`rotate(${b} 148 168)`}><rect x={132} y={168} width={32} height={120} rx={16} fill={p.shirt} /><circle cx={148} cy={292} r={20} fill={skin} /></g>
    {hair === 2 && <circle cx={100} cy={92} r={56} fill={P.maroon} />}
    <path d="M40,330 L40,200 C40,150 160,150 160,200 L160,330 Z" fill={p.shirt} />
    <path d="M118,160 C150,168 160,190 160,210 L160,330 L126,330 Z" fill="rgba(0,0,0,0.2)" stroke="none" />
    <text x={100} y={260} textAnchor="middle" fontFamily="Anton, Impact" fontSize={46} fill={P.cream} stroke="none">{(p.i * 7) % 10 + 1}</text>
    <circle cx={100} cy={104} r={40} fill={skin} />
    {hair === 0 && <path d="M60,100 C60,50 140,50 140,100 L140,88 L170,96 L140,80 C134,66 66,66 60,100Z" fill={P.red} />}
    {hair === 1 && <><path d="M60,104 C56,58 144,58 140,104 C120,84 80,84 60,104Z" fill={P.navy} /><circle cx={100} cy={52} r={18} fill={P.navy} /></>}
    {hair === 3 && <path d="M62,100 C60,62 140,58 140,96 C122,82 96,78 62,100Z" fill={P.maroon} />}
  </g>);
};

/* ---------- PERNAS CORRENDO (vista lateral, âncora = quadril) ---------- */
export const Runner: React.FC<Pos & { phase: number }> = (p) => {
  const leg = (ph: number, pant: string, shoe: string, back: boolean) => {
    const th = 38 * Math.sin(ph);
    const kn = -(15 + 55 * Math.max(0, Math.sin(ph + 1.4)));
    return <g transform={`rotate(${th} 250 150)`} opacity={1}>
      <rect x={210} y={150} width={80} height={210} rx={40} fill={pant} stroke={OL} strokeWidth={8} />
      <g transform={`rotate(${kn} 250 340)`}>
        <rect x={218} y={330} width={64} height={200} rx={32} fill={back ? P.skinDark : P.skin} stroke={OL} strokeWidth={8} />
        <rect x={214} y={430} width={72} height={36} rx={10} fill={P.cream} stroke={OL} strokeWidth={6} />
        <path d="M206,500 C206,480 250,470 268,486 L332,512 C352,520 352,552 330,556 L214,556 C200,556 198,520 206,500Z" fill={shoe} stroke={OL} strokeWidth={8} />
        <path d="M208,546 L336,546" stroke={P.navy} strokeWidth={14} strokeLinecap="round" />
        <path d="M236,512 C262,500 292,510 310,528" stroke={P.red} strokeWidth={9} fill="none" strokeLinecap="round" />
      </g>
    </g>;
  };
  return wrap(500, 620, p, 250, 150, <g strokeLinejoin="round">
    <g transform="translate(-26 0)">{leg(p.phase + Math.PI, P.redDark, P.creamDark, true)}</g>
    {leg(p.phase, P.red, P.cream, false)}
    <path d="M178,40 Q250,22 322,40 L346,206 Q300,222 256,196 Q206,222 158,206 Z" fill={P.royal} stroke={OL} strokeWidth={8} />
    <path d="M300,40 L322,40 L346,206 Q330,212 316,214 Z" fill={P.royalDark} />
    <path d="M172,120 L332,120" stroke={P.yellow} strokeWidth={12} />
  </g>);
};

/* ---------- ESTÁDIO (fundo da cena final) ---------- */
export const Stadium: React.FC<{ glow: number }> = ({ glow }) => (
  <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{ position: 'absolute', left: 0, top: 0 }}>
    <defs>
      <linearGradient id="beam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={P.cream} stopOpacity={0.35 * glow} /><stop offset="1" stopColor={P.cream} stopOpacity={0} /></linearGradient>
    </defs>
    {[[140, -10], [540, -10], [940, -10]].map(([x, y], i) => (
      <polygon key={i} points={`${x - 40},${y} ${x + 40},${y} ${x + 420 - i * 420},1300 ${x - 420 - i * 420 + 840},1300`} fill="url(#beam)" />
    ))}
    {[140, 540, 940].map((x, i) => <circle key={i} cx={x} cy={40} r={34} fill={P.yellow} opacity={0.6 + 0.4 * glow} />)}
    <path d="M-20,1300 C60,1250 120,1280 180,1240 C240,1270 300,1230 360,1255 C420,1225 480,1262 540,1236 C600,1262 660,1226 720,1254 C780,1232 840,1270 900,1240 C960,1268 1020,1236 1100,1270 L1100,1320 L-20,1320Z" fill={P.navy} />
    <polygon points="250,1300 830,1300 1380,1920 -300,1920" fill={P.royalDark} />
    <g stroke={P.sky} strokeWidth={6} fill="none" opacity={0.75}>
      <polygon points="250,1300 830,1300 1380,1920 -300,1920" />
      <line x1={540} y1={1300} x2={540} y2={1920} />
      <ellipse cx={540} cy={1560} rx={260} ry={90} />
      <line x1={70} y1={1560} x2={1010} y2={1560} />
    </g>
  </svg>
);
