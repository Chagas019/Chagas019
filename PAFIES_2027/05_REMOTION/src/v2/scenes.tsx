// PAFIES 2027 v2 — cenas (mesmo roteiro e mesma trilha; nova linguagem editorial 2D).
import React from 'react';
import { AbsoluteFill, Img, interpolate, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { HEARTBEATS } from '../theme';
import { Band, Cam, cl, circle, Confetti, eIn, eInOut, eOut, Floaters, heart, Layer, LongShadow, Morph, P, ramp, Ribbon, Shake, splat, Spray, Wipe, Words } from './kit';
import { Apple, Can, DonationBox, Hand, HeartIcon, MegaphoneHand, Milk, Person, Rice, Runner, Stadium } from './illus';

const useSpring = (start: number, damping = 14, stiffness = 120) => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig();
  return spring({ frame: f - start, fps, config: { damping, stiffness } });
};

/* arcos sonoros saindo do megafone */
const SoundArcs: React.FC<{ x: number; y: number; dir: number; beats: number[]; color?: string }> = ({ x, y, dir, beats, color = P.yellow }) => {
  const f = useCurrentFrame();
  return <svg width={1080} height={1920} style={{ position: 'absolute', left: 0, top: 0 }}>
    {beats.flatMap((b) => [0, 4, 8].map((o) => {
      const d = f - b - o; if (d < 0 || d > 22) return null;
      const r = 90 + d * 16, a0 = ((dir - 38) * Math.PI) / 180, a1 = ((dir + 38) * Math.PI) / 180;
      return <path key={`${b}-${o}`} d={`M${x + r * Math.cos(a0)},${y + r * Math.sin(a0)} A${r},${r} 0 0 1 ${x + r * Math.cos(a1)},${y + r * Math.sin(a1)}`}
        stroke={color} strokeWidth={18 * (1 - d / 22) + 4} fill="none" strokeLinecap="round" opacity={1 - d / 24} />;
    }))}
  </svg>;
};

/* ================= CENA 01 — ABERTURA ================= */
export const V2S1: React.FC = () => {
  const f = useCurrentFrame();
  const mx = 560, my = 1250, rot = -32; // boca do megafone (âncora do match-cut)
  const rise = useSpring(18, 13, 90);
  const zoom = interpolate(f, [148, 179], [1, 16], { ...cl, easing: eIn });
  const push = interpolate(f, [0, 148], [1, 1.06], cl);
  const textOut = ramp(f, 146, 160, eIn);
  let pulse = 0;
  for (const hb of HEARTBEATS) { const d = f - hb; if (d >= 0) pulse = Math.max(pulse, Math.exp(-d / 7)); }
  return (
    <AbsoluteFill style={{ background: P.navy }}>
      <AbsoluteFill style={{ transform: `scale(${zoom * push})`, transformOrigin: `${mx}px ${my}px` }}>
        <Spray color="blue" opacity={0.22 + pulse * 0.25} />
        {HEARTBEATS.map((hb) => {
          const d = f - hb; if (d < 0 || d > 34) return null;
          return <Morph key={hb} a={circle} b={splat('hb' + hb, 0.16)} p={d / 34} x={mx} y={my} r={120 + d * 22} fill="none" stroke={P.royal} sw={10 * (1 - d / 34) + 2} />;
        })}
        <Morph a={circle} b={splat('core', 0.1)} p={0.5 + 0.5 * Math.sin(f / 9)} x={mx} y={my} r={150 + pulse * 40} fill={P.royalDark} style={{ opacity: 0.55 }} />
        <SoundArcs x={mx} y={my} dir={rot} beats={[38, 62, 98, 112, 126]} />
        <MegaphoneHand x={mx} y={my + (1 - rise) * 900} rot={rot + Math.sin(f * 1.7) * 1.5 * Math.exp(-Math.max(0, f - 98) / 20)} s={1.05} />
      </AbsoluteFill>
      <AbsoluteFill style={{ opacity: 1 - textOut, transform: `translateY(${-textOut * 80}px)` }}>
        <Words text="EI, GALERA…" start={33} size={170} y={520} color={P.cream} stagger={6} exit={86} />
        <Words text="ESTÃO" start={93} size={260} y={420} color={P.yellow} shadow={P.royal} />
        <Band x={540} y={690} w={1000} h={200} start={99} color={P.red} rot={-3} />
        <Words text="PREPARADOS?" start={101} size={180} y={690} color={P.cream} rot={-3} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ================= CENA 02 — REVELAÇÃO ================= */
export const V2S2: React.FC = () => {
  const f = useCurrentFrame();
  const lift = ramp(f, 90, 116, eInOut);
  const ly = interpolate(lift, [0, 1], [840, 450]), lw = interpolate(lift, [0, 1], [640, 380]);
  const pop = useSpring(6, 11, 130);
  const plate = ramp(f, 0, 14);
  return (
    <AbsoluteFill style={{ background: P.red }}>
      <Shake hits={[0, 96]}>
        <Cam x={interpolate(f, [0, 240], [-20, 20])} y={interpolate(f, [0, 240], [30, -30])} z={interpolate(f, [0, 240], [1.06, 1])}>
          <Layer depth={0.2}>
            <svg width={1080} height={1920} style={{ position: 'absolute' }}>
              <polygon points="-200,1500 1300,700 1300,1100 -200,1900" fill={P.redDark} />
              <polygon points="-200,600 1300,-200 1300,40 -200,840" fill={P.redDark} opacity={0.6} />
            </svg>
          </Layer>
          <Layer depth={0.5}><Spray color="yellow" opacity={0.35} start={2} rot={180} scale={1.1} x={-200} y={500} /><Floaters seed="s2" colors={[P.yellow, P.cream, P.navy]} count={18} /></Layer>
          <Layer depth={1}>
            <Ribbon d="M-150,1350 C150,1300 120,620 540,480 C930,350 1080,760 900,1080 C760,1320 420,1240 330,1020" colors={[P.yellow, P.cream, P.royal]} width={80} start={4} dur={34} />
            <Ribbon d="M1250,300 C900,330 760,900 540,1000 C300,1110 120,900 260,700" colors={[P.navy, P.royal]} width={46} start={14} dur={30} />
            <Ribbon d="M-120,1650 C300,1500 700,1700 1200,1350" colors={[P.yellow, P.navy]} width={60} start={92} dur={26} />
            <Morph a={splat('lg', 0.35)} b={circle} p={plate} x={540} y={ly} r={(lw / 2 + 26) * plate} fill={P.navy} />
            <div style={{ position: 'absolute', left: 540 - lw / 2, top: ly - lw / 2, width: lw, height: lw, transform: `scale(${pop}) rotate(${(1 - pop) * -20}deg)` }}>
              <Img src={staticFile('logo/pafies_logo.png')} style={{ width: '100%', height: '100%' }} />
            </div>
            <LongShadow text="10" size={560} x={510} y={1010} color={P.yellow} shade={P.navy} len={46} start={96} />
            <LongShadow text="ª" size={220} x={800} y={880} color={P.yellow} shade={P.navy} len={22} start={104} />
            <Words text="EDIÇÃO" start={112} size={150} y={1300} color={P.cream} shadow={P.navy} />
            <Band x={540} y={1450} w={940} h={130} start={138} color={P.navy} rot={-3} />
            <Words text="GINCANA SOLIDÁRIA" start={142} size={96} y={1450} color={P.cream} rot={-3} />
            <Words text="PAFIES 2027" start={164} size={150} y={1610} color={P.yellow} shadow={P.navy} />
          </Layer>
        </Cam>
      </Shake>
    </AbsoluteFill>
  );
};

/* ================= CENA 03 — SOLIDARIEDADE ================= */
const ITEMS = [
  { C: Apple, x: 230, y: 760, d: 18, s: 1.25 },
  { C: Can, x: 860, y: 700, d: 24, s: 1.2 },
  { C: Rice, x: 190, y: 1060, d: 30, s: 1.15 },
  { C: Milk, x: 890, y: 1040, d: 36, s: 1.15 },
  { C: HeartIcon, x: 540, y: 600, d: 42, s: 1.1 },
];
const WORDS = ['DESAFIOS', 'UNIÃO', 'CRIATIVIDADE', 'DIVERSÃO', 'SOLIDARIEDADE'];

export const V2S3: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const arms = useSpring(2, 15, 80);
  const itemsOut = ramp(f, 192, 210, eIn);
  const hp = ramp(f, 200, 226, eOut);
  return (
    <AbsoluteFill style={{ background: P.cream }}>
      <Shake hits={[0, 206]}>
        <Cam x={interpolate(f, [0, 300], [-24, 24])} z={interpolate(f, [0, 300], [1, 1.07])}>
          <Layer depth={0.25}>
            <svg width={1080} height={1920} style={{ position: 'absolute' }}>
              <path d="M620,1920 C640,1500 760,1380 820,1240 C860,1150 900,1180 940,1080 C990,960 1040,990 1100,920 L1100,1920Z" fill={P.sky} />
              <path d="M-20,1920 C10,1650 90,1600 140,1480 C180,1390 220,1420 260,1330 L300,1920Z" fill={P.sky} opacity={0.7} />
            </svg>
          </Layer>
          <Layer depth={0.45}>
            <svg width={1080} height={1920} style={{ position: 'absolute' }}>
              {[0, 1, 2, 3, 4].map((k) => {
                const t = ((f * 4 + k * 420) % 2100) - 200;
                return <polygon key={k} points={`${760 - t * 0.45},${t} ${800 - t * 0.45},${t} ${760 - (t + 140) * 0.45},${t + 140} ${720 - (t + 140) * 0.45},${t + 140}`} fill={P.red} opacity={0.85} />;
              })}
            </svg>
            <Floaters seed="s3" colors={[P.red, P.royal, P.yellow, P.sky]} count={14} area={[0, 400, 1080, 1500]} />
          </Layer>
          <Layer depth={0.8}>
            {ITEMS.map(({ C, x, y, d, s }, i) => {
              const p = spring({ frame: f - d, fps, config: { damping: 13, stiffness: 90 } });
              const bx = 540, by = 1260;
              const px = bx + (x - bx) * p, py = by + (y - by) * p - Math.sin(p * Math.PI) * 160;
              const bob = Math.sin((f + i * 23) / 14) * 14;
              const ex = 1 + itemsOut * 0.8;
              return <C key={i} x={540 + (px - 540) * ex} y={py + bob - itemsOut * 200} s={s * p * (1 - itemsOut)} rot={Math.sin((f + i * 30) / 20) * 8 + (1 - p) * 90} />;
            })}
          </Layer>
          <Layer depth={1}>
            <div style={{ position: 'absolute', inset: 0, transform: `translateY(${(1 - arms) * 900}px)` }}>
              <Hand x={300} y={1760} rot={28} s={1.15} sleeve={P.royal} cuff={P.cream} />
              <Hand x={780} y={1770} rot={-28} s={1.15} sleeve={P.red} cuff={P.yellow} flip />
              <DonationBox x={540} y={1300} s={1.35} rot={Math.sin(f / 18) * 2} />
            </div>
            {hp > 0 && <Spray color="yellow" opacity={0.3} start={206} scale={0.8} x={0} y={-140} />}
            {hp > 0 && <Morph a={circle} b={heart} p={hp} x={540} y={820} r={330 * ramp(f, 198, 214)} fill={P.red} stroke={P.navy} sw={10} rot={Math.sin(f / 12) * 3} />}
          </Layer>
          <Layer depth={1.1}>
            {WORDS.map((w, i) => {
              const st = 18 + i * 22;
              if (f < st - 1 || f > st + 26) return null;
              return <Words key={w} text={w} start={st} size={i === 4 ? 150 : 170} y={320} color={i % 2 ? P.red : P.royal} exit={st + 12} dur={10} />;
            })}
            <Words text="MUITO MAIS QUE" start={130} size={104} y={250} color={P.navy} exit={196} stagger={3} />
            <Words text="UMA COMPETIÇÃO." start={138} size={136} y={390} color={P.royal} exit={198} stagger={3} />
            <Words text="UMA MISSÃO DE" start={212} size={110} y={250} color={P.navy} stagger={3} />
            <Band x={540} y={400} w={1010} h={170} start={220} color={P.red} rot={-3} />
            <Words text="SOLIDARIEDADE." start={224} size={150} y={400} color={P.cream} rot={-3} />
          </Layer>
        </Cam>
      </Shake>
    </AbsoluteFill>
  );
};

/* ================= CENA 04 — EXPECTATIVA ================= */
const Countdown: React.FC = () => {
  const f = useCurrentFrame(); // local 0–60
  const idx = f < 15 ? 0 : f < 30 ? 1 : 2;
  const bgs = [P.cream, P.royal, P.red], nums = ['3', '2', '1'], circ = [P.navy, P.yellow, P.navy], numC = [P.yellow, P.navy, P.yellow];
  const beat = f - idx * 15;
  const grow = ramp(f, 44, 60, eIn);
  return <AbsoluteFill style={{ background: bgs[idx] }}>
    <Morph a={splat('cd' + idx, 0.3)} b={circle} p={ramp(beat, 0, 8)} x={540} y={980} r={360 + grow * 1400 - (1 - ramp(beat, 0, 6)) * 120} fill={grow > 0 ? P.yellow : circ[idx]} />
    {grow < 0.3 && <LongShadow key={idx} text={nums[idx]} size={600} x={540} y={1000} color={numC[idx]} shade={idx === 1 ? P.royalDark : P.redDark} len={30} start={idx * 15} />}
    <Band x={540} y={330} w={1010} h={110} start={0} color={P.navy} rot={-2} />
    <Words text="A CONTAGEM REGRESSIVA COMEÇOU!" start={2} size={70} y={330} color={P.cream} rot={-2} stagger={2} />
  </AbsoluteFill>;
};

export const V2S4: React.FC = () => {
  const f = useCurrentFrame();
  const beatPunch = 1 + 0.03 * Math.exp(-(f % 15) / 4);
  const run = f * 0.42;
  return (
    <AbsoluteFill style={{ background: P.navy }}>
      <Shake hits={[0, 60, 120, 180]}>
        {f < 60 && <AbsoluteFill style={{ background: P.royal, transform: `scale(${beatPunch})` }}>
          <Spray color="navy" opacity={0.35} />
          <svg width={1080} height={1920} style={{ position: 'absolute' }}>
            {new Array(9).fill(0).map((_, k) => { const x = 1200 - ((f * 60 + k * 170) % 1500); return <rect key={k} x={x} y={1560 + (k % 3) * 60} width={220} height={14} rx={7} fill={P.cream} opacity={0.6} />; })}
          </svg>
          <Ribbon d="M560,1150 C300,1100 200,1300 -200,1250" colors={[P.yellow, P.red, P.cream]} width={70} start={0} dur={20} tail={0.4} />
          <Ribbon d="M520,1300 C300,1420 160,1380 -200,1500" colors={[P.cream, P.yellow]} width={50} start={8} dur={20} tail={0.4} />
          <Ribbon d="M560,1150 C300,1100 200,1300 -200,1250" colors={[P.yellow, P.red, P.cream]} width={70} start={30} dur={20} tail={0.4} />
          <Runner x={600} y={980 - Math.abs(Math.sin(run)) * 40} s={1.55} phase={run} rot={-8} />
          <Words text="PREPARE" start={0} size={270} y={340} color={P.yellow} shadow={P.navy} stagger={2} />
          <Words text="SUA EQUIPE!" start={6} size={170} y={590} color={P.cream} shadow={P.navy} stagger={3} />
        </AbsoluteFill>}
        {f >= 60 && f < 120 && <AbsoluteFill style={{ background: P.yellow, transform: `scale(${beatPunch})` }}>
          <Spray color="red" opacity={0.25} rot={90} />
          {[0, 1, 2, 3, 4].map((i) => { const j = Math.abs(Math.sin((f + i * 5) / 7.5 * Math.PI / 2)); return <Person key={'b' + i} i={i + 3} x={120 + i * 210} y={1560 - j * 30} s={0.95} shirt={[P.royal, P.red, P.navy][i % 3]} wave={j} />; })}
          {[0, 1, 2, 3].map((i) => { const j = Math.abs(Math.sin((f + i * 4 + 2) / 7.5 * Math.PI / 2)); return <Person key={'f' + i} i={i} x={220 + i * 215} y={1880 - j * 40} s={1.2} shirt={[P.red, P.royal][i % 2]} wave={j} />; })}
          <Words text="REÚNA" start={60} size={250} y={380} color={P.navy} stagger={2} />
          <Words text="A GALERA!" start={66} size={190} y={620} color={P.red} shadow={P.navy} stagger={3} />
        </AbsoluteFill>}
        {f >= 120 && f < 180 && <AbsoluteFill style={{ background: P.navy, transform: `scale(${beatPunch})` }}>
          <Spray color="yellow" opacity={0.28} start={120} x={300} y={600} />
          <Spray color="red" opacity={0.22} start={124} rot={180} x={-300} y={-500} />
          <Ribbon d="M-200,1200 C200,900 700,1500 1300,1000" colors={[P.red, P.yellow, P.cream]} width={80} start={120} dur={26} />
          <SoundArcs x={440} y={1380} dir={-30} beats={[128, 143, 158]} />
          <MegaphoneHand x={440} y={1380} rot={-30} s={0.85} />
          <Words text="ESSA EDIÇÃO" start={120} size={170} y={430} color={P.cream} stagger={4} />
          <LongShadow text="PROMETE!" size={280} x={540} y={720} color={P.yellow} shade={P.red} len={28} start={128} />
        </AbsoluteFill>}
      </Shake>
      <Sequence from={180} durationInFrames={60} layout="none"><Countdown /></Sequence>
      <Wipe at={52} colors={[P.yellow, P.navy]} />
      <Wipe at={112} colors={[P.red, P.cream]} dir={-1} />
    </AbsoluteFill>
  );
};
/* ================= CENA 05 — FINALIZAÇÃO ================= */
export const V2S5: React.FC = () => {
  const f = useCurrentFrame();
  const pop = useSpring(0, 10, 110);
  const hit = useSpring(180, 8, 200);
  const ringP = ramp(f, 180, 214);
  const glow = 0.6 + 0.4 * Math.abs(Math.sin(f / 15 * Math.PI / 2));
  const scale = f >= 180 ? 1 + 0.06 * (1 - hit) : 1;
  return (
    <AbsoluteFill style={{ background: P.royal }}>
      <Shake hits={[0, 180]} amp={30}>
        <Cam y={interpolate(f, [0, 240], [-40, 0], { ...cl, easing: eOut })} z={interpolate(f, [0, 240], [1.08, 1])}>
          <Layer depth={0.3}><Stadium glow={glow} /></Layer>
          <Layer depth={0.6}><Confetti start={0} count={60} seed="fall" /><Spray color="yellow" opacity={0.3} start={2} y={-300} /></Layer>
          <Layer depth={1}>
            <AbsoluteFill style={{ transform: `scale(${scale})` }}>
              <Ribbon d="M-150,1100 C100,500 500,380 800,520 C1100,680 980,1100 700,1150 C480,1190 330,1040 380,880" colors={[P.yellow, P.red, P.cream]} width={74} start={2} dur={34} />
              <Ribbon d="M1250,1200 C900,1350 300,1250 200,900 C120,620 400,440 640,470" colors={[P.cream, P.yellow]} width={50} start={10} dur={32} />
              <Ribbon d="M-150,1100 C100,500 500,380 800,520 C1100,680 980,1100 700,1150 C480,1190 330,1040 380,880" colors={[P.red, P.yellow, P.navy]} width={74} start={176} dur={30} />
              <svg width={1080} height={1920} style={{ position: 'absolute' }}>
                <circle cx={540} cy={800} r={330 + ringP * 900} fill="none" stroke={P.yellow} strokeWidth={30 * (1 - ringP)} opacity={f >= 180 ? 1 - ringP : 0} />
              </svg>
              <Morph a={splat('fin', 0.3)} b={circle} p={ramp(f, 0, 12)} x={540} y={800} r={330 * ramp(f, 0, 12)} fill={P.yellow} />
              <div style={{ position: 'absolute', left: 540 - 300, top: 800 - 300, width: 600, height: 600, transform: `scale(${pop}) rotate(${(1 - pop) * 25}deg)` }}>
                <Img src={staticFile('logo/pafies_logo.png')} style={{ width: '100%', height: '100%' }} />
              </div>
              <Words text="ESTÃO PREPARADOS?" start={4} size={112} y={300} color={P.cream} shadow={P.navy} stagger={4} />
              <LongShadow text="PAFIES 2027" size={190} x={540} y={1250} color={P.yellow} shade={P.navy} len={24} start={60} />
              <Band x={540} y={1440} w={980} h={135} start={120} color={P.red} rot={-3} />
              <Words text="VAMOS FAZER HISTÓRIA!" start={124} size={104} y={1440} color={P.cream} rot={-3} stagger={4} />
              <Words text="10ª EDIÇÃO · UMA SÓ MISSÃO: FAZER A DIFERENÇA" start={150} size={46} y={1590} color={P.cream} stagger={2} tracking={0.04} />
            </AbsoluteFill>
          </Layer>
          <Layer depth={1.3}><Confetti start={180} count={110} seed="burst" burst={[540, 800]} /></Layer>
        </Cam>
      </Shake>
    </AbsoluteFill>
  );
};
