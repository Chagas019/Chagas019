// Saída do agente SOM para o projeto "demo". Frames absolutos da composição.
import type {Cue} from '../../som/biblioteca';

export const cuesDemo: Cue[] = [
  {som: 'click', frame: 18},
  {som: 'click', frame: 90, volume: 0.3},
  {som: 'impacto', frame: 52, volume: 0.4}, // mascote toca o chão
  {som: 'whoosh', frame: 176}, // whip 1 (inicia 6f antes do corte)
  {som: 'notificacao', frame: 204},
  {som: 'pop', frame: 258},
  {som: 'pop', frame: 309, volume: 0.35}, // mascote espia
  {som: 'whoosh', frame: 378}, // whip 2
  {som: 'pop', frame: 404, volume: 0.35},
  {som: 'pop', frame: 416, volume: 0.35},
  {som: 'pop', frame: 428, volume: 0.35},
  {som: 'impacto', frame: 510}, // clímax "voz"
];
