// Saída do agente CENAS para o projeto "confie-em-cristo".
// Todos os frames são DERIVADOS de `vozConfie` (msParaFrame). Nenhum número de sincronia é copiado:
// quando o áudio real substituir o roteiro cronometrado, este plano se recalcula sozinho.
//
// Regra de corte: cada transição fica CENTRADA no silêncio entre a última palavra de uma cena e a
// primeira da seguinte, de modo que nenhuma palavra cai dentro da sobreposição.
// Os tipos de Transicao são os existentes ('fade' | 'slide' | 'whip' | 'corte'); o efeito
// cinematográfico pretendido (vazamento de luz, revelação de luz, dissolve com foco, fade para preto)
// está descrito em `efeitosTransicaoConfie` e no storyboard. Quem implementa é o MOVIMENTO.
import type {Cena, PlanoCenas, Transicao} from '../../cenas/tipos';
import {msParaFrame} from '../../config/formatos';
import {vozConfie} from './voz';

const FPS = 60;
const P = vozConfie.palavras;

const limpa = (t: string) => t.trim().toLowerCase().replace(/[.,:;!?]/g, '');

/** Índice da n-ésima (1-based) ocorrência de uma palavra na narração. */
const idx = (palavra: string, ocorrencia = 1) => {
  let n = 0;
  for (let i = 0; i < P.length; i++) {
    if (limpa(P[i].text) === limpa(palavra) && ++n === ocorrencia) return i;
  }
  throw new Error(`cenas.ts: palavra "${palavra}" (#${ocorrencia}) não encontrada em vozConfie`);
};

const ini = (palavra: string, oc = 1) => msParaFrame(P[idx(palavra, oc)].startMs, FPS);
const fim = (palavra: string, oc = 1) => msParaFrame(P[idx(palavra, oc)].endMs, FPS);

/** Janela de transição de `frames` centrada no silêncio que começa após a palavra P[i]. */
const janelaApos = (i: number, frames: number) => {
  const a = msParaFrame(P[i].endMs, FPS);
  const b = msParaFrame(P[i + 1].startMs, FPS);
  const inicio = Math.round((a + b) / 2 - frames / 2);
  return {inicio, fim: inicio + frames, silencio: [a, b] as const};
};

// --- Transições (duração contemplativa 30–40 f) -------------------------------------------------
const TR = {
  t1: {tipo: 'fade', frames: 30} as Transicao, // vazamento de luz
  t2: {tipo: 'fade', frames: 40} as Transicao, // revelação de luz (a virada)
  t3: {tipo: 'slide', frames: 30, direcao: 'cima'} as Transicao, // dissolve com foco + subida suave
  t4: {tipo: 'fade', frames: 30} as Transicao, // dissolve com foco (rack focus)
  t5: {tipo: 'fade', frames: 40} as Transicao, // fade para preto
};

// Cortes nos silêncios reais da voz
const J1 = janelaApos(idx('imaginou'), TR.t1.frames); // frases 1–2 | frase 3
const J2 = janelaApos(idx('resposta'), TR.t2.frames); // silêncio de 1200 ms
const J3 = janelaApos(idx('destino'), TR.t3.frames); // frases 4–7 | frases 8–9
const J4 = janelaApos(idx('confie', 2), TR.t4.frames); // 2º confie | "Quando tudo parecer..."
const J5 = janelaApos(idx('amanhã'), TR.t5.frames); // silêncio de 1000 ms antes de "Confie em Cristo"

const TOTAL = msParaFrame(vozConfie.duracaoMs, FPS); // narração + respiro final de 2,5 s

// Inícios absolutos (= início da transição de entrada) e duração própria de cada cena
const inicio = [0, J1.inicio, J2.inicio, J3.inicio, J4.inicio, J5.inicio];
const duracao = [
  J1.fim - inicio[0],
  J2.fim - inicio[1],
  J3.fim - inicio[2],
  J4.fim - inicio[3],
  J5.fim - inicio[4],
  TOTAL - inicio[5],
];

/** Frames ABSOLUTOS dos gatilhos da voz (para TEXTO, MOVIMENTO, SOM, COR). */
export const gatilhosConfie = {
  // Cena 1
  luzVisivel: 0,
  talvez1: ini('Talvez', 1),
  entenda: ini('entenda'),
  agoraFim: fim('agora'),
  talvez2: ini('Talvez', 2),
  planos: ini('planos'),
  imaginouFim: fim('imaginou'),
  // Cena 2
  talvez3: ini('Talvez', 3),
  cansado: ini('cansado'),
  esperar: ini('esperar'),
  respostaFim: fim('resposta'),
  // Cena 3
  silencioVirada: fim('resposta'),
  mas: ini('Mas'),
  escute: ini('escute'),
  deus: ini('Deus'),
  controle: ini('controle'),
  historia: ini('história'),
  historiaFim: fim('história'),
  confiar: ini('Confiar'),
  cristo1: ini('Cristo', 1),
  caminhos: ini('caminhos'),
  significa2: ini('Significa'),
  caminhando: ini('caminhando'),
  enxergar: ini('enxergar'),
  destino: ini('destino'),
  destinoFim: fim('destino'),
  // Cena 4
  forca: ini('força'),
  confie1: ini('confie', 1),
  direcao: ini('direção'),
  confie2: ini('confie', 2),
  confie2Fim: fim('confie', 2),
  // Cena 5
  impossivel: ini('impossível'),
  lembreSe: ini('lembre-se'),
  jesus: ini('Jesus'),
  lado: ini('lado'),
  naoTenha: ini('Não', 1),
  amanha: ini('amanhã'),
  amanhaFim: fim('amanhã'),
  // Cena 6
  confieFinal: ini('Confie', 3),
  cristoFinal: ini('Cristo', 2),
  ele: ini('Ele'),
  caminho: ini('caminho'),
  verdade: ini('verdade'),
  vida: ini('vida'),
  vidaFim: fim('vida'),
  fimTotal: TOTAL,
} as const;

const g = gatilhosConfie;

/** Efeito cinematográfico pretendido para cada transição (implementação: MOVIMENTO). Frames absolutos. */
export const efeitosTransicaoConfie = [
  {de: 'incerteza', para: 'momentos-dificeis', efeito: 'vazamento de luz', inicio: J1.inicio, fim: J1.fim, silencio: J1.silencio},
  {de: 'momentos-dificeis', para: 'mensagem', efeito: 'revelação de luz', inicio: J2.inicio, fim: J2.fim, silencio: J2.silencio},
  {de: 'mensagem', para: 'confianca', efeito: 'dissolve com foco (subida)', inicio: J3.inicio, fim: J3.fim, silencio: J3.silencio},
  {de: 'confianca', para: 'cristo', efeito: 'dissolve com foco (rack focus)', inicio: J4.inicio, fim: J4.fim, silencio: J4.silencio},
  {de: 'cristo', para: 'finalizacao', efeito: 'fade para preto', inicio: J5.inicio, fim: J5.fim, silencio: J5.silencio},
] as const;

const cenas: Cena[] = [
  {
    id: 'incerteza',
    titulo: 'A incerteza',
    frames: duracao[0],
    storyboard: [
      'ENQUADRAMENTO: plano geral vazio, tela quase preta (azul-noite → preto). Um ponto de luz âmbar no terço inferior central.',
      'CAMADAS: fundo céu noturno desfocado | meio: poeira de luz flutuando (bokeh pequeno) | frente: grão 0.07 + vinheta 0.6.',
      `AÇÃO: o ponto de luz já está visível no f${g.luzVisivel} (gancho, opacidade ≥ 0.3 até f12) e cresce devagar. ` +
        `Tipografia de impacto (bold condensada, caixa alta, branco quente) "VOCÊ NÃO PRECISA" sobe por máscara a partir de "entenda" (f${g.entenda}); ` +
        `"TER TODAS AS RESPOSTAS." completa no silêncio após "agora" (f${g.agoraFim}). Na 2ª frase o texto ganha leve profundidade (sombra) e ` +
        `"RESPOSTAS" aquece para dourado suave em "planos" (f${g.planos}).`,
      `GATILHOS: Talvez f${g.talvez1} (luz pulsa 1x) · entenda f${g.entenda} · agora fim f${g.agoraFim} · Talvez f${g.talvez2} · planos f${g.planos} · imaginou fim f${g.imaginouFim}.`,
      'CÂMERA: contemplativa, push-in muito lento 1.00→1.06 em toda a cena; leve deriva vertical (noise), sem cortes internos.',
      'LUZ/COR: escuridão total, mistura 0 (frio). Única fonte = ponto âmbar.',
      'ÁUDIO: pad atmosférico grave + piano ambiente esparso entrando no f0; trilha em ducking sob a voz.',
      `SAÍDA (f${J1.inicio}–f${J1.fim}, no silêncio após "imaginou"): VAZAMENTO DE LUZ — o ponto âmbar estoura num flare lateral que lava a tela e revela a estrada.`,
    ].join('\n'),
    transicaoSaida: TR.t1,
    responsaveis: ['texto', 'movimento', 'cor', 'som'],
  },
  {
    id: 'momentos-dificeis',
    titulo: 'Os momentos difíceis',
    frames: duracao[1],
    storyboard: [
      'ENQUADRAMENTO: plano geral baixo, estrada reta em perspectiva até o horizonte; silhueta humana pequena (≈18% da altura) de costas, terço inferior.',
      'CAMADAS: fundo céu azul-escuro com neblina | meio: estrada + silhueta (2D, sem rosto) | frente: postes/vegetação desfocados passando (parallax) + poeira de luz.',
      `AÇÃO: silhueta caminha sozinha, passo lento. Texto "TALVEZ VOCÊ ESTEJA" entra em "Talvez" (f${g.talvez3}); "CANSADO" com peso/escala maior em "cansado" (f${g.cansado}); ` +
        `"DE ESPERAR." em "esperar" (f${g.esperar}) — o texto fica ancorado no espaço e recua com a câmera.`,
      `GATILHOS: Talvez f${g.talvez3} · cansado f${g.cansado} · esperar f${g.esperar} · resposta fim f${g.respostaFim}.`,
      'CÂMERA: travelling lento acompanhando a silhueta (dolly-in 1.00→1.05), profundidade de campo rasa no plano da silhueta.',
      'LUZ/COR: sombras longas, contraluz azul fraco no horizonte; mistura 0.1. Ainda escuro.',
      'ÁUDIO: piano continua, um sopro de vento (textura). Sem impactos.',
      `SAÍDA (f${J2.inicio}–f${J2.fim}, no silêncio de 1200 ms): REVELAÇÃO DE LUZ — um feixe volumétrico rasga o céu de cima, a tela clareia do centro para fora; é a virada escuridão → luz.`,
    ].join('\n'),
    transicaoSaida: TR.t2,
    responsaveis: ['personagens', 'texto', 'movimento', 'cor', 'som'],
  },
  {
    id: 'mensagem',
    titulo: 'A mensagem',
    frames: duracao[2],
    storyboard: [
      'ENQUADRAMENTO: novo cenário revelado pela luz — a mesma estrada vista agora de frente, raios atravessando nuvens; depois plano aberto do horizonte clareando.',
      'CAMADAS: fundo céu com raios volumétricos (god rays) | meio: horizonte/estrada | frente: partículas de poeira douradas iluminadas pelo feixe + grão 0.06.',
      `AÇÃO (3 batidas): (a) "Mas escute:" — silêncio visual, só a luz respira; leve bloom em "escute" (f${g.escute}). ` +
        `(b) "DEUS NÃO PERDEU O CONTROLE" entra palavra a palavra a partir de "Deus" (f${g.deus}); "CONTROLE" é a maior palavra e trava no lugar em "controle" (f${g.controle}); ` +
        `"DA SUA HISTÓRIA." em serifada itálica em "história" (f${g.historia}). Texto sai por dissolve após f${g.historiaFim}. ` +
        `(c) Frases 6–7 sem texto grande: legenda serifada discreta; em "caminhando" (f${g.caminhando}) a silhueta volta a caminhar EM DIREÇÃO à luz; ` +
        `em "enxergar" (f${g.enxergar}) a névoa à frente fica mais densa e a luz ao fundo segue visível.`,
      `GATILHOS: silêncio da virada f${g.silencioVirada} · Mas f${g.mas} · escute f${g.escute} · Deus f${g.deus} · controle f${g.controle} · história f${g.historia} · ` +
        `Confiar f${g.confiar} · Cristo f${g.cristo1} · caminhos f${g.caminhos} · Significa f${g.significa2} · caminhando f${g.caminhando} · enxergar f${g.enxergar} · destino f${g.destino}.`,
      'CÂMERA: crane-up suave durante a revelação, depois estático contemplativo em (b) e dolly-in acompanhando a silhueta em (c).',
      'LUZ/COR: a mais dramática do arco — mistura 0.15→0.6, luz do fundo 0.1→0.5; frio virando âmbar.',
      `ÁUDIO: ar/riser suave na revelação; impacto grave discreto em "controle" (f${g.controle}); piano ganha 2ª voz em "caminhando".`,
      `SAÍDA (f${J3.inicio}–f${J3.fim}, no silêncio após "destino"): DISSOLVE COM FOCO — a cena desfoca subindo enquanto a composição luminosa da cena 4 entra nítida.`,
    ].join('\n'),
    transicaoSaida: TR.t3,
    responsaveis: ['personagens', 'texto', 'pecas', 'movimento', 'cor', 'som'],
  },
  {
    id: 'confianca',
    titulo: 'A confiança',
    frames: duracao[3],
    storyboard: [
      'ENQUADRAMENTO: composição luminosa abstrata e centrada; campo âmbar/dourado com anel de luz suave atrás do texto.',
      'CAMADAS: fundo gradiente amanhecer | meio: anel/halo de luz + linhas finas gráficas minimalistas | frente: "CONFIE." enorme (bold condensada, ~80% da largura) com extrusão sutil.',
      `AÇÃO: "QUANDO FALTAR FORÇA," em serifada pequena (f${g.forca}); "CONFIE." BATE em escala (spring 1.25→1.0) exatamente em "confie" (f${g.confie1}). ` +
        `Sai a 1ª linha; "QUANDO FALTAR DIREÇÃO," (f${g.direcao}); "CONFIE." bate de novo, maior e mais dourado, em f${g.confie2}.`,
      `GATILHOS: Quando f${ini('Quando', 2)} · força f${g.forca} · confie f${g.confie1} · Quando f${ini('Quando', 3)} · direção f${g.direcao} · confie f${g.confie2}.`,
      'CÂMERA: estática com micro-shake de impacto (2–3 px, 6 f) em cada "confie"; push-in 1.00→1.04 entre as batidas.',
      'LUZ/COR: luminoso (mistura 0.8, luz do fundo 0.7); cada "confie" acende o halo (flash de +15% de exposição, decai em 20 f).',
      'ÁUDIO: impacto cinematográfico suave + sub em cada "confie"; trilha cresce levemente.',
      `SAÍDA (f${J4.inicio}–f${J4.fim}, no silêncio após o 2º "confie"): DISSOLVE COM FOCO (rack focus) — "CONFIE." desfoca à frente e a cruz aparece nítida ao fundo.`,
    ].join('\n'),
    transicaoSaida: TR.t4,
    responsaveis: ['texto', 'pecas', 'movimento', 'cor', 'som'],
  },
  {
    id: 'cristo',
    titulo: 'Cristo',
    frames: duracao[4],
    storyboard: [
      'ENQUADRAMENTO: cruz simples (madeira/linha gráfica, sem figura humana, sem imagem religiosa artificial) no centro, ligeiramente acima do meio, em contraluz.',
      'CAMADAS: fundo céu âmbar com raios atravessando por trás da cruz | meio: cruz (2D com toque 3D: leve volume/extrusão e sombra) | frente: poeira de luz e flare suave.',
      `AÇÃO: "QUANDO TUDO PARECER IMPOSSÍVEL," em serifada (f${g.impossivel}); "lembre-se:" (f${g.lembreSe}) — pausa; ` +
        `em "Jesus" (f${g.jesus}) os raios se abrem atrás da cruz (revelação máxima de luz) e "JESUS" aparece em dourado; "continua ao seu lado." serifada até "lado" (f${g.lado}). ` +
        `"NÃO TENHA MEDO DO AMANHÃ." em "Não" (f${g.naoTenha}), calmo, "AMANHÃ" em dourado (f${g.amanha}).`,
      `GATILHOS: impossível f${g.impossivel} · lembre-se f${g.lembreSe} · Jesus f${g.jesus} · lado f${g.lado} · Não f${g.naoTenha} · amanhã f${g.amanha} · amanhã fim f${g.amanhaFim}.`,
      'CÂMERA: crane-down lento revelando a cruz por baixo (contra-plongée suave) → estática após "Jesus".',
      'LUZ/COR: o ponto mais quente do arco (mistura 0.95, luz do fundo 0.85); god rays volumétricos.',
      `ÁUDIO: swell da trilha em "Jesus" (f${g.jesus}), sem competir com a voz; recua em "Não tenha medo".`,
      `SAÍDA (f${J5.inicio}–f${J5.fim}, no silêncio de 1000 ms): FADE PARA PRETO — a luz se recolhe para o centro e escurece; silêncio antes da assinatura.`,
    ].join('\n'),
    transicaoSaida: TR.t5,
    responsaveis: ['pecas', 'texto', 'movimento', 'cor', 'som'],
  },
  {
    id: 'finalizacao',
    titulo: 'Finalização — assinatura',
    frames: duracao[5],
    storyboard: [
      'ENQUADRAMENTO: tela escura com brilho âmbar central suave; tipografia centrada na área segura.',
      'CAMADAS: fundo preto profundo + halo dourado discreto | meio: linha fina horizontal dourada | frente: tipografia + grão 0.05.',
      `AÇÃO: "CONFIE" entra em "Confie" (f${g.confieFinal}); "EM CRISTO." completa em "Cristo" (f${g.cristoFinal}, CLÍMAX) com brilho dourado na palavra. ` +
        `"Ele é o caminho, a verdade e a vida." serifada itálica entra em "Ele" (f${g.ele}) com ênfase sutil em "caminho" (f${g.caminho}), "verdade" (f${g.verdade}) e "vida" (f${g.vida}). ` +
        `"João 14,6" pequeno, espaçado, aparece após "vida" (f${g.vidaFim}). Tudo segura até f${g.fimTotal}.`,
      `GATILHOS: Confie f${g.confieFinal} · Cristo f${g.cristoFinal} (clímax) · Ele f${g.ele} · caminho f${g.caminho} · verdade f${g.verdade} · vida f${g.vida} · respiro f${g.vidaFim}–f${g.fimTotal}.`,
      'CÂMERA: push-in quase imperceptível 1.00→1.03; sem movimento brusco.',
      'LUZ/COR: âmbar contido (mistura 0.9, luz do fundo 0.6); o halo pulsa uma vez no clímax.',
      `ÁUDIO: impacto sonoro discreto em "Cristo" (f${g.cristoFinal}); acorde final de piano sustentado no respiro; fade de áudio nos últimos 30 f.`,
      'SAÍDA: fim da composição (sem transição); últimos ~20 f com leve fade para preto opcional.',
    ].join('\n'),
    responsaveis: ['texto', 'movimento', 'cor', 'som'],
  },
];

export const planoConfie: PlanoCenas = {projeto: 'confie-em-cristo', fps: FPS, cenas};
