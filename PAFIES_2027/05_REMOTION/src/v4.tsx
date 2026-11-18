// PAFIES 2027 v4 — animação por recortes (cut-out): personagens com articulações, cenários em camadas, câmera 2.5D.
// Paleta: azul-marinho principal · vermelho/coral impacto · amarelo/dourado energia · azul-claro contraste · branco texto.
import React from 'react';
import { AbsoluteFill, Audio, Img, interpolate, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig, random } from 'remotion';
import { HEARTBEATS, SCENES } from './theme';
import { Band, circle, cl, eIn, eInOut, eOut, heart, LongShadow, Morph, PaperGrain, ramp, Ribbon, Shake, splat, Wipe, Words } from './v2/kit';
import { Stadium } from './v2/illus';

export const C4 = { navy: '#0B1F4D', navyDeep: '#071433', royal: '#1E40C8', red: '#E63946', coral: '#FF6B5B', yellow: '#FFC300', gold: '#E0A800', sky: '#8EC5E8', white: '#FFFFFF' };
const FD = "'Big Shoulders Display', Anton, sans-serif";

/* ---------- sprite com âncora (pivô) — equivalente a Anchor Point + Parent no AE ---------- */
const DIM: Record<string, [number, number]> = {
  teen_body: [414, 818], arm_megaphone: [649, 635], arm_navy_up: [391, 886], box: [695, 597], apple: [484, 544], can: [350, 574],
  rice: [401, 594], milk: [354, 599], runner_a: [580, 702], runner_b: [570, 747], jump_a: [424, 788], jump_b: [447, 772], jump_d: [431, 856],
};
const Sprite: React.FC<{ n: string; ax: number; ay: number; x: number; y: number; s: number; rot?: number; sx?: number; sy?: number; flip?: boolean; style?: React.CSSProperties }> =
  ({ n, ax, ay, x, y, s, rot = 0, sx = 1, sy = 1, flip, style }) => {
    const [w, h] = DIM[n];
    return <Img src={staticFile(`el/${n}.png`)} style={{
      position: 'absolute', left: x - ax * s, top: y - ay * s, width: w * s, height: h * s,
      transformOrigin: `${ax * s}px ${ay * s}px`, transform: `rotate(${rot}deg) scale(${sx * (flip ? -1 : 1)}, ${sy})`, ...style,
    }} />;
  };

const useSpr = (start: number, damping = 12, stiffness = 120, mass = 1) => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig();
  return spring({ frame: f - start, fps, config: { damping, stiffness, mass } });
};
const kick = (f: number, beats: number[], decay = 5) => beats.reduce((m, b) => (f >= b ? Math.max(m, Math.exp(-(f - b) / decay)) : m), 0);

/* ---------- RIG: jovem com megafone (corpo + braço articulado no ombro) ---------- */
const ShoutRig: React.FC<{ x: number; y: number; s?: number; enter: number; beats: number[]; arcs?: boolean }> = ({ x, y, s = 1.4, enter, beats, arcs = true }) => {
  const f = useCurrentFrame();
  const body = useSpr(enter, 13, 90);
  const armUp = useSpr(enter + 10, 9, 110); // overshoot natural
  const pump = kick(f, beats, 5);
  const armRot = interpolate(armUp, [0, 1], [55, -30]) - pump * 9; // antecipação (baixo) → ergue → golpes no tempo
  const breathe = 1 + 0.012 * Math.sin(f / 9);
  const recoil = -pump * 1.6;
  const by = y + (1 - body) * 800;
  const as = s * 0.82;
  // posição da boca do megafone (ponto local 594,144 → pivô 40,560)
  const r = (armRot * Math.PI) / 180, vx = (594 - 40) * as, vy = (144 - 560) * as;
  const mx = x + vx * Math.cos(r) - vy * Math.sin(r), my = by + vx * Math.sin(r) + vy * Math.cos(r);
  const dir = (Math.atan2(-416, 554) * 180) / Math.PI + armRot;
  return <>
    <Sprite n="arm_megaphone" ax={40} ay={560} x={x} y={by} s={as} rot={armRot} />
    <Sprite n="teen_body" ax={380} ay={360} x={x} y={by} s={s} rot={recoil} sy={breathe} style={{ filter: 'drop-shadow(-14px 18px 0 rgba(7,20,51,0.35))' }} />
    {arcs && beats.flatMap((b) => [0, 4, 8].map((o) => {
      const d = f - b - o; if (d < 0 || d > 20) return null;
      const rr = 70 + d * 17, a0 = ((dir - 32) * Math.PI) / 180, a1 = ((dir + 32) * Math.PI) / 180;
      return <svg key={b + '-' + o} width={1080} height={1920} style={{ position: 'absolute', left: 0, top: 0 }}>
        <path d={`M${mx + rr * Math.cos(a0)},${my + rr * Math.sin(a0)} A${rr},${rr} 0 0 1 ${mx + rr * Math.cos(a1)},${my + rr * Math.sin(a1)}`} stroke={C4.yellow} strokeWidth={14 * (1 - d / 20) + 3} fill="none" strokeLinecap="round" opacity={1 - d / 22} />
      </svg>;
    }))}
  </>;
};

/* ---------- formas geométricas que atravessam a composição (parallax) ---------- */
const Crossers: React.FC<{ seed: string; colors: string[]; speed?: number; count?: number }> = ({ seed, colors, speed = 1, count = 5 }) => {
  const f = useCurrentFrame();
  return <svg width={1080} height={1920} style={{ position: 'absolute', left: 0, top: 0 }}>
    {new Array(count).fill(0).map((_, i) => {
      const r = (k: string) => random(seed + k + i);
      const depth = 0.4 + r('d') * 0.9, size = 60 + r('s') * 170 * depth;
      const x = ((r('x') * 1500 + f * speed * 6 * depth) % 1500) - 210, y = 120 + r('y') * 1680;
      const rot = f * (r('w') - 0.5) * 2 + r('r') * 360, c = colors[i % colors.length], k = Math.floor(r('k') * 3);
      const t = `translate(${x} ${y}) rotate(${rot})`;
      if (k === 0) return <path key={i} d={`M${-size},0 A${size},${size} 0 0 1 ${size},0 Z`} fill={c} transform={t} opacity={0.9} />;
      if (k === 1) return <rect key={i} x={-size} y={-size * 0.18} width={size * 2} height={size * 0.36} rx={size * 0.18} fill={c} transform={t} opacity={0.9} />;
      return <circle key={i} r={size * 0.5} fill="none" stroke={c} strokeWidth={size * 0.14} transform={t} />;
    })}
  </svg>;
};
const Dots: React.FC<{ seed: string; color: string; count?: number }> = ({ seed, color, count = 26 }) => {
  const f = useCurrentFrame();
  return <AbsoluteFill>{new Array(count).fill(0).map((_, i) => {
    const r = (k: string) => random(seed + k + i);
    const y = (r('y') * 2000 - f * (0.6 + r('v') * 1.6)) % 2000, x = r('x') * 1080 + Math.sin((f + i * 20) / 30) * 20;
    return <div key={i} style={{ position: 'absolute', left: x, top: y < 0 ? y + 2000 : y, width: 6 + r('s') * 10, height: 6 + r('s') * 10, borderRadius: '50%', background: color, opacity: 0.35 + 0.5 * r('o') }} />;
  })}</AbsoluteFill>;
};
const Rays: React.FC<{ color: string; opacity: number; cx: number; cy: number; speed?: number }> = ({ color, opacity, cx, cy, speed = 0.2 }) => {
  const f = useCurrentFrame();
  return <svg width={1080} height={1920} style={{ position: 'absolute', left: 0, top: 0, opacity }}>
    <g transform={`rotate(${f * speed} ${cx} ${cy})`}>{new Array(18).fill(0).map((_, i) => {
      const a0 = (i / 18) * Math.PI * 2, a1 = a0 + Math.PI / 30, R = 2200;
      return <polygon key={i} points={`${cx},${cy} ${cx + R * Math.cos(a0)},${cy + R * Math.sin(a0)} ${cx + R * Math.cos(a1)},${cy + R * Math.sin(a1)}`} fill={color} />;
    })}</g>
  </svg>;
};

/* =============== CENA 1 — ABERTURA =============== */
const S1: React.FC = () => {
  const f = useCurrentFrame();
  const pulse = kick(f, HEARTBEATS, 7);
  const light = interpolate(f, [0, 150], [0.25, 1], cl);
  const iris = ramp(f, 150, 179, eIn);
  const tOut = ramp(f, 146, 158, eIn);
  const cam = interpolate(f, [0, 180], [1.06, 1], { ...cl, easing: eOut });
  return <AbsoluteFill style={{ background: C4.navyDeep }}>
    <AbsoluteFill style={{ transform: `scale(${cam})` }}>
      <AbsoluteFill style={{ background: `radial-gradient(circle at 70% 40%, rgba(30,64,200,${0.55 * light + pulse * 0.2}) 0%, rgba(11,31,77,${0.8 * light}) 45%, transparent 75%)` }} />
      {HEARTBEATS.map((hb) => { const d = f - hb; if (d < 0 || d > 34) return null;
        return <Morph key={hb} a={circle} b={splat('h' + hb, 0.12)} p={d / 34} x={760} y={760} r={140 + d * 24} fill="none" stroke={C4.sky} sw={8 * (1 - d / 34) + 1} style={{ opacity: 0.55 }} />; })}
      <Rays color={C4.royal} opacity={0.25 * light} cx={760} cy={760} speed={0.12} />
      <Dots seed="s1" color={C4.sky} />
      <Crossers seed="s1c" colors={[C4.royal, C4.coral]} speed={0.5} count={3} />
      <ShoutRig x={560} y={1330} enter={14} beats={[38, 62, 98, 112, 126]} />
    </AbsoluteFill>
    <AbsoluteFill style={{ opacity: 1 - tOut, transform: `translateY(${-tOut * 80}px)` }}>
      <Words text="EI, GALERA…" start={33} size={190} y={260} color={C4.white} stagger={6} exit={86} font={FD} shadow={C4.royal} />
      <Words text="ESTÃO" start={93} size={260} y={210} color={C4.yellow} font={FD} shadow={C4.red} />
      <Band x={480} y={400} w={880} h={160} start={99} color={C4.red} rot={-3} />
      <Words text="PREPARADOS?" start={101} size={160} y={400} x={480} color={C4.white} rot={-3} font={FD} />
    </AbsoluteFill>
    {iris > 0 && <Morph a={splat('iris', 0.22)} b={circle} p={iris} x={900} y={600} r={iris * 2400} fill={C4.red} />}
  </AbsoluteFill>;
};

/* =============== CENA 2 — REVELAÇÃO =============== */
const S2: React.FC = () => {
  const f = useCurrentFrame();
  const shrink = ramp(f, 0, 18, eInOut);
  const lift = ramp(f, 88, 112, eInOut);
  const ly = interpolate(lift, [0, 1], [880, 560]), ld = interpolate(lift, [0, 1], [580, 400]);
  const logo = useSpr(8, 10, 120);
  const burstR = interpolate(shrink, [0, 1], [2400, 400]) + Math.sin(f / 12) * 8;
  return <AbsoluteFill style={{ background: C4.navy }}>
    <Shake hits={[0, 96]}>
      <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 45%, ${C4.royal} 0%, ${C4.navy} 60%)` }} />
      <Rays color={C4.yellow} opacity={0.14} cx={540} cy={ly} speed={0.35} />
      <Crossers seed="s2c" colors={[C4.coral, C4.yellow, C4.sky]} speed={1.2} count={6} />
      <Morph a={circle} b={splat('b2', 0.08)} p={0.5 + 0.5 * Math.sin(f / 14)} x={540} y={ly} r={burstR * interpolate(lift, [0, 1], [1, 0.72])} fill={C4.red} />
      <svg width={1080} height={1920} style={{ position: 'absolute' }}><circle cx={540} cy={ly} r={ld / 2 + 70} fill="none" stroke={C4.yellow} strokeWidth={10} strokeDasharray="40 26" transform={`rotate(${f * 0.8} 540 ${ly})`} opacity={shrink} /></svg>
      <Ribbon d="M-150,1250 C200,1300 260,700 540,620 C820,540 1060,800 920,1080 C800,1320 440,1300 360,1100" colors={[C4.yellow, C4.white, C4.sky]} width={64} start={6} dur={32} />
      <Ribbon d="M1250,1450 C900,1600 300,1520 120,1220" colors={[C4.coral, C4.yellow]} width={46} start={92} dur={26} />
      <Dots seed="s2" color={C4.yellow} count={20} />
      <div style={{ position: 'absolute', left: 540 - ld / 2, top: ly - ld / 2, width: ld, height: ld, transform: `scale(${logo}) rotate(${(1 - logo) * -25}deg)`, filter: `drop-shadow(0 ${10}px 0 ${C4.navyDeep}) drop-shadow(0 8px 0 ${C4.navyDeep}) drop-shadow(0 26px 30px rgba(0,0,0,0.4))` }}>
        <Img src={staticFile('logo/pafies_logo.png')} style={{ width: '100%', height: '100%' }} />
      </div>
      <LongShadow text="10ª" size={420} x={540} y={1060} color={C4.yellow} shade={C4.navyDeep} len={34} start={96} font={FD} />
      <Words text="EDIÇÃO" start={110} size={150} y={1300} color={C4.white} font={FD} shadow={C4.navyDeep} />
      <Band x={540} y={1450} w={940} h={125} start={138} color={C4.red} rot={-3} />
      <Words text="GINCANA SOLIDÁRIA" start={142} size={100} y={1450} color={C4.white} rot={-3} font={FD} />
      <Words text="PAFIES 2027" start={164} size={150} y={1605} color={C4.yellow} shadow={C4.navyDeep} font={FD} />
    </Shake>
  </AbsoluteFill>;
};

/* =============== CENA 3 — SOLIDARIEDADE =============== */
const FOOD = [
  { n: 'apple', ax: 242, ay: 272, x: 230, y: 760, s: 0.42, d: 20 }, { n: 'can', ax: 175, ay: 287, x: 860, y: 700, s: 0.42, d: 26 },
  { n: 'rice', ax: 200, ay: 297, x: 190, y: 1060, s: 0.4, d: 32 }, { n: 'milk', ax: 177, ay: 300, x: 890, y: 1040, s: 0.4, d: 38 },
];
const WORDS = ['DESAFIOS', 'UNIÃO', 'CRIATIVIDADE', 'DIVERSÃO', 'SOLIDARIEDADE'];
const S3: React.FC = () => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig();
  const rise = useSpr(2, 14, 80);
  const lift = Math.sin(f / 16) * 10;
  const out = ramp(f, 192, 210, eIn);
  const hp = ramp(f, 200, 226, eOut);
  const yOff = (1 - rise) * 1000;
  return <AbsoluteFill style={{ background: C4.sky }}>
    <Shake hits={[0, 206]}>
      <svg width={1080} height={1920} style={{ position: 'absolute' }}>
        <circle cx={540} cy={980} r={430 + Math.sin(f / 20) * 10} fill={C4.white} opacity={0.55} />
        {[0, 1, 2, 3, 4, 5].map((k) => { const t = ((f * 5 + k * 360) % 2160) - 240;
          return <polygon key={k} points={`${180 + t * 0.12},${t} ${215 + t * 0.12},${t} ${200 + (t + 120) * 0.12},${t + 120} ${165 + (t + 120) * 0.12},${t + 120}`} fill={C4.red} />; })}
        {[0, 1, 2, 3, 4, 5].map((k) => { const t = ((f * 5 + k * 360 + 180) % 2160) - 240;
          return <polygon key={'r' + k} points={`${880 - t * 0.12},${t} ${915 - t * 0.12},${t} ${900 - (t + 120) * 0.12},${t + 120} ${865 - (t + 120) * 0.12},${t + 120}`} fill={C4.red} />; })}
      </svg>
      <Crossers seed="s3c" colors={[C4.white, C4.yellow, C4.royal]} speed={0.6} count={5} />
      {FOOD.map((it, i) => {
        const p = spring({ frame: f - it.d, fps, config: { damping: 12, stiffness: 85 } });
        const sx0 = 540, sy0 = 860 + yOff;
        const px = sx0 + (it.x - sx0) * p * (1 + out * 0.9), py = sy0 + (it.y - sy0) * p - Math.sin(Math.min(1, p) * Math.PI) * 180 - out * 260;
        const bob = Math.sin((f + i * 23) / 13) * 16;
        return <Sprite key={i} n={it.n} ax={it.ax} ay={it.ay} x={px} y={py + bob} s={it.s * Math.min(1, p * 1.2) * (1 - out)} rot={Math.sin((f + i * 30) / 18) * 10 + (1 - p) * 120} style={{ filter: 'drop-shadow(10px 14px 0 rgba(11,31,77,0.25))' }} />;
      })}
      <Sprite n="arm_navy_up" ax={195} ay={886} x={320} y={2040 + yOff + lift} s={1.05} rot={5 + Math.sin(f / 16) * 1.5} />
      <Sprite n="arm_navy_up" ax={195} ay={886} x={760} y={2040 + yOff + lift} s={1.05} rot={-5 - Math.sin(f / 16) * 1.5} flip />
      <Sprite n="box" ax={347} ay={560} x={540} y={1250 + yOff + lift * 1.1} s={0.82} rot={Math.sin(f / 16) * 1.5} style={{ filter: 'drop-shadow(0 22px 0 rgba(11,31,77,0.2))' }} />
      {hp > 0 && <Morph a={circle} b={heart} p={hp} x={540} y={760} r={300 * ramp(f, 198, 214)} fill={C4.red} stroke={C4.navy} sw={10} rot={Math.sin(f / 12) * 3} />}
      {WORDS.map((w, i) => { const st = 18 + i * 22; if (f < st - 1 || f > st + 24) return null;
        return <Words key={w} text={w} start={st} size={i === 4 ? 160 : 180} y={300} color={i % 2 ? C4.red : C4.navy} exit={st + 12} dur={10} font={FD} />; })}
      <Words text="MUITO MAIS QUE" start={130} size={110} y={240} color={C4.navy} exit={196} stagger={3} font={FD} />
      <Words text="UMA COMPETIÇÃO." start={138} size={140} y={380} color={C4.white} shadow={C4.navy} exit={198} stagger={3} font={FD} />
      <Words text="UMA MISSÃO DE" start={212} size={115} y={240} color={C4.navy} stagger={3} font={FD} />
      <Band x={540} y={390} w={1010} h={165} start={220} color={C4.red} rot={-3} />
      <Words text="SOLIDARIEDADE." start={224} size={150} y={390} color={C4.white} rot={-3} font={FD} />
    </Shake>
  </AbsoluteFill>;
};

/* =============== CENA 4 — EXPECTATIVA =============== */
const Jumper: React.FC<{ n: string; x: number; y: number; s: number; phase: number; flip?: boolean; start: number }> = ({ n, x, y, s, phase, flip, start }) => {
  const f = useCurrentFrame();
  const t = ((f - start + phase) % 15) / 15; // um pulo por batida (120 BPM)
  const air = Math.sin(t * Math.PI);
  const land = t < 0.12 ? 1 - t / 0.12 : 0;
  const enter = spring({ frame: f - start - phase * 0.3, fps: 30, config: { damping: 12, stiffness: 160 } });
  const [w, h] = DIM[n];
  return <Sprite n={n} ax={w / 2} ay={h} x={x} y={y - air * 70 + (1 - enter) * 600} s={s} sy={1 - land * 0.08 + air * 0.04} sx={1 + land * 0.06} flip={flip} rot={Math.sin((f + phase * 5) / 8) * 3} />;
};
const Runner: React.FC<{ n: string; x: number; y: number; s: number; phase: number; start: number }> = ({ n, x, y, s, phase, start }) => {
  const f = useCurrentFrame();
  const [w, h] = DIM[n];
  const b = Math.abs(Math.sin((f + phase) / 4.8));
  const enter = spring({ frame: f - start, fps: 30, config: { damping: 14, stiffness: 120 } });
  return <>
    <div style={{ position: 'absolute', left: x - 170 * s, top: y - 20 * s, width: 340 * s, height: 40 * s, borderRadius: '50%', background: 'rgba(7,20,51,0.35)', transform: `scaleX(${1 - b * 0.3})` }} />
    <Sprite n={n} ax={w / 2} ay={h} x={x - (1 - enter) * 900 + (f - start) * 1.2} y={y - b * 34} s={s} rot={-4 + Math.sin((f + phase) / 4.8) * 3} />
  </>;
};
const Speed: React.FC<{ color: string }> = ({ color }) => {
  const f = useCurrentFrame();
  return <svg width={1080} height={1920} style={{ position: 'absolute' }}>{new Array(12).fill(0).map((_, k) => {
    const x = 1300 - ((f * 70 + k * 230) % 1700), y = 700 + (k * 97) % 1100;
    return <rect key={k} x={x} y={y} width={180 + (k % 3) * 120} height={10 + (k % 2) * 8} rx={8} fill={k % 3 ? color : C4.yellow} opacity={0.55} />;
  })}</svg>;
};
const S4: React.FC = () => {
  const f = useCurrentFrame();
  const punch = 1 + 0.025 * Math.exp(-(f % 15) / 4);
  return <AbsoluteFill style={{ background: C4.navy }}>
    <Shake hits={[0, 60, 120, 180]}>
      {f < 60 && <AbsoluteFill style={{ transform: `scale(${punch})`, background: `radial-gradient(circle at 50% 70%, ${C4.royal}, ${C4.navy} 70%)` }}>
        <Speed color={C4.white} />
        <Ribbon d="M600,1250 C350,1150 200,1380 -200,1250" colors={[C4.yellow, C4.coral, C4.white]} width={56} start={0} dur={20} tail={0.4} />
        <Runner n="runner_b" x={360} y={1500} s={0.9} phase={3} start={0} />
        <Runner n="runner_a" x={640} y={1700} s={1.15} phase={0} start={2} />
        <Ribbon d="M640,1450 C900,1350 1000,1550 1300,1420" colors={[C4.white, C4.yellow]} width={40} start={14} dur={20} tail={0.4} />
        <Words text="PREPARE" start={0} size={290} y={320} color={C4.yellow} shadow={C4.navyDeep} stagger={2} font={FD} />
        <Words text="SUA EQUIPE!" start={6} size={180} y={570} color={C4.white} shadow={C4.navyDeep} stagger={3} font={FD} />
      </AbsoluteFill>}
      {f >= 60 && f < 120 && <AbsoluteFill style={{ transform: `scale(${punch})`, background: C4.yellow }}>
        <Rays color={C4.gold} opacity={0.35} cx={540} cy={1500} speed={0.6} />
        <Crossers seed="s4c" colors={[C4.coral, C4.white, C4.royal]} speed={1.4} count={5} />
        <Jumper n="jump_b" x={200} y={1560} s={0.62} phase={4} start={60} flip />
        <Jumper n="jump_d" x={540} y={1540} s={0.6} phase={9} start={60} />
        <Jumper n="jump_a" x={880} y={1570} s={0.62} phase={2} start={60} flip />
        <Jumper n="jump_a" x={330} y={1900} s={0.78} phase={0} start={62} />
        <Jumper n="jump_b" x={760} y={1910} s={0.78} phase={7} start={62} />
        <Words text="REÚNA" start={60} size={270} y={340} color={C4.navy} stagger={2} font={FD} />
        <Words text="A GALERA!" start={66} size={200} y={590} color={C4.red} shadow={C4.navy} stagger={3} font={FD} />
      </AbsoluteFill>}
      {f >= 120 && f < 180 && <AbsoluteFill style={{ transform: `scale(${punch})`, background: `radial-gradient(circle at 60% 40%, ${C4.coral}, ${C4.red} 70%)` }}>
        <Rays color={C4.yellow} opacity={0.18} cx={900} cy={700} speed={0.8} />
        <Sequence from={120} layout="none"><ShoutRig x={480} y={1360} enter={-14} beats={[8, 23, 38, 53]} /></Sequence>
        <Words text="ESSA EDIÇÃO" start={120} size={180} y={260} color={C4.white} stagger={4} font={FD} shadow={C4.navy} />
        <LongShadow text="PROMETE!" size={290} x={540} y={500} color={C4.yellow} shade={C4.navy} len={28} start={128} font={FD} />
      </AbsoluteFill>}
    </Shake>
    <Sequence from={180} durationInFrames={60} layout="none"><Countdown4 /></Sequence>
    <Wipe at={52} colors={[C4.yellow, C4.navy]} />
    <Wipe at={112} colors={[C4.coral, C4.white]} dir={-1} />
  </AbsoluteFill>;
};
const Countdown4: React.FC = () => {
  const f = useCurrentFrame();
  const idx = f < 15 ? 0 : f < 30 ? 1 : 2;
  const bgs = [C4.white, C4.royal, C4.red], nums = ['3', '2', '1'], circ = [C4.navy, C4.yellow, C4.navy], numC = [C4.yellow, C4.navy, C4.yellow];
  const beat = f - idx * 15, grow = ramp(f, 44, 60, eIn);
  return <AbsoluteFill style={{ background: bgs[idx] }}>
    <Morph a={splat('c4' + idx, 0.3)} b={circle} p={ramp(beat, 0, 8)} x={540} y={980} r={360 + grow * 1500 - (1 - ramp(beat, 0, 6)) * 120} fill={grow > 0 ? C4.navy : circ[idx]} />
    {grow < 0.3 && <LongShadow key={idx} text={nums[idx]} size={620} x={540} y={1000} color={numC[idx]} shade={idx === 1 ? C4.gold : C4.red} len={30} start={idx * 15} font={FD} />}
    <Band x={540} y={330} w={1010} h={110} start={0} color={C4.navy} rot={-2} />
    <Words text="A CONTAGEM REGRESSIVA COMEÇOU!" start={2} size={74} y={330} color={C4.white} rot={-2} stagger={2} font={FD} />
  </AbsoluteFill>;
};

/* =============== CENA 5 — FINAL =============== */
const S5: React.FC = () => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig();
  const hit = spring({ frame: f - 180, fps, config: { damping: 8, stiffness: 200 } });
  const sc = f >= 180 ? 1 + 0.05 * (1 - hit) : 1;
  const logo = useSpr(0, 10, 110);
  const ringP = ramp(f, 180, 214);
  const glow = 0.6 + 0.4 * Math.abs(Math.sin((f / 15) * Math.PI / 2));
  const cy = 840;
  return <AbsoluteFill style={{ background: C4.navy }}>
    <Shake hits={[0, 180]} amp={26}>
      <AbsoluteFill style={{ transform: `scale(${interpolate(f, [0, 240], [1.08, 1], cl) * sc})` }}>
        <Stadium glow={glow} />
        <Rays color={C4.yellow} opacity={0.1} cx={540} cy={cy} speed={0.3} />
        <Dots seed="s5" color={C4.yellow} count={24} />
        <Ribbon d="M-150,1000 C100,520 500,500 800,640 C1100,800 980,1200 700,1240 C480,1270 330,1130 380,960" colors={[C4.yellow, C4.coral, C4.white]} width={62} start={2} dur={34} />
        <Ribbon d="M-150,1000 C100,520 500,500 800,640 C1100,800 980,1200 700,1240 C480,1270 330,1130 380,960" colors={[C4.coral, C4.yellow, C4.sky]} width={62} start={176} dur={30} />
        <svg width={1080} height={1920} style={{ position: 'absolute' }}>
          <circle cx={540} cy={cy} r={330 + ringP * 900} fill="none" stroke={C4.yellow} strokeWidth={30 * (1 - ringP)} opacity={f >= 180 ? 1 - ringP : 0} />
          <circle cx={540} cy={cy} r={320 * ramp(f, 0, 12)} fill={C4.yellow} />
        </svg>
        <div style={{ position: 'absolute', left: 540 - 290, top: cy - 290, width: 580, height: 580, transform: `scale(${logo}) rotate(${(1 - logo) * 25}deg)`, filter: `drop-shadow(0 10px 0 ${C4.navyDeep}) drop-shadow(0 10px 0 ${C4.navyDeep})` }}>
          <Img src={staticFile('logo/pafies_logo.png')} style={{ width: '100%', height: '100%' }} />
        </div>
        <Jumper n="jump_a" x={170} y={2090} s={0.48} phase={0} start={20} />
        <Jumper n="jump_b" x={400} y={2100} s={0.5} phase={6} start={24} flip />
        <Jumper n="jump_d" x={660} y={2095} s={0.48} phase={3} start={28} />
        <Jumper n="jump_b" x={900} y={2090} s={0.48} phase={10} start={32} />
        <Band x={540} y={300} w={1000} h={140} start={2} color={C4.red} rot={-2} />
        <Words text="ESTÃO PREPARADOS?" start={4} size={112} y={300} color={C4.white} rot={-2} stagger={4} font={FD} />
        <LongShadow text="PAFIES 2027" size={200} x={540} y={1260} color={C4.yellow} shade={C4.navyDeep} len={24} start={60} font={FD} />
        <Band x={540} y={1430} w={960} h={120} start={120} color={C4.white} rot={-3} />
        <Words text="VAMOS FAZER HISTÓRIA!" start={124} size={100} y={1430} color={C4.navy} rot={-3} stagger={4} font={FD} />
        <Words text="10ª EDIÇÃO · UMA SÓ MISSÃO: FAZER A DIFERENÇA" start={150} size={46} y={1560} color={C4.white} stagger={2} tracking={0.04} font={FD} />
      </AbsoluteFill>
    </Shake>
  </AbsoluteFill>;
};

const LIST = [{ C: S1, ...SCENES.s1 }, { C: S2, ...SCENES.s2 }, { C: S3, ...SCENES.s3 }, { C: S4, ...SCENES.s4 }, { C: S5, ...SCENES.s5 }];
export const PAFIES2027V4: React.FC<{ withAudio: boolean }> = ({ withAudio }) => (
  <AbsoluteFill style={{ background: C4.navy }}>
    {LIST.map(({ C, from, dur }, i) => <Sequence key={i} from={from} durationInFrames={dur} name={`V4_CENA_0${i + 1}`}><C /></Sequence>)}
    <Wipe at={SCENES.s3.from - 8} dur={16} colors={[C4.yellow, C4.navy, C4.sky]} />
    <Wipe at={SCENES.s4.from - 8} dur={16} colors={[C4.red, C4.yellow, C4.navy]} dir={-1} />
    <PaperGrain opacity={0.07} />
    {withAudio && <Audio src={staticFile('audio/PAFIES2027_mix.wav')} />}
  </AbsoluteFill>
);
export const TeaserV4: React.FC = () => (
  <AbsoluteFill><Sequence durationInFrames={240}><S4 /></Sequence><Sequence from={240} durationInFrames={240}><S5 /></Sequence><PaperGrain opacity={0.07} />
    <Audio src={staticFile('audio/PAFIES2027_mix.wav')} startFrom={SCENES.s4.from} /></AbsoluteFill>
);
