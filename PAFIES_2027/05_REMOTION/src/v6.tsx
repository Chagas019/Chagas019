// PAFIES 2027 v6 — motion 3D estilo "product motion" (Blender) + tipografia limpa (sem tarjas) + transições com zoom/desfoque.
import React from 'react';
import { AbsoluteFill, Audio, Img, interpolate, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { SCENES } from './theme';
import { cl, eIn, eOut, ramp, Words } from './v2/kit';

const FD = "'Big Shoulders Display', Anton, sans-serif";
const NAVY = '#0B1F4D', WHITE = '#FFFFFF', YELLOW = '#FFC300', RED = '#E63946';

const Plate: React.FC<{ id: string; dur: number }> = ({ id, dur }) => {
  const f = useCurrentFrame();
  const i = Math.min(dur - 1, Math.max(0, f)) + 1;
  // transição: entra com zoom/desfoque, sai com zoom/desfoque (whip suave)
  const tin = 1 - ramp(f, 0, 8, eOut), tout = ramp(f, dur - 6, dur, eIn);
  const s = 1 + tin * 0.12 + tout * 0.14, b = tin * 14 + tout * 16;
  return <Img src={staticFile(`r6/${id}/${id}_${String(i).padStart(4, '0')}.png`)} style={{ width: 1080, height: 1920, position: 'absolute', transform: `scale(${s})`, filter: b > 0.3 ? `blur(${b}px)` : undefined }} />;
};
const Kicker: React.FC<{ text: string; start: number; y: number; color: string; exit?: number }> = ({ text, start, y, color, exit }) => {
  const f = useCurrentFrame();
  const p = ramp(f, start, start + 16), q = exit !== undefined ? ramp(f, exit, exit + 10, eIn) : 0;
  if (p <= 0) return null;
  return <div style={{ position: 'absolute', top: y, width: '100%', textAlign: 'center', fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 34, letterSpacing: `${0.5 - 0.2 * p}em`, color, opacity: p * (1 - q), transform: `translateY(${(1 - p) * 20 - q * 20}px)` }}>{text}</div>;
};
const Grain: React.FC = () => {
  const f = useCurrentFrame();
  return <AbsoluteFill style={{ backgroundImage: `url(${staticFile('textures/paper.png')})`, backgroundPosition: `${(f * 37) % 512}px ${(f * 91) % 512}px`, mixBlendMode: 'overlay', opacity: 0.05 }} />;
};

const S1: React.FC = () => <AbsoluteFill>
  <Plate id="S1" dur={180} />
  <Kicker text="GINCANA SOLIDÁRIA PAFIES" start={20} y={170} color="rgba(255,255,255,0.7)" exit={150} />
  <Words text="EI, GALERA…" start={33} size={150} y={330} color={WHITE} stagger={6} exit={86} font={FD} />
  <Words text="ESTÃO" start={93} size={200} y={300} color={YELLOW} font={FD} exit={160} />
  <Words text="PREPARADOS?" start={101} size={170} y={480} color={WHITE} font={FD} exit={162} />
</AbsoluteFill>;

const S2: React.FC = () => <AbsoluteFill>
  <Plate id="S2" dur={240} />
  <Kicker text="A CONTAGEM REGRESSIVA COMEÇOU" start={10} y={150} color={NAVY} exit={226} />
  <Words text="10ª EDIÇÃO" start={100} size={120} y={1520} color={NAVY} font={FD} exit={228} />
  <Words text="GINCANA SOLIDÁRIA" start={140} size={92} y={1650} color={NAVY} font={FD} stagger={3} exit={228} />
  <Words text="PAFIES 2027" start={160} size={92} y={1760} color={RED} font={FD} exit={228} />
</AbsoluteFill>;

const KW = ['DESAFIOS', 'UNIÃO', 'CRIATIVIDADE', 'DIVERSÃO', 'SOLIDARIEDADE'];
const S3: React.FC = () => {
  const f = useCurrentFrame();
  return <AbsoluteFill>
    <Plate id="S3" dur={300} />
    {KW.map((w, i) => { const st = 18 + i * 22; if (f < st - 1 || f > st + 24) return null; return <Words key={w} text={w} start={st} size={150} y={260} color={i % 2 ? RED : NAVY} exit={st + 12} dur={10} font={FD} />; })}
    <Words text="MUITO MAIS QUE" start={130} size={96} y={220} color={NAVY} exit={196} stagger={3} font={FD} />
    <Words text="UMA COMPETIÇÃO." start={138} size={130} y={340} color={NAVY} exit={198} stagger={3} font={FD} />
    <Words text="UMA MISSÃO DE" start={212} size={96} y={220} color={NAVY} stagger={3} font={FD} exit={290} />
    <Words text="SOLIDARIEDADE." start={222} size={140} y={345} color={RED} font={FD} exit={290} />
  </AbsoluteFill>;
};

const S4: React.FC = () => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig();
  const cd = f >= 180;
  const n = f < 195 ? '3' : f < 210 ? '2' : '1';
  const st = f < 195 ? 180 : f < 210 ? 195 : 210;
  const sp = spring({ frame: f - st, fps, config: { damping: 9, stiffness: 220, mass: 0.5 } });
  const blur = cd ? interpolate(f, [180, 186], [0, 18], cl) : 0;
  return <AbsoluteFill>
    <AbsoluteFill style={{ filter: blur ? `blur(${blur}px)` : undefined }}><Plate id="S4" dur={240} /></AbsoluteFill>
    <Words text="PREPARE SUA EQUIPE!" start={0} size={120} y={250} color={NAVY} exit={52} stagger={3} font={FD} />
    <Words text="REÚNA A GALERA!" start={60} size={130} y={250} color={RED} exit={112} stagger={3} font={FD} />
    <Words text="ESSA EDIÇÃO" start={120} size={110} y={210} color={NAVY} exit={172} font={FD} />
    <Words text="PROMETE!" start={126} size={170} y={350} color={RED} exit={172} font={FD} />
    {cd && <AbsoluteFill style={{ background: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ fontFamily: FD, fontWeight: 900, fontSize: 760, color: NAVY, lineHeight: 1, transform: `scale(${interpolate(sp, [0, 1], [1.8, 1])})`, opacity: Math.min(1, sp * 2), filter: `blur(${(1 - Math.min(1, sp)) * 12}px)` }}>{n}</div>
    </AbsoluteFill>}
    {cd && <Words text="A CONTAGEM REGRESSIVA COMEÇOU!" start={182} size={66} y={300} color={NAVY} stagger={2} font={FD} />}
  </AbsoluteFill>;
};

const S5: React.FC = () => <AbsoluteFill>
  <Plate id="S5" dur={240} />
  <Words text="ESTÃO PREPARADOS?" start={6} size={110} y={230} color={NAVY} stagger={4} font={FD} />
  <Words text="PAFIES 2027" start={60} size={150} y={1460} color={NAVY} font={FD} />
  <Words text="VAMOS FAZER HISTÓRIA!" start={120} size={96} y={1590} color={RED} stagger={4} font={FD} />
  <Kicker text="10ª EDIÇÃO · UMA SÓ MISSÃO: FAZER A DIFERENÇA" start={150} y={1660} color={NAVY} />
</AbsoluteFill>;

const LIST = [{ C: S1, ...SCENES.s1 }, { C: S2, ...SCENES.s2 }, { C: S3, ...SCENES.s3 }, { C: S4, ...SCENES.s4 }, { C: S5, ...SCENES.s5 }];
export const PAFIES2027V6: React.FC<{ withAudio: boolean }> = ({ withAudio }) => (
  <AbsoluteFill style={{ background: '#000' }}>
    {LIST.map(({ C, from, dur }, i) => <Sequence key={i} from={from} durationInFrames={dur} name={`V6_CENA_0${i + 1}`}><C /></Sequence>)}
    <Grain />
    {withAudio && <Audio src={staticFile('audio/PAFIES2027_mix.wav')} />}
  </AbsoluteFill>
);
export const TeaserV6: React.FC = () => (
  <AbsoluteFill><Sequence durationInFrames={240}><S4 /></Sequence><Sequence from={240} durationInFrames={240}><S5 /></Sequence><Grain />
    <Audio src={staticFile('audio/PAFIES2027_mix.wav')} startFrom={SCENES.s4.from} /></AbsoluteFill>
);
