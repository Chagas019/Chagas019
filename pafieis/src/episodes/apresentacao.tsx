// EPISÓDIO 1 — "Pafieis Apresenta": apresentação do mascote.
// O personagem é a imagem ORIGINAL animada (cabeça, piscadas, boca, respiração, câmera).
// Para um novo episódio: copie este arquivo, troque textos, CUES e áudio.
import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from 'remotion';
import { PhotoPuppet } from '../character/PhotoPuppet';
import { Performance } from '../character/rig';
import { Background, BarWipe, Cam, Flash, Sparkles, Title3D, TopicCard, camTransform } from '../components/Graphics';
import { EndCard } from '../components/EndCard';
import { E, Key, bell, clamp, prog, sampleKeys } from '../lib/anim';
import lipData from './apresentacao.lipsync.json';

// ---------------- roteiro ----------------
export const ROTEIRO = {
  abertura: 'PAFIEIS NA ÁREA!',
  fala1: 'E aí, pessoal! Eu sou o Pafieis, o mascote oficial da PAFIES! E agora vou trazer todas as novidades, informações e surpresas pra vocês!',
  fala2: 'Novidades, informações, desafios, eventos... tudo aqui comigo!',
  encerramento: 'Fiquem ligados, porque tem muita coisa vindo por aí! Eu sou o Pafieis, e a gente se encontra na próxima!',
  topicos: ['NOVIDADES', 'INFORMAÇÕES', 'DESAFIOS', 'EVENTOS'],
};

export const HAS_VOICE = lipData.o.length > 0;
export const VOICE = 'audio/voz-apresentacao.mp3';
export const VOICE_AT = 1.6; // segundo do vídeo em que a voz começa

// Tempos de cada fala, em segundos A PARTIR DO INÍCIO DA VOZ.
// Ajuste com os "trechos de fala" impressos por tools/lipsync.py.
export const CUES = {
  area: 0.0, eai: 2.0, euSou: 3.0, mascote: 4.0, trazer: 6.0, surpresas: 9.4,
  lista: [10.8, 11.6, 12.6, 13.4], tudo: 14.3, ligados: 16.3, euSou2: 19.6, proxima: 21.0, fim: 22.5,
};

const V = (s: number) => VOICE_AT + s; // tempo do vídeo
export const DURATION = V(CUES.fim) + 3.0;

// cards de tópicos na área livre acima da cabeça
const CARD_X = 540;
const CARD_Y = [250, 390, 530, 670];

// ---------------- direção do personagem (somente o que a imagem permite) ----------------
function direcao(): Performance {
  const p = new Performance({ x: 540, y: 1750, mouthWide: 0.3 });
  const c = CUES;
  // entrada: olha para um lado, para o outro, e encara a câmera
  p.many(0.9, { headTurn: 0, headTilt: 0 }).many(1.15, { headTurn: -1, headTilt: -4 }, E.out).many(1.4, { headTurn: 1, headTilt: 3 }, E.out);
  p.many(1.6, { headTurn: 0, headTilt: 0 }, E.back);
  // "PAFIEIS NA ÁREA!" — impulso
  p.set('squash', V(c.area) - 0.05, 0.96, E.out).set('squash', V(c.area) + 0.18, 1.03, E.out).set('squash', V(c.area) + 0.6, 1, E.elastic);
  p.set('headNod', V(c.area) + 0.05, -10, E.out).set('headNod', V(c.area) + 0.4, 0, E.back);
  // "E aí, pessoal!" — inclina a cabeça, simpático
  p.set('headTilt', V(c.eai) + 0.15, -6, E.back).set('headTilt', V(c.euSou) - 0.1, 0);
  // "Eu sou o Pafieis" — aceno de cabeça
  p.set('headNod', V(c.euSou) + 0.1, 8, E.out).set('headNod', V(c.euSou) + 0.35, 0, E.out);
  // "mascote oficial da PAFIES" — orgulho: cabeça levemente para cima
  p.set('headNod', V(c.mascote) + 0.2, -6, E.out).set('headTilt', V(c.mascote) + 0.2, 4, E.out);
  p.set('headNod', V(c.trazer) - 0.1, 0).set('headTilt', V(c.trazer) - 0.1, 0);
  // "...novidades, informações e surpresas" — balança no ritmo
  p.set('lean', V(c.trazer) + 0.8, 3).set('lean', V(c.trazer) + 1.8, -3).set('lean', V(c.trazer) + 2.8, 2).set('lean', V(c.surpresas), 0);
  p.set('squash', V(c.surpresas) - 0.05, 0.97, E.out).set('squash', V(c.surpresas) + 0.15, 1.025, E.out).set('squash', V(c.surpresas) + 0.5, 1, E.elastic);
  // tópicos: olha para cima, para os cards, a cada item
  c.lista.forEach((tc, i) => {
    p.set('headNod', V(tc) + 0.05, -9 - i, E.out).set('headTilt', V(tc) + 0.05, i % 2 ? 4 : -4, E.out);
    p.set('headTurn', V(tc) + 0.05, i % 2 ? 0.6 : -0.6, E.out);
  });
  // "tudo aqui comigo!" — volta para a câmera com aceno firme
  p.many(V(c.tudo) + 0.1, { headNod: 0, headTilt: 0, headTurn: 0 }, E.back);
  p.set('headNod', V(c.tudo) + 0.45, 9, E.out).set('headNod', V(c.tudo) + 0.75, 0, E.out);
  // "Fiquem ligados" — inclina para frente
  p.set('lean', V(c.ligados) + 0.2, 2.5).set('headTilt', V(c.ligados) + 0.2, -5, E.back);
  p.set('lean', V(c.euSou2) - 0.2, 0).set('headTilt', V(c.euSou2) - 0.2, 0);
  p.set('headNod', V(c.euSou2) + 0.1, 8, E.out).set('headNod', V(c.euSou2) + 0.4, 0, E.out);
  p.set('headTilt', V(c.proxima) + 0.2, 6, E.back);
  // piscadinha final
  p.set('blinkR', V(c.fim) - 0.05, 0).set('blinkR', V(c.fim) + 0.05, 1, E.out).set('blinkR', V(c.fim) + 0.45, 1).set('blinkR', V(c.fim) + 0.6, 0);
  return p;
}

// ---------------- câmera ----------------
type CamKeys = Record<keyof Cam, Key[]>;
function camera(): CamKeys {
  const c = CUES;
  const k: CamKeys = { x: [], y: [], zoom: [], rot: [] };
  const add = (t: number, v: Partial<Cam>, e = E.inOut) => (Object.keys(v) as (keyof Cam)[]).forEach((pp) => k[pp].push({ t, v: v[pp]!, e }));
  add(0, { x: 540, y: 1150, zoom: 1.35, rot: -2 });
  add(1.3, { x: 540, y: 960, zoom: 1.0, rot: 0 }, E.out);
  add(V(c.eai) - 0.3, { y: 960, zoom: 1.0 });
  add(V(c.eai) + 0.3, { y: 1120, zoom: 1.3 }, E.out); // aproxima no rosto
  add(V(c.trazer), { y: 1120, zoom: 1.3 });
  add(V(c.trazer) + 3, { y: 1080, zoom: 1.2, rot: 1 }, E.inOut); // leve dolly
  add(V(c.lista[0]) - 0.9, { y: 1080, zoom: 1.2, rot: 0 });
  add(V(c.lista[0]) - 0.3, { y: 960, zoom: 1.0 }, E.inOut); // abre para os cards
  add(V(c.ligados) - 0.6, { y: 960, zoom: 1.0 });
  add(V(c.ligados) + 0.1, { y: 1110, zoom: 1.28 }, E.out);
  add(V(c.fim) + 0.4, { y: 1110, zoom: 1.28 });
  add(V(c.fim) + 1.1, { y: 960, zoom: 1.0 }, E.inOut);
  return k;
}

// ---------------- composição ----------------
const PERF = direcao();
const CAM = camera();
const camAt = (t: number): Cam => ({
  x: sampleKeys(CAM.x, t, 540), y: sampleKeys(CAM.y, t, 960), zoom: sampleKeys(CAM.zoom, t, 1), rot: sampleKeys(CAM.rot, t, 0),
});
const lipAt = (t: number) => {
  if (!HAS_VOICE) return null;
  const i = Math.round((t - VOICE_AT) * lipData.fps);
  if (i < 0 || i >= lipData.o.length) return null;
  return { o: lipData.o[i], w: lipData.w[i], r: lipData.r[i] };
};

export const SFX: { at: number; src: string; vol?: number }[] = [
  { at: 0.05, src: 'sfx-whoosh.wav', vol: 0.6 },
  { at: 0.55, src: 'sfx-impact.wav', vol: 0.5 },
  { at: V(CUES.area) + 0.15, src: 'sfx-impact.wav', vol: 0.65 },
  { at: V(CUES.eai) - 0.3, src: 'sfx-whoosh-down.wav', vol: 0.4 },
  { at: V(CUES.mascote) + 0.3, src: 'sfx-sparkle.wav', vol: 0.5 },
  { at: V(CUES.surpresas), src: 'sfx-sparkle.wav', vol: 0.55 },
  { at: V(CUES.lista[0]) - 0.95, src: 'sfx-whoosh.wav', vol: 0.55 },
  ...CUES.lista.map((t) => ({ at: V(t), src: 'sfx-pop.wav', vol: 0.6 })),
  { at: V(CUES.tudo) + 0.1, src: 'sfx-sparkle.wav', vol: 0.55 },
  { at: V(CUES.ligados) - 0.7, src: 'sfx-whoosh-down.wav', vol: 0.5 },
  { at: V(CUES.fim) + 0.5, src: 'sfx-whoosh.wav', vol: 0.5 },
  { at: V(CUES.fim) + 0.95, src: 'sfx-impact.wav', vol: 0.45 },
  { at: V(CUES.fim) + 1.05, src: 'sfx-sparkle.wav', vol: 0.5 },
];

export const Apresentacao: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const c = CUES;
  const lip = lipAt(t);
  const pose = PERF.sample(t, lip);
  let cam = camAt(t);
  const shake = bell(t, V(c.area) + 0.22, 0.1) * 12 + bell(t, 0.6, 0.08) * 8;
  cam = { ...cam, x: cam.x + Math.sin(t * 90) * shake, y: cam.y + Math.cos(t * 77) * shake };
  const energy = lip ? lip.o : 0;
  const activeCard = (i: number) => (t >= V(c.lista[i]) && t < (i < 3 ? V(c.lista[i + 1]) : V(c.tudo)) ? 1 : 0) + bell(t, V(c.tudo) + 0.3, 0.25) * 0.8;
  const flash = Math.max(0.5 * bell(t, 0.55, 0.07), 0.55 * bell(t, V(c.area) + 0.18, 0.06), 0.45 * bell(t, V(c.fim) + 1.0, 0.07));
  // revelação inicial em círculo
  const reveal = E.out(prog(t, 0.15, 0.9));
  const endDim = E.inOut(prog(t, V(c.fim) + 0.6, V(c.fim) + 1.2));

  return (
    <AbsoluteFill style={{ background: '#020a2e' }}>
      <Background t={t} cam={cam} energy={energy} />
      {/* mundo: a imagem original animada */}
      <AbsoluteFill style={{ transform: camTransform(cam, 1), transformOrigin: '0 0', clipPath: `circle(${reveal * 130}% at 50% 62%)` }}>
        <PhotoPuppet pose={pose} />
        {/* luz de destaque pulsando com a fala */}
        <AbsoluteFill style={{ background: `radial-gradient(40% 25% at 50% 58%, rgba(120,200,255,${0.06 + energy * 0.08}), transparent 70%)`, mixBlendMode: 'screen' }} />
      </AbsoluteFill>
      {/* partículas sutis na frente */}
      <Sparkles t={t} start={V(c.mascote) + 0.3} x={540} y={1450} seed={3} spread={300} />
      <Sparkles t={t} start={V(c.surpresas)} x={540} y={900} n={28} spread={480} seed={5} />
      <Sparkles t={t} start={V(c.tudo) + 0.1} x={540} y={500} n={24} spread={420} seed={8} />
      {/* escurece o topo para os textos do cartão final */}
      <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(2,10,46,.85) 0%, rgba(2,10,46,.55) 40%, transparent 62%)', opacity: endDim }} />
      {/* textos e grafismos */}
      <Title3D text="PAFIEIS" t={t} start={V(c.area) + 0.1} end={V(c.eai) - 0.4} y={330} size={210} />
      <NameTag t={t} start={V(c.euSou) + 0.15} end={V(c.trazer) + 2.6} />
      {ROTEIRO.topicos.map((label, i) => (
        <TopicCard key={label} label={label} i={i} t={t} start={V(c.lista[i])} out={V(c.ligados) - 0.8 + i * 0.07}
          x={CARD_X} y={CARD_Y[i]} active={activeCard(i)} />
      ))}
      <BarWipe t={t} start={V(c.lista[0]) - 1.05} dur={0.7} />
      <EndCard t={t} start={V(c.fim) + 0.8} />
      <Flash v={flash} />
      <AbsoluteFill style={{ background: '#020a2e', opacity: clamp((t - (DURATION - 0.6)) / 0.6) }} />
      {/* áudio */}
      <Audio src={staticFile('audio/trilha.wav')} volume={(fr) => {
        const tt = fr / 30;
        const l = lipAt(tt);
        const duck = l ? Math.min(1, l.o * 2) : 0;
        return (HAS_VOICE ? 0.4 - duck * 0.2 : 0.5) * Math.min(1, tt / 0.3);
      }} />
      {HAS_VOICE && (
        <Sequence from={Math.round(VOICE_AT * 30)}>
          <Audio src={staticFile(VOICE)} volume={1} />
        </Sequence>
      )}
      {SFX.map((s, i) => (
        <Sequence key={i} from={Math.max(0, Math.round(s.at * 30))}>
          <Audio src={staticFile(`audio/${s.src}`)} volume={s.vol ?? 0.5} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

// etiqueta com o nome, acima da cabeça
const NameTag: React.FC<{ t: number; start: number; end: number }> = ({ t, start, end }) => {
  const k = E.back(prog(t, start, start + 0.45)), o = E.in(prog(t, end, end + 0.35));
  if (k <= 0 || o >= 1) return null;
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top: 380, display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: 1 - o, transform: `scale(${k}) translateY(${o * -60}px)` }}>
      <div style={{ background: 'linear-gradient(90deg,#ffffff,#dbeeff)', padding: '14px 44px', borderRadius: 40, fontFamily: 'Montserrat', fontWeight: 900, fontSize: 72, color: '#1631c4', letterSpacing: 3, boxShadow: '0 0 50px rgba(120,200,255,.55)' }}>PAFIEIS</div>
      <div style={{ marginTop: 14, background: 'linear-gradient(90deg,#1f3fe0,#14a0ff)', padding: '10px 30px', borderRadius: 22, fontFamily: 'Montserrat', fontWeight: 800, fontSize: 38, color: '#fff' }}>Mascote oficial da PAFIES</div>
    </div>
  );
};
