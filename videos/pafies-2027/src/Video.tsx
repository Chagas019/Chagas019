// PAFIES 2027 — composição principal (40 s, 1080x1920, 30 qps)
import React from 'react';
import { AbsoluteFill, Audio, Img, staticFile, useCurrentFrame } from 'remotion';
import { Alimentos3D } from './Alimentos3D';
import { Acabamento, BoltBurst, Bolt, Confete, Halftone, Poeira, Shock, SpeedLines, SunburstAzul } from './fx';
import { AMARELO, AZUL, AZUL_CLARO, BRANCO, FPS, H, HEART, HIT, PRETO, S, W, clamp, eIO, eInExpo, eOut, eOutExpo, hash, hitEnv, lerp, prog, shake, springy } from './lib';
import { Faixa, Logo, Slam, Stagger } from './tipo';

// ======================= CENA 01 — PERGUNTA =======================
const Cena1: React.FC<{ t: number }> = ({ t }) => {
  let pulse = 0; for (const hb of HEART) pulse += hitEnv(t, hb, 5) + hitEnv(t, hb + 0.17, 7) * 0.6;
  pulse = Math.min(1.4, pulse);
  const push = eInExpo(prog(t, 4.7, 6.0));
  // ECG: rola da direita para a esquerda, picos nos batimentos
  const pts: string[] = [];
  for (let x = 0; x <= W; x += 6) {
    const tt = t - (W - x) / 520; let y = 0;
    for (const hb of HEART) { const d = tt - hb; if (d > -0.05 && d < 0.25) y += -Math.exp(-((d - 0.02) ** 2) / 0.0004) * 230 + Math.exp(-((d - 0.06) ** 2) / 0.0006) * 90; const d2 = tt - hb - 0.17; y += -Math.exp(-(d2 ** 2) / 0.0006) * 70; }
    if (tt < 0) y = 0;
    pts.push(`${x},${1180 + y}`);
  }
  return (
    <AbsoluteFill style={{ background: PRETO }}>
      <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 52%, rgba(30,82,217,${0.15 + pulse * 0.55}) 0%, rgba(11,49,150,${pulse * 0.35}) 30%, transparent 62%)` }} />
      <Halftone color={AZUL_CLARO} size={24} opacity={0.12 + pulse * 0.25} radius={60} offset={t * 6} />
      <svg width={W} height={H} style={{ position: 'absolute', opacity: (1 - push) * clamp(t / 0.3) }}>
        <defs><filter id="gl"><feGaussianBlur stdDeviation="6" /></filter></defs>
        <polyline points={pts.join(' ')} fill="none" stroke={AZUL_CLARO} strokeWidth={12} filter="url(#gl)" opacity={0.9} />
        <polyline points={pts.join(' ')} fill="none" stroke={BRANCO} strokeWidth={4} />
      </svg>
      <AbsoluteFill style={{ transform: `scale(${1 + pulse * 0.025 + push * 7})`, filter: `blur(${push * 14}px)`, transformOrigin: '50% 47%' }}>
        <Slam t={t} t0={HIT.galera} text="EI, GALERA…" y={760} size={168} from={3} out={2.25} track={4} />
        <Slam t={t} t0={HIT.estao} text="ESTÃO" y={760} size={150} from={2.4} rotX={8} track={10} />
        <Slam t={t} t0={HIT.estao + 0.2} text="PREPARADOS?" y={930} size={166} color={AMARELO} from={3.2} rotX={-6} stroke={PRETO} />
        <BoltBurst t={t} t0={HIT.estao + 0.2} x={540} y={900} n={9} r0={380} r1={560} seed={4} life={1.4} />
      </AbsoluteFill>
      <SpeedLines p={prog(t, 4.9, 6.0)} />
    </AbsoluteFill>
  );
};

// ======================= CENA 02 — IDENTIDADE =======================
const Cena2: React.FC<{ t: number }> = ({ t }) => {
  const d0 = t - HIT.drop_logo;
  const up = eIO(prog(t, HIT.decima - 0.25, HIT.decima + 0.35));
  const ls = lerp(lerp(3.2, 1, eOutExpo(clamp(d0 / 0.5))), 0.84, up) * (1 + 0.05 * Math.exp(-d0 * 5) * Math.sin(d0 * 26));
  const ly = lerp(860, 500, up);
  const out = eInExpo(prog(t, S.s3 - 0.55, S.s3 + 0.05));
  const build = prog(t, HIT.drop_logo + 4 * 1.875, S.s3);
  return (
    <AbsoluteFill>
      <SunburstAzul t={t} speed={8 + build * 40} />
      <Halftone color={BRANCO} size={22} opacity={0.12} cy="40%" radius={75} offset={t * 10} />
      <Poeira t={t} n={30} color={AMARELO} o={0.6} seed={7} />
      <AbsoluteFill style={{ transform: `translateY(${-out * 1400}px) scale(${1 + build * 0.08})`, filter: `blur(${out * 20}px)` }}>
        <BoltBurst t={t} t0={HIT.drop_logo} x={540} y={860} n={12} r0={430} r1={640} seed={2} life={1.8} />
        <Shock t={t} t0={HIT.drop_logo} x={540} y={860} r={1100} color={BRANCO} w={26} />
        <Shock t={t} t0={HIT.drop_logo + 0.1} x={540} y={860} r={800} color={AMARELO} w={18} />
        <Logo t={t} size={700} x={540} y={ly} scale={ls} rotY={Math.sin(t * 0.9) * 14 * clamp(d0 / 1)} rotX={Math.sin(t * 0.7) * 6}
          shine={prog(t, HIT.drop_logo + 0.45, HIT.drop_logo + 1.2)} o={clamp(d0 / 0.06)} />
        <Slam t={t} t0={HIT.decima} text="10ª" y={1010} size={280} color={AMARELO} stroke={PRETO} from={3.4} rotX={-8} />
        <Slam t={t} t0={HIT.decima + 0.23} text="EDIÇÃO" y={1190} size={118} from={2} track={18} />
        <Stagger t={t} t0={HIT.gincana} text="GINCANA SOLIDÁRIA" y={1262} size={104} mode="flip" gap={0.03} />
        <Slam t={t} t0={HIT.ano} text="2027" y={1520} size={250} color={AMARELO} sticker from={3} rot={-3} />
        <BoltBurst t={t} t0={HIT.ano} x={540} y={1520} n={8} r0={300} r1={430} seed={9} life={1.2} />
      </AbsoluteFill>
      <Confete t={t} t0={HIT.drop_logo} n={80} cy={860} dur={4.5} />
      <SpeedLines p={prog(t, S.s3 - 0.5, S.s3 + 0.1)} color={AMARELO} />
    </AbsoluteFill>
  );
};

// ======================= CENA 03 — PROPÓSITO =======================
const Megafone: React.FC<{ t: number }> = ({ t }) => {
  const d = t - HIT.megafone; if (d < -0.1) return null;
  const inP = springy(d, 10, 6);
  const settle = eIO(prog(t, HIT.missao - 0.35, HIT.missao + 0.25));
  const x = lerp(lerp(-500, 540, inP), 210, settle), y = lerp(560, 215, settle), s = lerp(1, 0.4, settle);
  const beat = 1 + Math.max(0, Math.sin((t - HIT.megafone) * Math.PI * 2 * (128 / 60))) * 0.05;
  const shout = Math.sin(t * 60) * 6 * Math.exp(-d * 2);
  const o = 1 - prog(t, HIT.doacao - 0.4, HIT.doacao);
  return (
    <div style={{ position: 'absolute', left: x, top: y, opacity: o, transform: `translate(-50%,-50%) rotate(${-8 + shout * 0.4 + (1 - inP) * -30}deg) scale(${s * beat})` }}>
      <Img src={staticFile('marca/megafone_halftone.png')} style={{ width: 760, filter: 'drop-shadow(0 30px 40px rgba(0,0,0,.5))' }} />
      {[0, 1, 2].map(i => { const ph = ((t - HIT.megafone) * 2.2 + i / 3) % 1; return (
        <div key={i} style={{ position: 'absolute', left: 640 + ph * 260, top: 360 + (i - 1) * 170 * (0.6 + ph), opacity: (1 - ph) * (1 - settle * 0.6) }}>
          <Bolt x={0} y={0} rot={(i - 1) * 22} s={0.7 + ph * 0.6} />
        </div>); })}
    </div>
  );
};
const Cena3: React.FC<{ t: number }> = ({ t }) => {
  const inn = eOut(prog(t, S.s3 - 0.1, S.s3 + 0.5));
  const iris = prog(t, S.s5 - 0.35, S.s5 + 0.15);
  return (
    <AbsoluteFill style={{ background: `linear-gradient(180deg, #05070F 0%, #071541 60%, ${AZUL} 130%)` }}>
      <Halftone color={AZUL_CLARO} size={26} opacity={0.22} cy="85%" radius={70} offset={t * 8} />
      <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 58%, rgba(255,212,46,.18) 0%, transparent 45%)` }} />
      <AbsoluteFill style={{ opacity: inn, transform: `scale(${lerp(1.3, 1, inn)})` }}><Alimentos3D t={t} /></AbsoluteFill>
      <Poeira t={t} n={34} color={BRANCO} o={0.35} seed={11} />
      <Stagger t={t} t0={S.s3 + 0.9} text="MUITO MAIS QUE" y={175} size={96} mode="rise" out={20.5} />
      <Slam t={t} t0={HIT.competicao} text="UMA COMPETIÇÃO." y={380} size={128} color={AMARELO} stroke={PRETO} out={20.55} />
      <Megafone t={t} />
      <BoltBurst t={t} t0={HIT.megafone + 0.15} x={540} y={560} n={10} r0={360} r1={560} seed={13} life={1.3} />
      <Stagger t={t} t0={HIT.missao} text="UMA MISSÃO DE" y={175} size={96} mode="flip" out={HIT.doacao - 0.5} />
      <Slam t={t} t0={HIT.solidariedade} text="SOLIDARIEDADE." y={385} size={132} color={AMARELO} sticker out={HIT.doacao - 0.45} />
      <Shock t={t} t0={HIT.solidariedade} x={540} y={385} r={700} color={AMARELO} w={12} />
      {/* íris de transição para o final */}
      {iris > 0 && <div style={{ position: 'absolute', inset: 0, clipPath: `circle(${eInExpo(iris) * 120}% at 50% 45%)` }}><SunburstAzul t={t} speed={60} /></div>}
    </AbsoluteFill>
  );
};

// ======================= CENA 05 — FINALIZAÇÃO =======================
const Cena5: React.FC<{ t: number }> = ({ t }) => {
  const d0 = t - HIT.cena5;
  const ls = lerp(2.6, 1, eOutExpo(clamp(d0 / 0.5))) * (1 + 0.05 * Math.exp(-d0 * 5) * Math.sin(d0 * 26)) * (1 + hitEnv(t, HIT.final, 4) * 0.06 + hitEnv(t, HIT.historia, 6) * 0.04);
  const end = prog(t, 39.35, 40);
  return (
    <AbsoluteFill>
      <SunburstAzul t={t} speed={10} />
      <Halftone color={BRANCO} size={22} opacity={0.14} cy="46%" radius={70} offset={t * 10} />
      <Poeira t={t} n={36} color={AMARELO} o={0.55} seed={21} />
      <Shock t={t} t0={HIT.cena5} x={540} y={850} r={1100} color={BRANCO} w={24} />
      <BoltBurst t={t} t0={HIT.cena5} x={540} y={850} n={12} r0={420} r1={620} seed={17} life={1.8} />
      <Logo t={t} size={640} x={540} y={850} scale={ls} rotY={Math.sin(t * 0.8) * 12} rotX={Math.sin(t * 0.6) * 5} shine={prog(t, HIT.historia + 0.2, HIT.historia + 1.0)} o={clamp(d0 / 0.06)} />
      <Slam t={t} t0={HIT.preparados - 0.25} text="ESTÃO" y={235} size={96} track={14} from={2} />
      <Slam t={t} t0={HIT.preparados} text="PREPARADOS?" y={370} size={150} color={AMARELO} stroke={PRETO} from={3} />
      <Stagger t={t} t0={HIT.pafies2027} text="GINCANA SOLIDÁRIA" y={1215} size={88} mode="rise" gap={0.03} />
      <Slam t={t} t0={HIT.pafies2027 + 0.47} text="PAFIES 2027" y={1400} size={150} color={AMARELO} stroke={PRETO} from={2.6} />
      <Faixa t={t} t0={HIT.historia} text="VAMOS FAZER HISTÓRIA!" y={1640} size={84} rot={-4} />
      <BoltBurst t={t} t0={HIT.historia} x={540} y={1640} n={10} r0={380} r1={560} seed={23} life={1.5} />
      <Confete t={t} t0={HIT.historia} n={90} cy={1500} dur={4} seed={5} />
      <Confete t={t} t0={HIT.final} n={70} cy={850} dur={2.2} seed={8} />
      <Shock t={t} t0={HIT.final} x={540} y={850} r={900} color={AMARELO} w={16} />
      {end > 0 && <AbsoluteFill style={{ background: '#000', opacity: end }} />}
    </AbsoluteFill>
  );
};

// ======================= MASTER =======================
export const PAFIES2027: React.FC = () => {
  const f = useCurrentFrame(); const t = f / FPS;
  const sh = shake(t);
  const flash = Math.max(hitEnv(t, HIT.drop_logo, 6) * 0.95, hitEnv(t, HIT.cena5, 6) * 0.7, hitEnv(t, HIT.cena3, 8) * 0.5, hitEnv(t, HIT.galera, 10) * 0.3, hitEnv(t, HIT.estao + 0.2, 10) * 0.35, hitEnv(t, HIT.historia, 8) * 0.3);
  // wipe amarelo halftone na passagem 2 -> 3
  const wp = prog(t, S.s3 - 0.18, S.s3 + 0.32);
  return (
    <AbsoluteFill style={{ background: '#000', overflow: 'hidden' }}>
      <Audio src={staticFile('audio/pafies_mix.wav')} />
      <AbsoluteFill style={{ transform: `translate(${sh.x}px, ${sh.y}px) rotate(${sh.r}deg) scale(1.03)` }}>
        {t < S.s2 && <Cena1 t={t} />}
        {t >= S.s2 && t < S.s3 + 0.05 && <Cena2 t={t} />}
        {t >= S.s3 - 0.05 && t < S.s5 + 0.15 && <Cena3 t={t} />}
        {t >= S.s5 && <Cena5 t={t} />}
      </AbsoluteFill>
      {wp > 0 && wp < 1 && (
        <div style={{ position: 'absolute', left: -300, top: lerp(H + 200, -H - 900, eIO(wp)), width: W + 600, height: 900, background: AMARELO, transform: 'rotate(-12deg)', boxShadow: `0 0 0 20px ${PRETO}` }}>
          <Halftone color={PRETO} size={24} opacity={0.25} radius={100} />
        </div>
      )}
      {flash > 0.01 && <AbsoluteFill style={{ background: BRANCO, opacity: flash }} />}
      <Acabamento t={t} vignette={t < S.s2 ? 0.7 : 0.45} />
    </AbsoluteFill>
  );
};
