// Saída do agente VOZ para o projeto "demo".
// Narração ainda sem arquivo de áudio: timestamps de referência (roteiro cronometrado).
// Quando houver áudio real, substituir `arquivo` e regerar `palavras` via transcrição.
import type {AnaliseVoz} from '../../voz/tipos';
import {detectarPausas, palavras} from '../../voz/util';

const p = palavras([
  ['Dez', 300, 600],
  ['agentes.', 600, 1200],
  ['Um', 1500, 1700],
  ['estúdio.', 1700, 2400],
  ['Notificações,', 3400, 4200],
  ['interfaces', 4300, 5000],
  ['e', 5000, 5150],
  ['personagens', 5150, 5900],
  ['vivos.', 5900, 6500],
  ['Tudo', 6800, 7100],
  ['sincronizado', 7100, 7900],
  ['com', 7900, 8100],
  ['a', 8100, 8200],
  ['sua', 8200, 8500],
  ['voz.', 8500, 9300],
]);

export const vozDemo: AnaliseVoz = {
  arquivo: null,
  duracaoMs: 10000,
  palavras: p,
  pausas: detectarPausas(p),
  impactos: [
    {ms: 300, palavra: 'Dez', tipo: 'enfase'},
    {ms: 1700, palavra: 'estúdio.', tipo: 'enfase'},
    {ms: 3400, palavra: 'Notificações,', tipo: 'enfase'},
    {ms: 8500, palavra: 'voz.', tipo: 'climax'},
  ],
};
