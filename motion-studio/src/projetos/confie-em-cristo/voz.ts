// Saída do agente VOZ para o projeto "confie-em-cristo".
// SEM ARQUIVO DE ÁUDIO (ElevenLabs indisponível): roteiro cronometrado manualmente
// para o texto exato da narração do briefing, ritmo de locução contemplativa pt-BR.
// Quando houver o áudio real, salvar em public/audio/narracao/confie-em-cristo.wav,
// definir `arquivo` e REGERAR `palavras` via transcrição (os tempos abaixo são estimativas).
import type {AnaliseVoz} from '../../voz/tipos';
import {detectarPausas, palavras} from '../../voz/util';

const p = palavras([
  // Talvez você não entenda o que está acontecendo agora.
  ['Talvez', 900, 1146],
  ['você', 1166, 1412],
  ['não', 1432, 1575],
  ['entenda', 1595, 1944],
  ['o', 1964, 2114],
  ['que', 2134, 2277],
  ['está', 2297, 2543],
  ['acontecendo', 2563, 3118],
  ['agora.', 3138, 3574],
  // Talvez os seus planos não estejam saindo como você imaginou.
  ['Talvez', 4324, 4570],
  ['os', 4590, 4770],
  ['seus', 4790, 4933],
  ['planos', 4953, 5199],
  ['não', 5219, 5362],
  ['estejam', 5382, 5731],
  ['saindo', 5751, 5997],
  ['como', 6017, 6263],
  ['você', 6283, 6529],
  ['imaginou.', 6549, 7114],
  // Talvez você esteja cansado de esperar por uma resposta.
  ['Talvez', 7864, 8110],
  ['você', 8130, 8376],
  ['esteja', 8396, 8745],
  ['cansado', 8765, 9114],
  ['de', 9134, 9314],
  ['esperar', 9334, 9683],
  ['por', 9703, 9846],
  ['uma', 9866, 10112],
  ['resposta.', 10132, 10568],
  // Mas escute:
  ['Mas', 11768, 11911],
  ['escute:', 11931, 12516],
  // Deus não perdeu o controle da sua história.
  ['Deus', 13066, 13319],
  ['não', 13339, 13482],
  ['perdeu', 13502, 13748],
  ['o', 13768, 13918],
  ['controle', 13938, 14364],
  ['da', 14384, 14564],
  ['sua', 14584, 14830],
  ['história.', 14850, 15539],
  // Confiar em Cristo não significa entender todos os caminhos.
  ['Confiar', 16439, 16788],
  ['em', 16808, 16988],
  ['Cristo', 17008, 17413],
  ['não', 17433, 17576],
  ['significa', 17596, 18048],
  ['entender', 18068, 18417],
  ['todos', 18437, 18683],
  ['os', 18703, 18883],
  ['caminhos.', 18903, 19339],
  // Significa continuar caminhando,
  ['Significa', 19939, 20391],
  ['continuar', 20411, 20863],
  ['caminhando,', 20883, 21572],
  // mesmo quando você não consegue enxergar o destino.
  ['mesmo', 21852, 22098],
  ['quando', 22118, 22467],
  ['você', 22487, 22733],
  ['não', 22753, 22896],
  ['consegue', 22916, 23265],
  ['enxergar', 23285, 23634],
  ['o', 23654, 23804],
  ['destino.', 23824, 24356],
  // Quando faltar força,
  ['Quando', 25256, 25605],
  ['faltar', 25625, 25871],
  ['força,', 25891, 26266],
  // confie.
  ['confie.', 26616, 27197],
  // Quando faltar direção,
  ['Quando', 27947, 28296],
  ['faltar', 28316, 28562],
  ['direção,', 28582, 29114],
  // confie.
  ['confie.', 29464, 30045],
  // Quando tudo parecer impossível,
  ['Quando', 30895, 31244],
  ['tudo', 31264, 31510],
  ['parecer', 31530, 31879],
  ['impossível,', 31899, 32588],
  // lembre-se:
  ['lembre-se:', 32888, 33324],
  // Jesus continua ao seu lado.
  ['Jesus', 33774, 34119],
  ['continua', 34139, 34591],
  ['ao', 34611, 34791],
  ['seu', 34811, 34954],
  ['lado.', 34974, 35405],
  // Não tenha medo do amanhã.
  ['Não', 36305, 36448],
  ['tenha', 36468, 36714],
  ['medo', 36734, 36980],
  ['do', 37000, 37180],
  ['amanhã.', 37200, 37732],
  // Confie em Cristo.
  ['Confie', 38732, 39253],
  ['em', 39273, 39475],
  ['Cristo.', 39495, 40062],
  // Ele é o caminho,
  ['Ele', 40762, 41038],
  ['é', 41058, 41226],
  ['o', 41246, 41414],
  ['caminho,', 41434, 42030],
  // a verdade
  ['a', 42280, 42448],
  ['verdade', 42468, 43064],
  // e a vida.
  ['e', 43184, 43352],
  ['a', 43372, 43540],
  ['vida.', 43560, 44148],
]);

export const vozConfie: AnaliseVoz = {
  arquivo: null,
  duracaoMs: 46648,
  palavras: p,
  pausas: detectarPausas(p, 250),
  impactos: [
    {ms: 10568, palavra: '(silêncio antes de Mas escute)', tipo: 'pausa'},
    {ms: 11931, palavra: 'escute', tipo: 'enfase'},
    {ms: 13938, palavra: 'controle', tipo: 'enfase'},
    {ms: 20883, palavra: 'caminhando', tipo: 'enfase'},
    {ms: 26616, palavra: 'confie', tipo: 'enfase'},
    {ms: 29464, palavra: 'confie', tipo: 'enfase'},
    {ms: 33774, palavra: 'Jesus', tipo: 'enfase'},
    {ms: 37732, palavra: '(silêncio antes de Confie em Cristo)', tipo: 'pausa'},
    {ms: 38732, palavra: 'Confie', tipo: 'enfase'},
    {ms: 39495, palavra: 'Cristo', tipo: 'climax'},
  ],
};
