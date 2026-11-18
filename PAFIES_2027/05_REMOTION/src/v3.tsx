// PAFIES 2027 v3 — ilustrações editoriais geradas (Floot) + motion design 2.5D, logo, fitas, tipografia e trilha originais.
import React from 'react';
import { AbsoluteFill, Audio, Img, interpolate, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { HEARTBEATS, SCENES } from './theme';
import { Band, circle, cl, Confetti, eIn, eInOut, eOut, Floaters, heart, LongShadow, Morph, P, PaperGrain, ramp, Ribbon, Shake, splat, Spray, Wipe, Words } from './v2/kit';
import { Countdown } from './v2/scenes';

/* placa de arte com câmera 2.5D (push/drift/zoom em ponto focal) */
const Art: React.FC<{ src: string; fx?: number; fy?: number; z: [number, number]; dur: number; drift?: [number, number]; flip?: boolean; extra?: string }> =
  ({ src, fx = 540, fy = 960, z, dur, drift = [0, 0], flip, extra = '' }) => {
    const f = useCurrentFrame();
    const s = interpolate(f, [0, dur], z, { ...cl, easing: eInOut });
    const dx = interpolate(f, [0, dur], [-drift[0], drift[0]], cl), dy = interpolate(f, [0, dur], [-drift[1], drift[1]], cl);
    return <Img src={staticFile(`arte/${src}.png`)} style={{ position: 'absolute', width: 1080, height: 1920, transformOrigin: `${fx}px ${fy}px`, transform: `translate(${dx}px,${dy}px) scale(${s}) ${flip ? 'scaleX(-1)' : ''} ${extra}` }} />;
  };
const LogoPop: React.FC<{ x: number; y: number; d: number; start: number }> = ({ x, y, d, start }) => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig();
  const s = spring({ frame: f - start, fps, config: { damping: 10, stiffness: 120 } });
  return <div style={{ position: 'absolute', left: x - d / 2, top: y - d / 2, width: d, height: d, transform: `scale(${s}) rotate(${(1 - s) * -30}deg)`, filter: 'drop-shadow(10px 14px 0 rgba(11,16,51,0.85))' }}>
    <Img src={staticFile('logo/pafies_logo.png')} style={{ width: '100%', height: '100%' }} />
  </div>;
};
const Arcs: React.FC<{ x: number; y: number; dir: number; beats: number[] }> = ({ x, y, dir, beats }) => {
  const f = useCurrentFrame();
  return <svg width={1080} height={1920} style={{ position: 'absolute' }}>{beats.flatMap((b) => [0, 4, 8].map((o) => {
    const d = f - b - o; if (d < 0 || d > 22) return null;
    const r = 80 + d * 18, a0 = ((dir - 35) * Math.PI) / 180, a1 = ((dir + 35) * Math.PI) / 180;
    return <path key={b + '-' + o} d={`M${x + r * Math.cos(a0)},${y + r * Math.sin(a0)} A${r},${r} 0 0 1 ${x + r * Math.cos(a1)},${y + r * Math.sin(a1)}`} stroke={P.yellow} strokeWidth={16 * (1 - d / 22) + 3} fill="none" strokeLinecap="round" opacity={1 - d / 24} />;
  }))}</svg>;
};

/* CENA 1 — ABERTURA */
const S1: React.FC = () => {
  const f = useCurrentFrame();
  const mx = 600, my = 860;
  let pulse = 0; for (const hb of HEARTBEATS) { const d = f - hb; if (d >= 0) pulse = Math.max(pulse, Math.exp(-d / 7)); }
  const reveal = interpolate(f, [0, 40], [0.15, 1], cl);
  const iris = ramp(f, 150, 179, eIn);
  const tOut = ramp(f, 146, 158, eIn);
  return <AbsoluteFill style={{ background: P.navy }}>
    <AbsoluteFill style={{ opacity: reveal, filter: `brightness(${0.55 + 0.45 * reveal + pulse * 0.25})` }}>
      <Art src="s1_megafone" fx={mx} fy={my} z={[1.18, 1.0]} dur={150} drift={[0, 12]} />
    </AbsoluteFill>
    <Arcs x={mx} y={my} dir={-25} beats={[38, 62, 98, 112, 126]} />
    <AbsoluteFill style={{ opacity: 1 - tOut, transform: `translateY(${-tOut * 80}px)` }}>
      <Words text="EI, GALERA…" start={33} size={170} y={330} color={P.cream} stagger={6} exit={86} shadow={P.royal} />
      <Words text="ESTÃO" start={93} size={250} y={260} color={P.yellow} shadow={P.red} />
      <Band x={540} y={500} w={1000} h={190} start={99} color={P.red} rot={-3} />
      <Words text="PREPARADOS?" start={101} size={175} y={500} color={P.cream} rot={-3} />
    </AbsoluteFill>
    {iris > 0 && <Morph a={splat('iris', 0.25)} b={circle} p={iris} x={mx} y={my} r={iris * 2300} fill={P.red} />}
  </AbsoluteFill>;
};

/* CENA 2 — REVELAÇÃO */
const S2: React.FC = () => {
  const f = useCurrentFrame();
  const cx = 532, cy = 928;
  return <AbsoluteFill style={{ background: P.red }}>
    <Shake hits={[0, 96]}>
      <Art src="s2_explosao" fx={cx} fy={cy} z={[1.25, 1.05]} dur={240} extra={`rotate(${interpolate(f, [0, 240], [-4, 2])}deg)`} />
      <Ribbon d="M-150,1250 C200,1350 300,700 532,640 C800,560 1050,820 900,1120 C780,1340 440,1300 360,1100" colors={[P.yellow, P.cream, P.royal]} width={70} start={4} dur={32} />
      <Ribbon d="M1250,1500 C900,1600 300,1500 150,1200" colors={[P.navy, P.yellow]} width={50} start={92} dur={26} />
      <Floaters seed="v3s2" colors={[P.yellow, P.cream, P.navy]} count={12} />
      <LogoPop x={cx} y={cy} d={500} start={3} />
      <LongShadow text="10ª EDIÇÃO" size={200} x={540} y={330} color={P.yellow} shade={P.navy} len={26} start={96} />
      <Band x={540} y={1500} w={960} h={130} start={138} color={P.navy} rot={-3} />
      <Words text="GINCANA SOLIDÁRIA" start={142} size={96} y={1500} color={P.cream} rot={-3} />
      <Words text="PAFIES 2027" start={164} size={150} y={1660} color={P.yellow} shadow={P.navy} />
    </Shake>
  </AbsoluteFill>;
};

/* CENA 3 — SOLIDARIEDADE */
const WORDS = ['DESAFIOS', 'UNIÃO', 'CRIATIVIDADE', 'DIVERSÃO', 'SOLIDARIEDADE'];
const S3: React.FC = () => {
  const f = useCurrentFrame();
  const hp = ramp(f, 200, 226, eOut);
  const lift = interpolate(f, [0, 300], [40, -20], cl);
  return <AbsoluteFill style={{ background: P.cream }}>
    <Shake hits={[0, 206]}>
      <Art src="s3_doacao" fx={540} fy={900} z={[1.12, 1.0]} dur={300} drift={[0, 0]} extra={`translateY(${lift}px)`} />
      <Floaters seed="v3s3" colors={[P.red, P.royal, P.yellow, P.sky]} count={12} area={[0, 500, 1080, 1100]} />
      {hp > 0 && <Spray color="yellow" opacity={0.3} start={206} scale={0.8} y={-200} />}
      {hp > 0 && <Morph a={circle} b={heart} p={hp} x={540} y={830} r={340 * ramp(f, 198, 214)} fill={P.red} stroke={P.navy} sw={10} rot={Math.sin(f / 12) * 3} />}
      {WORDS.map((w, i) => { const st = 18 + i * 22; if (f < st - 1 || f > st + 24) return null;
        return <Words key={w} text={w} start={st} size={i === 4 ? 150 : 170} y={300} color={i % 2 ? P.red : P.royal} exit={st + 12} dur={10} />; })}
      <Words text="MUITO MAIS QUE" start={130} size={104} y={230} color={P.navy} exit={196} stagger={3} />
      <Words text="UMA COMPETIÇÃO." start={138} size={136} y={370} color={P.royal} exit={198} stagger={3} />
      <Words text="UMA MISSÃO DE" start={212} size={110} y={230} color={P.navy} stagger={3} />
      <Band x={540} y={380} w={1010} h={170} start={220} color={P.red} rot={-3} />
      <Words text="SOLIDARIEDADE." start={224} size={150} y={380} color={P.cream} rot={-3} />
    </Shake>
  </AbsoluteFill>;
};

/* CENA 4 — EXPECTATIVA */
const S4: React.FC = () => {
  const f = useCurrentFrame();
  const punch = 1 + 0.03 * Math.exp(-(f % 15) / 4);
  return <AbsoluteFill style={{ background: P.navy }}>
    <Shake hits={[0, 60, 120, 180]}>
      {f < 60 && <AbsoluteFill style={{ transform: `scale(${punch})` }}>
        <Art src="s4_corrida_v2" fx={540} fy={1500} z={[1.0, 1.15]} dur={60} />
        <Ribbon d="M540,1250 C300,1150 150,1350 -200,1200" colors={[P.yellow, P.red, P.cream]} width={60} start={0} dur={20} tail={0.4} />
        <Ribbon d="M560,1350 C800,1250 950,1450 1300,1300" colors={[P.cream, P.yellow]} width={46} start={10} dur={20} tail={0.4} />
        <Words text="PREPARE" start={0} size={270} y={330} color={P.yellow} shadow={P.navy} stagger={2} />
        <Words text="SUA EQUIPE!" start={6} size={170} y={580} color={P.cream} shadow={P.navy} stagger={3} />
      </AbsoluteFill>}
      {f >= 60 && f < 120 && <AbsoluteFill style={{ transform: `scale(${punch})` }}>
        <Sequence from={60} layout="none"><Art src="s4_galera_v2" fx={540} fy={1500} z={[1.08, 1.0]} dur={60} /></Sequence>
        <Confetti start={60} count={40} seed="gal" />
        <Words text="REÚNA" start={60} size={250} y={360} color={P.navy} stagger={2} />
        <Words text="A GALERA!" start={66} size={190} y={600} color={P.red} shadow={P.navy} stagger={3} />
      </AbsoluteFill>}
      {f >= 120 && f < 180 && <AbsoluteFill style={{ transform: `scale(${punch})` }}>
        <Sequence from={120} layout="none"><Art src="s1_megafone" fx={480} fy={860} z={[1.35, 1.2]} dur={60} flip extra="translateY(260px)" /></Sequence>
        <Spray color="red" opacity={0.25} start={124} rot={180} x={-300} y={-500} />
        <Words text="ESSA EDIÇÃO" start={120} size={170} y={300} color={P.cream} stagger={4} shadow={P.royal} />
        <LongShadow text="PROMETE!" size={280} x={540} y={560} color={P.yellow} shade={P.red} len={28} start={128} />
      </AbsoluteFill>}
    </Shake>
    <Sequence from={180} durationInFrames={60} layout="none"><Countdown /></Sequence>
    <Wipe at={52} colors={[P.yellow, P.navy]} />
    <Wipe at={112} colors={[P.red, P.cream]} dir={-1} />
  </AbsoluteFill>;
};

/* CENA 5 — FINAL */
const S5: React.FC = () => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig();
  const hit = spring({ frame: f - 180, fps, config: { damping: 8, stiffness: 200 } });
  const sc = f >= 180 ? 1 + 0.06 * (1 - hit) : 1;
  const ringP = ramp(f, 180, 214);
  const cx = 545, cy = 910;
  return <AbsoluteFill style={{ background: P.royal }}>
    <Shake hits={[0, 180]} amp={30}>
      <AbsoluteFill style={{ transform: `scale(${sc})` }}>
        <Art src="s5_estadio" fx={540} fy={0} z={[1.32, 1.25]} dur={240} extra="translateY(-462px)" />
        <Confetti start={0} count={50} seed="v3fall" />
        <Ribbon d="M-150,900 C100,500 500,560 800,700 C1100,860 980,1300 700,1330 C480,1360 330,1220 380,1050" colors={[P.yellow, P.red, P.cream]} width={64} start={2} dur={34} />
        <Ribbon d="M-150,900 C100,500 500,560 800,700 C1100,860 980,1300 700,1330 C480,1360 330,1220 380,1050" colors={[P.red, P.yellow, P.navy]} width={64} start={176} dur={30} />
        <svg width={1080} height={1920} style={{ position: 'absolute' }}><circle cx={cx} cy={cy} r={320 + ringP * 900} fill="none" stroke={P.yellow} strokeWidth={30 * (1 - ringP)} opacity={f >= 180 ? 1 - ringP : 0} /></svg>
        <LogoPop x={cx} y={cy} d={700} start={0} />
        <Band x={540} y={300} w={1000} h={140} start={2} color={P.navy} rot={-2} />
        <Words text="ESTÃO PREPARADOS?" start={4} size={108} y={300} color={P.yellow} rot={-2} stagger={4} />
        <LongShadow text="PAFIES 2027" size={170} x={540} y={1440} color={P.yellow} shade={P.navy} len={22} start={60} />
        <Band x={540} y={1600} w={980} h={125} start={120} color={P.red} rot={-3} />
        <Words text="VAMOS FAZER HISTÓRIA!" start={124} size={96} y={1600} color={P.cream} rot={-3} stagger={4} />
        <Words text="10ª EDIÇÃO · UMA SÓ MISSÃO: FAZER A DIFERENÇA" start={150} size={40} y={1730} color={P.cream} stagger={2} tracking={0.04} />
      </AbsoluteFill>
      <Confetti start={180} count={110} seed="v3burst" burst={[cx, cy]} />
    </Shake>
  </AbsoluteFill>;
};

const LIST = [{ C: S1, ...SCENES.s1 }, { C: S2, ...SCENES.s2 }, { C: S3, ...SCENES.s3 }, { C: S4, ...SCENES.s4 }, { C: S5, ...SCENES.s5 }];
export const PAFIES2027V3: React.FC<{ withAudio: boolean }> = ({ withAudio }) => (
  <AbsoluteFill style={{ background: P.navy }}>
    {LIST.map(({ C, from, dur }, i) => <Sequence key={i} from={from} durationInFrames={dur} name={`V3_CENA_0${i + 1}`}><C /></Sequence>)}
    <Wipe at={SCENES.s3.from - 8} dur={16} colors={[P.yellow, P.navy, P.cream]} />
    <Wipe at={SCENES.s4.from - 8} dur={16} colors={[P.red, P.yellow, P.royal]} dir={-1} />
    <PaperGrain opacity={0.08} />
    {withAudio && <Audio src={staticFile('audio/PAFIES2027_mix.wav')} />}
  </AbsoluteFill>
);
export const TeaserV3: React.FC = () => (
  <AbsoluteFill><Sequence durationInFrames={240}><S4 /></Sequence><Sequence from={240} durationInFrames={240}><S5 /></Sequence><PaperGrain opacity={0.08} />
    <Audio src={staticFile('audio/PAFIES2027_mix.wav')} startFrom={SCENES.s4.from} /></AbsoluteFill>
);
