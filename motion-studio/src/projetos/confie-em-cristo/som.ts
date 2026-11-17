// Saída do agente SOM para o projeto "confie-em-cristo".
// Cues em frames ABSOLUTOS, todos DERIVADOS de `gatilhosConfie` / `efeitosTransicaoConfie` (cenas.ts) e do
// ponto de pico de cada arquivo (`picoS` em SFX_CINEMA). Nenhum frame copiado: se a voz real mudar os tempos,
// os cues se recalculam. Uso: <CamadaSomCinema cues={cuesConfie} trilha={trilhaConfie} palavras={vozConfie.palavras} />
import {SFX_CINEMA, type CueCinema, type NomeSfxCinema} from '../../som/sfxCinema';
import {efeitosTransicaoConfie, gatilhosConfie as g} from './cenas';

const FPS = 60;

/** Trilha original (scripts/compor-trilha.mjs), 52,5 s, -20 LUFS, arco alinhado a voz.ts. */
export const trilhaConfie = 'audio/trilha/confie-em-cristo.wav';

const [t1, t2, t3, t4, t5] = efeitosTransicaoConfie;
const fr = (s: number) => Math.round(s * FPS);
/** Frames entre o início do arquivo e o seu pico. */
const pico = (som: NomeSfxCinema) => fr(SFX_CINEMA[som].picoS);
/** Duração da subida do riser em frames (ele termina no pico). */
const SUBIDA_RISER = pico('riser_luz');

/** Mesmo default de `vazamentoDeLuz` (src/movimento/cinema.tsx, prop `pico`): flash em 46% da transição. */
const PICO_VAZAMENTO = 0.46;
/** Revelação de luz: o feixe fica mais forte em ~12–60% da T2 (MOVIMENTO: f655–674). Alvo do riser = 25%. */
const PICO_REVELACAO = 0.25;
/** Antecipação padrão do whoosh em relação ao início da transição. */
const ANTECIPA_WHOOSH = 6;

const flashT1 = t1.inicio + Math.round(PICO_VAZAMENTO * (t1.fim - t1.inicio));
const feixeT2 = t2.inicio + Math.round(PICO_REVELACAO * (t2.fim - t2.inicio));
// O riser completo começaria no meio de "esperar por uma resposta"; pulamos a parte inicial (quase inaudível)
// para que ele só "apareça" ~1 s antes do fim da palavra "resposta" e cresça no silêncio de 1200 ms.
const inicioRiserCompleto = feixeT2 - SUBIDA_RISER;
const inicioRiser = Math.max(inicioRiserCompleto, g.respostaFim - FPS);
// T5 (fade para preto): preto absoluto nos últimos 8 frames da 1ª metade; a cauda termina ali.
const pretoT5 = t5.inicio + Math.round((t5.fim - t5.inicio) * 0.6);

export const cuesConfie: CueCinema[] = [
  // T1 — vazamento de luz: ar + brilho com pico no flash
  {som: 'whoosh_suave', frame: flashT1 - pico('whoosh_suave'), volume: 0.3, evento: 'T1 vazamento de luz (pico do flash)'},
  {som: 'brilho', frame: flashT1 - pico('brilho'), volume: 0.16, evento: 'T1 flash âmbar'},
  // T2 — revelação de luz (a virada): riser terminando no feixe mais forte + brilho do feixe
  {som: 'riser_luz', frame: inicioRiser, trimInicio: inicioRiser - inicioRiserCompleto, volume: 0.38, evento: 'T2 riser → feixe de luz'},
  {som: 'brilho', frame: feixeT2 - pico('brilho'), volume: 0.18, evento: 'T2 feixe volumétrico'},
  // T3 / T4 — dissolves com foco: só ar, discreto
  {som: 'whoosh_suave', frame: t3.inicio - ANTECIPA_WHOOSH, volume: 0.2, evento: 'T3 dissolve com foco (subida)'},
  {som: 'impacto_suave', frame: g.confie1, volume: 0.42, evento: 'CONFIE #1 bate em escala'},
  {som: 'impacto_suave', frame: g.confie2, volume: 0.42, evento: 'CONFIE #2 bate em escala'},
  {som: 'whoosh_suave', frame: t4.inicio - ANTECIPA_WHOOSH, volume: 0.2, evento: 'T4 rack focus'},
  {som: 'brilho', frame: t4.fim - pico('brilho'), volume: 0.18, evento: 'cruz fica nítida (fim do rack focus)'},
  // Cena 5 — raios se abrem atrás da cruz em "Jesus": brilho chega no gap antes da palavra
  {som: 'brilho', frame: g.jesus - pico('brilho'), volume: 0.2, evento: 'raios atrás da cruz ("Jesus")'},
  // T5 — fade para preto: sem whoosh; só uma cauda de ar que morre no preto absoluto
  {som: 'respiro', frame: t5.inicio, trimInicio: fr(0.5), duracao: pretoT5 - t5.inicio, fadeOut: 12, volume: 0.2, evento: 'T5 cauda até o preto'},
  // Cena 6 — assinatura
  {som: 'impacto_suave', frame: g.confieFinal, volume: 0.28, evento: '"CONFIE" final (discreto)'},
  {som: 'impacto_suave', frame: g.cristoFinal, volume: 0.55, evento: 'CLÍMAX "EM CRISTO."'},
  {som: 'brilho', frame: g.cristoFinal - pico('brilho'), volume: 0.2, evento: 'brilho dourado na palavra / halo'},
];
