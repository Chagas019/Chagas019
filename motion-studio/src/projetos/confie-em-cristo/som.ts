// Saída do agente SOM para o projeto "confie-em-cristo".
// Cues em frames ABSOLUTOS, todos DERIVADOS de `gatilhosConfie` / `efeitosTransicaoConfie` (cenas.ts) e do
// ponto de pico de cada arquivo (`picoS` em SFX_CINEMA). Nenhum frame copiado: se a voz real mudar os tempos,
// os cues se recalculam. Uso: <CamadaSomCinema cues={cuesConfie} trilha={trilhaConfie} palavras={vozConfie.palavras} />
import {SFX_CINEMA, type CueCinema, type NomeSfxCinema} from '../../som/sfxCinema';
import type {TrilhaComNiveis} from '../../som/ducking';
import {efeitosTransicaoConfie, gatilhosConfie as g} from './cenas';

const FPS = 60;

const [t1, t2, t3, t4, t5] = efeitosTransicaoConfie;

/**
 * Trilha original (scripts/compor-trilha.mjs), 52,5 s, -20 LUFS, arco alinhado a voz.ts, com níveis POR SEÇÃO.
 * A trilha tem ~10 LU de dinâmica (escuro ≈ -26 LUFS, clímax ≈ -15). Um ganho único deixava o escuro enterrado
 * sob a fala. Aqui o ganho compensa a seção para a trilha ficar 14–18 dB abaixo da voz (-16 LUFS) o vídeo todo.
 * As fronteiras ficam nos silêncios da voz (início das transições T2, T3 e T5), com crossfade de 45 f.
 */
export const trilhaConfie: TrilhaComNiveis = {
  arquivo: 'audio/trilha/confie-em-cristo.wav',
  niveis: [
    {aPartirDoFrame: 0, trilha: 0.85, trilhaSobVoz: 0.5}, // A — escuro/esparso (trilha ≈ -26 LUFS: ducking leve, -4,6 dB)
    {aPartirDoFrame: t2.inicio, trilha: 0.7, trilhaSobVoz: 0.29}, // B — a luz abre (-7,7 dB)
    {aPartirDoFrame: t3.inicio, trilha: 0.62, trilhaSobVoz: 0.22}, // C — crescendo, confie/Jesus (-9 dB)
    {aPartirDoFrame: t5.inicio, trilha: 0.55, trilhaSobVoz: 0.19}, // D — resolução/clímax (-9,2 dB)
  ],
};
const fr = (s: number) => Math.round(s * FPS);
/** Frames entre o início do arquivo e o seu pico. */
const pico = (som: NomeSfxCinema) => fr(SFX_CINEMA[som].picoS);
/** Duração da subida do riser em frames (ele termina no pico). */
const SUBIDA_RISER = pico('riser_luz');

/** Mesmo default de `vazamentoDeLuz` (src/movimento/cinema.tsx, prop `pico`): flash em 46% da transição. */
const PICO_VAZAMENTO = 0.46;
/** Antecipação padrão do whoosh em relação ao início da transição. */
const ANTECIPA_WHOOSH = 6;

const flashT1 = t1.inicio + Math.round(PICO_VAZAMENTO * (t1.fim - t1.inicio));
// Revelação de luz (agora DENTRO da cena 3; a T2 virou fade simples): o fio de luz cresce até "Mas" e a
// fenda ROMPE em "escute". O riser termina (pico) exatamente na ruptura.
const rupturaLuz = g.escute;
// O riser completo (2,6 s) começaria sobre "esperar por uma resposta". Ele só entra quando "resposta" acaba,
// pulando a parte inicial (`trimInicio`) com fade-in curto, e sobe inteiro no silêncio de 1200 ms antes de "Mas".
const inicioRiserCompleto = rupturaLuz - SUBIDA_RISER;
const inicioRiser = Math.max(inicioRiserCompleto, g.respostaFim);
// T5 (fade para preto): preto absoluto nos últimos 8 frames da 1ª metade; a cauda termina ali.
const pretoT5 = t5.inicio + Math.round((t5.fim - t5.inicio) * 0.6);

export const cuesConfie: CueCinema[] = [
  // T1 — vazamento de luz: ar + brilho com pico no flash
  {som: 'whoosh_suave', frame: flashT1 - pico('whoosh_suave'), volume: 0.3, evento: 'T1 vazamento de luz (pico do flash)'},
  {som: 'brilho', frame: flashT1 - pico('brilho'), volume: 0.16, evento: 'T1 flash âmbar'},
  // Cena 3 — a virada: riser sobe no silêncio após "resposta" e termina na ruptura da fenda ("escute");
  // o brilho abre junto com a fenda. Volumes menores que na versão T2 porque o pico agora encosta na voz.
  {som: 'riser_luz', frame: inicioRiser, trimInicio: inicioRiser - inicioRiserCompleto, fadeIn: 10, volume: 0.32, evento: 'riser → fenda de luz rompe ("escute")'},
  {som: 'brilho', frame: rupturaLuz - pico('brilho'), volume: 0.16, evento: 'fenda de luz se abre (escute → Deus)'},
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
