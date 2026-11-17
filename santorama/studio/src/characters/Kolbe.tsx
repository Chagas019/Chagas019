// PERSONAGEM OFICIAL — São Maximiliano Maria Kolbe (SANTORAMA)
// Bíblia do personagem: docs/character-kolbe.md
// Rosto oval e alongado, testa alta, cabelo castanho-escuro curto penteado para trás com entradas,
// óculos redondos de aro metálico fino, olhar sereno, corpo franzino.
// Variantes: 'habito' (hábito franciscano conventual preto + capuz/mozeta + cordão branco de 3 nós)
//            'prisioneiro' (Auschwitz 1941: uniforme listrado, cabeça raspada, nº 16670, triângulo vermelho "P")
// Sem barba nas duas variantes (fiel a 1939-1941). Todas as cenas usam ESTE componente.
import React from 'react';
import {random, useCurrentFrame} from 'remotion';

export type KolbeProps = {
  variant?: 'habito' | 'prisioneiro';
  expression?: 'sereno' | 'determinado' | 'gentil' | 'dor';
  gaze?: [number, number]; // -1..1 olhar horizontal/vertical
  tilt?: number; // graus
  light?: 'quente' | 'frio' | 'ouro';
  rim?: number; // intensidade da luz de recorte 0..1
  blinkSeed?: string;
  breathe?: number;
  style?: React.CSSProperties;
  width?: number;
  eyesClosed?: number; // 0..1 (oração)
};

const SKIN = {base: '#D8A47E', shade: '#9C6546', deep: '#6E4130', hi: '#F2CDA6', lip: '#9A5A48'};
const RIM = {quente: '#FFC977', frio: '#A9C4E0', ouro: '#FFE2A0'};

function blinkAmount(frame: number, seed: string) {
  // piscadas naturais a cada 2,5–5 s, com duração de ~5 frames
  let t = 0, i = 0;
  while (t < frame + 200 && i < 400) {
    const gap = 75 + random(`${seed}${i}`) * 80;
    const start = t + gap;
    if (frame >= start && frame < start + 6) {
      const p = (frame - start) / 6;
      return Math.sin(p * Math.PI);
    }
    t = start; i++;
  }
  return 0;
}

export const Kolbe: React.FC<KolbeProps> = ({
  variant = 'habito', expression = 'sereno', gaze = [0, 0], tilt = 0, light = 'quente', rim = 0.8,
  blinkSeed = 'k', breathe = 1, style, width = 600, eyesClosed = 0,
}) => {
  const frame = useCurrentFrame();
  const br = Math.sin(frame / 32) * breathe; // respiração
  const blink = Math.max(eyesClosed, blinkAmount(frame, blinkSeed));
  const prisoner = variant === 'prisioneiro';
  const rc = RIM[light];
  const gx = gaze[0] * 5, gy = gaze[1] * 3;
  const micro = Math.sin(frame / 61) * 0.8 + Math.sin(frame / 37) * 0.4; // micro-movimento da cabeça
  const mouth = {
    sereno: 'M276,399 Q300,406 324,399',
    gentil: 'M274,397 Q300,410 326,397',
    determinado: 'M277,401 Q300,403 323,401',
    dor: 'M278,403 Q300,398 322,403',
  }[expression];
  const brow = expression === 'dor' || expression === 'determinado' ? 4 : 0;
  const id = `k${blinkSeed}`;

  const Eye = ({cx}: {cx: number}) => (
    <g>
      <clipPath id={`${id}eye${cx}`}><path d={`M${cx - 19},291 Q${cx},277 ${cx + 19},291 Q${cx},302 ${cx - 19},291 Z`} /></clipPath>
      <g clipPath={`url(#${id}eye${cx})`}>
        <rect x={cx - 22} y={270} width={44} height={40} fill="#EDE2D0" />
        <circle cx={cx + gx} cy={291 + gy} r={8.5} fill="#4A3123" />
        <circle cx={cx + gx} cy={291 + gy} r={4.2} fill="#120B07" />
        <circle cx={cx + gx + 2.6} cy={288 + gy} r={2} fill="#fff" opacity={0.9} />
        <rect x={cx - 22} y={270} width={44} height={8} fill={SKIN.shade} opacity={0.35} />
        {/* pálpebra */}
        <rect x={cx - 22} y={262} width={44} height={10 + blink * 32} fill={SKIN.base} />
        <path d={`M${cx - 20},${272 + blink * 30} Q${cx},${266 + blink * 30} ${cx + 20},${272 + blink * 30}`} stroke={SKIN.deep} strokeWidth={2.5} fill="none" opacity={0.6} />
      </g>
      <path d={`M${cx - 19},291 Q${cx},${277 + blink * 14} ${cx + 19},291`} stroke="#2A1810" strokeWidth={3.2} fill="none" strokeLinecap="round" />
      <path d={`M${cx - 15},297 Q${cx},303 ${cx + 15},297`} stroke={SKIN.shade} strokeWidth={1.6} fill="none" opacity={0.6} />
    </g>
  );

  return (
    <svg viewBox="0 0 600 900" width={width} height={width * 1.5} style={{overflow: 'visible', ...style}}>
      <defs>
        <radialGradient id={`${id}skin`} cx="0.62" cy="0.38" r="0.75">
          <stop offset="0" stopColor={SKIN.hi} />
          <stop offset="0.45" stopColor={SKIN.base} />
          <stop offset="1" stopColor={SKIN.shade} />
        </radialGradient>
        <linearGradient id={`${id}shadow`} x1="0" x2="1">
          <stop offset="0" stopColor="#2a140a" stopOpacity={0.55} />
          <stop offset="0.5" stopColor="#2a140a" stopOpacity={0} />
          <stop offset="1" stopColor={rc} stopOpacity={0.18} />
        </linearGradient>
        <linearGradient id={`${id}cloth`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2E2925" />
          <stop offset="0.55" stopColor="#1A1714" />
          <stop offset="1" stopColor="#0C0A08" />
        </linearGradient>
        <pattern id={`${id}stripes`} width="44" height="44" patternUnits="userSpaceOnUse">
          <rect width="44" height="44" fill="#B9B6AA" />
          <rect width="22" height="44" fill="#56616F" />
        </pattern>
        <linearGradient id={`${id}clothShade`} x1="0" x2="1">
          <stop offset="0" stopColor="#000" stopOpacity={0.55} />
          <stop offset="0.6" stopColor="#000" stopOpacity={0.1} />
          <stop offset="1" stopColor={rc} stopOpacity={0.2} />
        </linearGradient>
        <filter id={`${id}rimglow`}><feGaussianBlur stdDeviation="3" /></filter>
        <filter id={`${id}soft`}><feGaussianBlur stdDeviation="6" /></filter>
        <clipPath id={`${id}head`}>
          <path d="M300,148 C365,148 398,200 398,270 C398,330 388,372 365,405 C345,432 322,446 300,446 C278,446 255,432 235,405 C212,372 202,330 202,270 C202,200 235,148 300,148 Z" />
        </clipPath>
      </defs>

      {/* ===== CORPO ===== */}
      <g transform={`translate(0 ${br * 1.5}) scale(1 ${1 + br * 0.004})`} style={{transformOrigin: '300px 900px'}}>
        {prisoner ? (
          <g>
            <path d="M30,900 C40,760 70,640 150,590 C200,560 240,548 262,540 L338,540 C360,548 400,560 450,590 C530,640 560,760 570,900 Z" fill={`url(#${id}stripes)`} />
            <path d="M30,900 C40,760 70,640 150,590 C200,560 240,548 262,540 L338,540 C360,548 400,560 450,590 C530,640 560,760 570,900 Z" fill={`url(#${id}clothShade)`} />
            {/* dobras */}
            <path d="M150,620 C170,700 160,800 170,900 M450,620 C430,700 445,800 430,900 M300,640 C305,720 296,820 300,900" stroke="#000" strokeOpacity={0.22} strokeWidth={10} fill="none" filter={`url(#${id}soft)`} />
            {/* gola */}
            <path d="M240,540 L300,640 L360,540 L392,560 L300,690 L208,560 Z" fill="#8E918A" />
            <path d="M262,540 L300,610 L338,540 Z" fill="#C49473" />
            <path d="M262,540 L300,610 L338,540" fill="none" stroke="#000" strokeOpacity={0.3} strokeWidth={6} />
            {/* triângulo vermelho com P e número 16670 */}
            <g transform="translate(372 668)">
              <polygon points="0,0 46,0 23,40" fill="#8E2A20" stroke="#3a0e09" strokeWidth={2} />
              <text x={23} y={22} fontFamily="Liberation Sans, sans-serif" fontWeight={700} fontSize={18} textAnchor="middle" fill="#F2E6CF">P</text>
              <rect x={-6} y={48} width={98} height={30} fill="#E8E2D2" stroke="#6b665c" strokeWidth={1.5} />
              <text x={43} y={70} fontFamily="Liberation Sans, sans-serif" fontWeight={700} fontSize={21} textAnchor="middle" fill="#141414" letterSpacing={1}>16670</text>
            </g>
          </g>
        ) : (
          <g>
            <path d="M20,900 C30,760 60,650 140,600 C190,570 236,552 262,545 L338,545 C364,552 410,570 460,600 C540,650 570,760 580,900 Z" fill={`url(#${id}cloth)`} />
            {/* mozeta (capinha) */}
            <path d="M66,700 C84,610 168,560 240,540 L360,540 C432,560 516,610 534,700 C536,760 470,790 300,796 C130,790 64,760 66,700 Z" fill="#221E1B" />
            <path d="M66,700 C84,610 168,560 240,540 L360,540 C432,560 516,610 534,700 C536,760 470,790 300,796 C130,790 64,760 66,700 Z" fill={`url(#${id}clothShade)`} />
            <path d="M120,690 C160,740 220,770 300,776 M480,690 C440,740 380,770 300,776" stroke="#000" strokeOpacity={0.35} strokeWidth={6} fill="none" filter={`url(#${id}soft)`} />
            {/* capuz dobrado atrás do pescoço */}
            <path d="M178,540 C196,486 404,486 422,540 C440,590 390,616 300,618 C210,616 160,590 178,540 Z" fill="#14110F" /><path d="M200,548 C236,580 364,580 400,548" stroke="#2c2622" strokeWidth={8} fill="none" />
            <path d="M232,540 C250,520 350,520 368,540" stroke={rc} strokeOpacity={0.25} strokeWidth={3} fill="none" />
            {/* cordão branco com 3 nós */}
            <path d="M420,780 C424,820 418,860 424,900" stroke="#E6DCC6" strokeWidth={7} fill="none" strokeLinecap="round" />
            {[812, 846, 880].map((y) => <ellipse key={y} cx={421} cy={y} rx={9} ry={7} fill="#EFE6D2" stroke="#9c927d" strokeWidth={1.5} />)}
          </g>
        )}
        {/* rim light no ombro */}
        <path d="M460,600 C540,650 570,760 580,900" stroke={rc} strokeWidth={5} strokeOpacity={0.55 * rim} fill="none" filter={`url(#${id}rimglow)`} />
      </g>

      {/* ===== CABEÇA ===== */}
      <g transform={`translate(0 ${42 + br * 0.8}) rotate(${tilt + micro} 300 470)`}>
        {/* pescoço */}
        <path d="M262,400 L262,520 C280,540 320,540 338,520 L338,400 Z" fill={SKIN.base} />
        <path d="M262,430 L262,520 C280,540 320,540 338,520 L338,430 C320,470 280,470 262,430 Z" fill={SKIN.deep} opacity={0.55} />
        {/* orelhas */}
        <path d="M207,272 C186,262 178,284 182,304 C186,326 196,338 212,334 Z" fill={SKIN.base} />
        <path d="M200,284 C192,290 194,310 202,320" stroke={SKIN.deep} strokeWidth={3} fill="none" opacity={0.6} />
        <path d="M393,272 C414,262 422,284 418,304 C414,326 404,338 388,334 Z" fill={SKIN.base} />
        <path d="M400,284 C408,290 406,310 398,320" stroke={SKIN.deep} strokeWidth={3} fill="none" opacity={0.6} />
        {/* rosto */}
        <path d="M300,148 C365,148 398,200 398,270 C398,330 388,372 365,405 C345,432 322,446 300,446 C278,446 255,432 235,405 C212,372 202,330 202,270 C202,200 235,148 300,148 Z" fill={`url(#${id}skin)`} />
        <g clipPath={`url(#${id}head)`}>
          {/* maçãs do rosto / face encovada */}
          <ellipse cx={238} cy={360} rx={34} ry={46} fill={SKIN.shade} opacity={prisoner ? 0.55 : 0.32} filter={`url(#${id}soft)`} />
          <ellipse cx={362} cy={360} rx={30} ry={44} fill={SKIN.shade} opacity={prisoner ? 0.4 : 0.2} filter={`url(#${id}soft)`} />
          <ellipse cx={300} cy={444} rx={70} ry={18} fill={SKIN.deep} opacity={0.35} filter={`url(#${id}soft)`} />
          <rect x={190} y={140} width={220} height={320} fill={`url(#${id}shadow)`} />
          <ellipse cx={252} cy={350} rx={26} ry={16} fill="#C8644E" opacity={prisoner ? 0.06 : 0.16} filter={`url(#${id}soft)`} /><ellipse cx={350} cy={350} rx={26} ry={16} fill="#C8644E" opacity={prisoner ? 0.06 : 0.14} filter={`url(#${id}soft)`} />
          {/* olheiras */}
          <ellipse cx={262} cy={310} rx={24} ry={9} fill={SKIN.deep} opacity={prisoner ? 0.35 : 0.18} filter={`url(#${id}soft)`} />
          <ellipse cx={338} cy={310} rx={24} ry={9} fill={SKIN.deep} opacity={prisoner ? 0.3 : 0.14} filter={`url(#${id}soft)`} />
        </g>
        {/* cabelo */}
        {prisoner ? (
          <path d="M204,262 C198,190 232,132 300,128 C372,128 404,190 396,262 C390,228 380,200 366,186 C344,172 318,170 300,170 C276,170 252,174 234,188 C218,202 208,228 204,262 Z" fill="#3A2A20" opacity={0.42} />
        ) : (
          <g>
            <path d="M204,300 C190,262 188,206 214,166 C240,126 280,110 304,110 C350,110 386,132 404,172 C418,206 414,262 398,300 C398,262 392,232 380,212 C362,190 340,192 318,186 C296,180 270,178 250,190 C230,202 218,228 214,262 C212,276 208,290 204,300 Z" fill="#2A1C14" /><path d="M214,166 C240,126 280,110 304,110 C350,110 386,132 404,172 C380,150 340,136 300,138 C262,140 232,152 214,166 Z" fill="#3B2A1E" opacity={0.7} />
            <path d="M226,176 C262,140 336,132 388,176 M240,158 C286,132 346,138 376,160 M222,200 C248,166 300,156 352,168 M380,196 C390,214 396,240 398,262" stroke="#4E3726" strokeWidth={4} fill="none" opacity={0.8} />
          </g>
        )}
        {/* sobrancelhas */}
        <path d={`M236,${262 - brow * 0.2} Q262,${250 + brow} 286,${258 + brow}`} stroke="#2A1C14" strokeWidth={7} fill="none" strokeLinecap="round" />
        <path d={`M314,${258 + brow} Q338,${250 + brow} 364,${262 - brow * 0.2}`} stroke="#2A1C14" strokeWidth={7} fill="none" strokeLinecap="round" />
        <Eye cx={262} />
        <Eye cx={338} />
        {/* nariz */}
        <path d="M302,298 C301,326 296,346 289,360 C296,370 308,370 316,362" stroke={SKIN.deep} strokeWidth={3.4} fill="none" strokeLinecap="round" opacity={0.75} />
        <path d="M306,300 C314,330 318,346 316,358" stroke={SKIN.hi} strokeWidth={4} fill="none" opacity={0.5} />
        <ellipse cx={292} cy={364} rx={5} ry={3} fill={SKIN.deep} opacity={0.6} />
        <ellipse cx={312} cy={364} rx={5} ry={3} fill={SKIN.deep} opacity={0.6} />
        {/* boca */}
        <path d={mouth} stroke={SKIN.lip} strokeWidth={4.2} fill="none" strokeLinecap="round" />
        <path d="M286,412 Q300,417 314,412" stroke={SKIN.hi} strokeWidth={3} fill="none" opacity={0.45} />
        <path d="M260,330 C262,350 266,380 280,394" stroke={SKIN.shade} strokeWidth={2} fill="none" opacity={0.35} />
        {/* óculos redondos de aro metálico */}
        <g>
          <circle cx={262} cy={292} r={33} fill="#fff" fillOpacity={0.04} stroke="#C2A673" strokeWidth={3.2} />
          <circle cx={338} cy={292} r={33} fill="#fff" fillOpacity={0.04} stroke="#C2A673" strokeWidth={3.2} />
          <path d="M295,290 Q300,282 305,290" stroke="#C2A673" strokeWidth={3} fill="none" />
          <path d="M229,288 L205,282 M371,288 L395,282" stroke="#B1966A" strokeWidth={2.6} />
          <path d={`M244,276 Q252,268 264,266`} stroke="#fff" strokeOpacity={0.5} strokeWidth={2.5} fill="none" strokeLinecap="round" />
          <path d={`M320,276 Q328,268 340,266`} stroke="#fff" strokeOpacity={0.5} strokeWidth={2.5} fill="none" strokeLinecap="round" />
        </g>
        {/* luz de recorte no contorno */}
        <path d="M300,148 C365,148 398,200 398,270 C398,330 388,372 365,405 C345,432 322,446 300,446" stroke={rc} strokeWidth={6} strokeOpacity={0.6 * rim} fill="none" filter={`url(#${id}rimglow)`} />
      </g>
    </svg>
  );
};
