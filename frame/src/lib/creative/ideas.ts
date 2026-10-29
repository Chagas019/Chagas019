/**
 * "Me dê uma ideia" — gerador por modelos combinados (não é IA).
 * Determinístico pela semente: a mesma escolha + semente gera a mesma proposta.
 */
import type { IdeaProposal } from "@/server/db/schema";

export const IDEA_OPTIONS = {
  kind: [
    { v: "foto", l: "Fotografia" },
    { v: "video", l: "Vídeo" },
    { v: "design", l: "Design" },
    { v: "edicao", l: "Edição" },
    { v: "carrossel", l: "Carrossel" },
  ],
  goal: [
    { v: "portfolio", l: "Fortalecer o portfólio" },
    { v: "engajamento", l: "Gerar conversa" },
    { v: "ensinar", l: "Ensinar algo" },
    { v: "vender", l: "Atrair clientes" },
    { v: "historia", l: "Contar uma história" },
    { v: "experimentar", l: "Experimentar sem compromisso" },
  ],
  style: [
    { v: "cinematografico", l: "Cinematográfico" },
    { v: "minimalista", l: "Minimalista" },
    { v: "documental", l: "Documental" },
    { v: "vibrante", l: "Vibrante" },
    { v: "vintage", l: "Vintage" },
    { v: "editorial", l: "Editorial" },
  ],
  platform: [
    { v: "feed", l: "Feed do FRAME / Instagram" },
    { v: "reels", l: "Reels / TikTok" },
    { v: "youtube", l: "YouTube" },
    { v: "portfolio", l: "Portfólio" },
    { v: "impresso", l: "Impresso" },
  ],
  time: [
    { v: "30min", l: "30 minutos" },
    { v: "2h", l: "Umas 2 horas" },
    { v: "1dia", l: "Um dia" },
    { v: "fds", l: "Um fim de semana" },
  ],
} as const;

export type IdeaInputs = { kind: string; goal: string; style: string; platform: string; time: string };

function rng(seed: number) {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const THEMES = [
  { theme: "mãos que trabalham", noun: "as mãos de alguém fazendo o que ama" },
  { theme: "o caminho de casa", noun: "o trajeto que você faz todos os dias" },
  { theme: "a primeira luz do dia", noun: "os 20 minutos depois do nascer do sol" },
  { theme: "objetos com memória", noun: "um objeto antigo da sua família" },
  { theme: "o bairro à noite", noun: "as luzes da sua rua depois das 19h" },
  { theme: "silêncio", noun: "um lugar que costuma estar cheio, vazio" },
  { theme: "fé e ritual", noun: "um gesto de celebração ou oração, com respeito" },
  { theme: "cor única", noun: "tudo o que você encontrar de uma mesma cor" },
  { theme: "retrato sem rosto", noun: "uma pessoa contada por detalhes, sem mostrar o rosto" },
  { theme: "antes da festa", noun: "a preparação de um evento, não o evento" },
  { theme: "reflexos", noun: "vidros, poças e espelhos da cidade" },
  { theme: "um dia em 10 planos", noun: "a sua rotina em dez imagens" },
];

const PALETTES: Record<string, string[][]> = {
  cinematografico: [["#0d1b2a", "#e8a15a", "#2a6f7a"], ["#111111", "#c8553d", "#f2d0a4"]],
  minimalista: [["#f2efe6", "#0d0d0d", "#c0c2b8"], ["#ffffff", "#2734f0", "#ebebe6"]],
  documental: [["#2f2f2f", "#8a8f5a", "#e0d8c3"], ["#1a1a1a", "#a2a49b", "#f2efe6"]],
  vibrante: [["#2734f0", "#d5ff40", "#ff6b2c"], ["#ff3d7f", "#ffd23f", "#3a86ff"]],
  vintage: [["#6b4f3a", "#e0b48c", "#3e5641"], ["#a0522d", "#f4e1c1", "#556b2f"]],
  editorial: [["#0d0d0d", "#ebebe6", "#2734f0"], ["#111111", "#f5f5f0", "#ff6b2c"]],
};

const STYLE_LOOK: Record<string, { ref: string; framing: string; editing: string }> = {
  cinematografico: {
    ref: "luz lateral recortando o assunto, fundo escuro, proporção larga e um único ponto quente na cena",
    framing: "plano médio em 16:9 ou 2,39:1, assunto fora do centro e espaço na direção do olhar",
    editing: "pele quente e sombras levemente frias, contraste suave e grão fino",
  },
  minimalista: {
    ref: "fundo liso, muito espaço vazio e um único elemento pequeno no quadro",
    framing: "assunto pequeno em um terço do quadro, horizonte limpo e nenhum elemento disputando atenção",
    editing: "exposição clara, poucas cores, saturação baixa e nenhum efeito aparente",
  },
  documental: {
    ref: "momentos reais sem pose, luz disponível e pessoas em ação",
    framing: "lente média (35–50mm), câmera na altura dos olhos e sequência de geral → detalhe",
    editing: "cor natural, contraste moderado; teste uma versão em preto e branco",
  },
  vibrante: {
    ref: "cores saturadas em contraste complementar, sombras duras de sol ou flash",
    framing: "composição gráfica, ângulos de cima ou de baixo, cores ocupando áreas grandes",
    editing: "saturação seletiva nas cores principais, pretos firmes e nitidez marcada",
  },
  vintage: {
    ref: "luz suave de fim de tarde, objetos com textura e tons terrosos",
    framing: "enquadramentos simples, centralizados, como fotos de álbum",
    editing: "pretos levemente lavados, realces quentes, grão visível e vinheta discreta",
  },
  editorial: {
    ref: "pose intencional, figurino ou objeto com cor forte, cenário limpo",
    framing: "vertical 4:5 com espaço para título, assunto bem recortado do fundo",
    editing: "pele limpa sem plastificar, cores consistentes com a paleta e contraste alto",
  },
};

const STRUCTURE: Record<string, (t: string, time: string) => string[]> = {
  foto: (t, time) => [
    `Faça uma lista de 5 lugares ou pessoas ligados a “${t}”.`,
    time === "30min" ? "Escolha o mais próximo e faça 20 fotos variando ângulo e distância." : "Visite pelo menos dois e faça 40 a 60 fotos em horários diferentes.",
    "Selecione as 5 melhores e escolha uma como imagem principal.",
    "Edite a principal e aplique o mesmo estilo nas outras.",
    "Publique a principal e as outras como galeria.",
  ],
  video: (t, time) => [
    `Abertura (0–3s): o plano mais forte sobre “${t}” e um texto curto com a promessa.`,
    "Desenvolvimento: 4 a 6 planos curtos alternando geral, médio e detalhe.",
    time === "30min" ? "Grave tudo em um único lugar, com luz natural." : "Grave em dois momentos do dia para variar a luz.",
    "Virada: um plano inesperado ou um detalhe que muda o sentido.",
    "Final: volte ao plano de abertura ou mostre o resultado.",
  ],
  design: (t) => [
    `Escreva uma frase de até 6 palavras sobre “${t}”.`,
    "Faça 3 rascunhos rápidos variando o tamanho do título.",
    "Escolha um, aplique a paleta e um grid simples.",
    "Adicione uma imagem ou forma que complete a ideia.",
    "Teste a peça em tamanho de celular antes de exportar.",
  ],
  edicao: (t) => [
    `Separe uma foto ou vídeo seu que tenha a ver com “${t}”.`,
    "Faça a correção neutra (exposição e balanço de branco).",
    "Crie duas versões de estilo diferentes.",
    "Compare lado a lado e escolha a que melhor conta a história.",
    "Publique como antes e depois mostrando o processo.",
  ],
  carrossel: (t) => [
    `Slide 1: capa com a promessa sobre “${t}”.`,
    "Slides 2–4: uma ideia ou imagem por slide.",
    "Slide 5: o detalhe ou bastidor que ninguém vê.",
    "Slide 6: resultado final ou conclusão.",
    "Slide 7: chamada para ação.",
  ],
};

const CTA: Record<string, string[]> = {
  portfolio: ["Salve para ver a série completa no meu portfólio.", "Veja o projeto completo no meu perfil."],
  engajamento: ["Qual dessas você escolheria? Me conta nos comentários.", "Você já fotografou algo assim? Mostra aqui."],
  ensinar: ["Salve para testar no seu próximo trabalho.", "Ficou alguma dúvida do processo? Pergunte nos comentários."],
  vender: ["Agenda aberta para projetos como este — mensagem no perfil.", "Quer algo assim para a sua marca? Fale comigo."],
  historia: ["Conhece alguém com uma história assim? Marque nos comentários.", "Essa é só a primeira parte. Siga para a próxima."],
  experimentar: ["Primeiro teste com essa ideia — feedback é bem-vindo.", "Experimento do dia. Faria diferente?"],
};

function pick<T>(r: () => number, arr: readonly T[]): T {
  return arr[Math.floor(r() * arr.length)]!;
}

const label = (group: keyof typeof IDEA_OPTIONS, v: string) => IDEA_OPTIONS[group].find((o) => o.v === v)?.l ?? v;

export function isValidInputs(i: IdeaInputs): boolean {
  return (Object.keys(IDEA_OPTIONS) as (keyof typeof IDEA_OPTIONS)[]).every((k) => IDEA_OPTIONS[k].some((o) => o.v === i[k]));
}

export function generateIdea(inputs: IdeaInputs, seed: number): IdeaProposal {
  const r = rng(seed);
  const { theme, noun } = pick(r, THEMES);
  const look = STYLE_LOOK[inputs.style] ?? STYLE_LOOK.cinematografico!;
  const palette = pick(r, PALETTES[inputs.style] ?? PALETTES.cinematografico!);
  const kindLabel = label("kind", inputs.kind).toLowerCase();
  const titles = [
    `${theme[0]!.toUpperCase()}${theme.slice(1)}`,
    `Série: ${theme}`,
    `${theme[0]!.toUpperCase()}${theme.slice(1)}, em ${label("style", inputs.style).toLowerCase()}`,
  ];
  return {
    title: pick(r, titles),
    concept: `Um projeto de ${kindLabel} sobre ${noun}, com estética ${label("style", inputs.style).toLowerCase()}, pensado para ${label("platform", inputs.platform)}. Objetivo: ${label("goal", inputs.goal).toLowerCase()}.`,
    visualReference: `Imagine ${noun}: ${look.ref}.`,
    structure: (STRUCTURE[inputs.kind] ?? STRUCTURE.foto!)(theme, inputs.time),
    palette,
    framing: inputs.platform === "reels" ? `vertical 9:16; ${look.framing}` : look.framing,
    editing: look.editing,
    caption: `${theme[0]!.toUpperCase()}${theme.slice(1)}. ${pick(r, ["Um olhar sobre o que passa despercebido.", "Feito em " + label("time", inputs.time).toLowerCase() + ".", "Primeira parte de uma série."])}`,
    cta: pick(r, CTA[inputs.goal] ?? CTA.experimentar!),
    inputs,
  };
}
