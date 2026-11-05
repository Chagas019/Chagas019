import type { CategoryId, GeneratedIdea, IdeaRequest } from "../types";

/**
 * Motor criativo local: gera ideias combinando técnicas de pensamento criativo
 * (inversão, analogia, restrição, mudança de escala, sinestesia) com o contexto
 * informado. Funciona sem chave de API e serve de fallback se a IA falhar.
 */

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = <T,>(r: () => number, arr: readonly T[]) => arr[Math.floor(r() * arr.length)];
const shuffle = <T,>(r: () => number, arr: readonly T[]) => [...arr].sort(() => r() - 0.5);

const METAPHORS = ["maré", "eco", "raiz", "faísca", "vitrine", "labirinto", "costura", "eclipse", "mapa", "ruído", "semente", "janela"];
const TENSIONS = ["silêncio x barulho", "artesanal x digital", "íntimo x monumental", "caos x ordem", "passado x futuro", "leveza x peso"];
const TECHNIQUES = [
  (w: string) => `Inversão: mostre ${w} pelo que ele NÃO é — construa a peça pela ausência.`,
  (w: string) => `Mudança de escala: transforme um detalhe de ${w} em protagonista monumental.`,
  (w: string) => `Analogia: trate ${w} como se fosse um objeto de museu, com etiqueta e iluminação de galeria.`,
  (w: string) => `Restrição: crie ${w} usando apenas uma cor, uma forma e uma palavra.`,
  (w: string) => `Sinestesia: traduza o som (ou o cheiro) de ${w} em textura e ritmo visual.`,
  (w: string) => `Série: produza 5 variações de ${w} mudando apenas um elemento por vez.`,
  (w: string) => `Ponto de vista: conte ${w} pelo olhar de um objeto ou animal presente na cena.`,
  (w: string) => `Antes e depois: mostre ${w} em dois momentos e deixe o público imaginar o meio.`,
] as const;

const PALETTES: Record<string, { name: string; hex: string }[]> = {
  minimalista: [
    { name: "Grafite", hex: "#1C1C1C" },
    { name: "Névoa", hex: "#D9D9D2" },
    { name: "Papel", hex: "#F3F3EE" },
    { name: "Limão", hex: "#D4FF3A" },
  ],
  vibrante: [
    { name: "Coral elétrico", hex: "#FF5C39" },
    { name: "Azul royal", hex: "#2B5CFF" },
    { name: "Gema", hex: "#FFD23F" },
    { name: "Tinta", hex: "#0A0A0A" },
  ],
  retro: [
    { name: "Mostarda", hex: "#D9A441" },
    { name: "Terracota", hex: "#B5532F" },
    { name: "Verde oliva", hex: "#5E6B3A" },
    { name: "Creme", hex: "#F2E6CE" },
  ],
  futurista: [
    { name: "Vácuo", hex: "#05060F" },
    { name: "Ciano", hex: "#3FF2FF" },
    { name: "Magenta", hex: "#FF3FA4" },
    { name: "Cromo", hex: "#C9CCD6" },
  ],
  editorial: [
    { name: "Preto tipográfico", hex: "#111111" },
    { name: "Off-white", hex: "#F4F1EA" },
    { name: "Vermelho editorial", hex: "#D7261E" },
    { name: "Cinza quente", hex: "#8C857B" },
  ],
  natural: [
    { name: "Argila", hex: "#9C4A24" },
    { name: "Areia", hex: "#EFC28F" },
    { name: "Musgo", hex: "#4F5D2F" },
    { name: "Linho", hex: "#F7E6CC" },
  ],
  sombrio: [
    { name: "Carvão", hex: "#0D0D0D" },
    { name: "Vinho", hex: "#4A0F1A" },
    { name: "Bronze", hex: "#8A5A3B" },
    { name: "Osso", hex: "#E8E0D0" },
  ],
};

const STYLE_KEYS: [RegExp, string][] = [
  [/minimal|clean|limp/i, "minimalista"],
  [/vibr|pop|color|colori/i, "vibrante"],
  [/retr|vintage|anos/i, "retro"],
  [/futur|tech|cyber|neon/i, "futurista"],
  [/editor|revista|suí/i, "editorial"],
  [/natur|orgân|terra/i, "natural"],
  [/sombr|dark|noir|dram/i, "sombrio"],
];

const REFS_BY_CATEGORY: Record<CategoryId, string[]> = {
  fotografia: ["Fotografia de rua com sombras duras", "Retratos com luz de janela", "Ensaios monocromáticos de moda", "Still life com fundos de cor chapada"],
  design: ["Estilo tipográfico internacional (grid suíço)", "Cartazes construtivistas", "Identidades visuais modulares", "Design editorial de revistas independentes"],
  video: ["Videoclipes com cortes na batida", "Planos-sequência de cinema autoral", "Vinhetas com tipografia cinética", "Documentários de observação"],
  "direcao-de-arte": ["Sets monocromáticos de moda", "Campanhas com objeto único em contextos absurdos", "Still life surrealista", "Cenografia de teatro minimalista"],
  social: ["Carrosséis educativos com grid fixo", "Séries semanais com identidade forte", "Reels com gancho visual no 1º segundo", "Perfis com grid planejado 3×3"],
  tipografia: ["Tipografia expressiva / lettering experimental", "Pares serifa + grotesca em editoriais", "Cartazes só tipográficos", "Tipografia cinética"],
  livre: ["Colagem analógica", "Arte generativa", "Instalações com objetos do cotidiano", "Diários visuais"],
};

const EXECUTION_BY_DIFFICULTY = {
  iniciante: [
    "Faça 10 rascunhos rápidos (5 minutos) antes de escolher um caminho.",
    "Use apenas ferramentas que você já domina — o foco é a ideia.",
    "Produza uma versão simples e peça feedback a uma pessoa.",
  ],
  intermediario: [
    "Monte um moodboard com 9 referências e defina 3 palavras-chave.",
    "Crie 3 variações com abordagens diferentes e escolha a mais forte.",
    "Refine hierarquia, ritmo e acabamento na versão escolhida.",
    "Teste a peça no formato final (tela de celular, impresso, etc.).",
  ],
  avancado: [
    "Escreva o conceito em uma frase e um brief de uma página.",
    "Construa um sistema (regras de cor, tipo, grid) antes das peças.",
    "Produza a peça-mãe e 3 desdobramentos em formatos diferentes.",
    "Documente o processo (antes/depois, decisões) para o portfólio.",
    "Apresente para alguém e ajuste com base nas objeções.",
  ],
} as const;

export function generateLocalIdea(req: IdeaRequest, salt = 0): GeneratedIdea {
  const r = rng(hash(`${req.what}|${req.category}|${req.style}|${req.audience}|${req.difficulty}|${salt}`));
  const subject = req.what.trim().replace(/\.$/, "");
  const metaphor = pick(r, METAPHORS);
  const tension = pick(r, TENSIONS);
  const paletteKey = STYLE_KEYS.find(([re]) => re.test(req.style))?.[1] ?? pick(r, Object.keys(PALETTES));
  const techniques = shuffle(r, TECHNIQUES).slice(0, 4).map((t) => t(subject.toLowerCase()));
  const isVideo = req.category === "video" || /v[ií]deo|reel|filme|roteiro|anima/i.test(req.what);

  const title = `${metaphor.charAt(0).toUpperCase() + metaphor.slice(1)} — ${subject}`;

  return {
    title,
    concept: `Tratar “${subject}” como uma ${metaphor}: algo que ${
      pick(r, ["se revela em camadas", "muda conforme o olhar", "conecta pontos distantes", "deixa rastros", "cresce a partir do mínimo"])
    }. A peça explora a tensão ${tension} para falar com ${req.audience.toLowerCase()} de um jeito ${req.style.toLowerCase()} e memorável.`,
    ideas: techniques,
    artDirection: `Estética ${req.style.toLowerCase()} com ${pick(r, ["luz dura e sombras gráficas", "luz suave e difusa", "contraluz e silhuetas", "iluminação de estúdio com fundo chapado"])}. Composição ${pick(
      r,
      ["assimétrica com muito espaço negativo", "centralizada e simétrica, quase cerimonial", "em grid rigoroso com uma única quebra", "em close extremo, cortando as bordas"],
    )}. Tipografia ${pick(r, ["grotesca em caixa-alta, corpo gigante", "serifada itálica com contraste alto", "monoespaçada, técnica e discreta", "condensada em colunas"])}. Textura: ${pick(
      r,
      ["grão de filme", "papel reciclado", "superfícies lisas e brilhantes", "ruído digital sutil"],
    )}.`,
    references: shuffle(r, REFS_BY_CATEGORY[req.category]).slice(0, 3),
    palette: PALETTES[paletteKey],
    execution: [...EXECUTION_BY_DIFFICULTY[req.difficulty]],
    script: isVideo
      ? [
          `0–2s · Gancho: close inesperado ligado a “${metaphor}”, sem som.`,
          "2–6s · Contexto: plano aberto revela onde estamos.",
          `6–12s · Desenvolvimento: três cortes rápidos mostrando a tensão ${tension}.`,
          "12–15s · Virada: um detalhe muda o sentido de tudo.",
          "15–20s · Fecho: imagem-símbolo + frase curta na tela.",
        ]
      : null,
    source: "local",
  };
}
