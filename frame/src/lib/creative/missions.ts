/**
 * "Me dê uma ideia" no formato MISSÃO: tema + missão + regras + resultado.
 * Gerador local por combinações (temas × técnicas × restrições). Não é IA.
 */
import type { IdeaProposal } from "@/server/db/schema";

export type Mission = {
  theme: string;
  mission: string;
  rules: string[];
  result: string;
  category: string;
  categoryLabel: string;
  level: "Iniciante" | "Intermediário" | "Avançado";
  minutes: number;
  materials: string[];
  steps: string[];
};

const THEMES = [
  { t: "O invisível", m: "algo comum de uma maneira que revele uma história que normalmente passa despercebida" },
  { t: "Ruído", m: "o caos de um lugar movimentado e encontre ordem dentro dele" },
  { t: "Memória", m: "um objeto que guarda uma lembrança, sem mostrar a pessoa que o usa" },
  { t: "Fronteira", m: "o limite entre dois mundos: dentro e fora, luz e sombra, natureza e cidade" },
  { t: "Ritual", m: "um gesto repetido todos os dias por alguém — com respeito e permissão" },
  { t: "Silêncio", m: "um lugar que costuma estar cheio, no momento em que está vazio" },
  { t: "Pausa", m: "o intervalo entre duas ações: o antes de um salto, o depois de uma conversa" },
  { t: "Origem", m: "o lugar, a pessoa ou a ferramenta que fez você começar a criar" },
  { t: "Contraste", m: "duas coisas opostas convivendo no mesmo quadro" },
  { t: "Vestígio", m: "a marca que alguém deixou para trás: pegadas, copos, cadeiras fora do lugar" },
];

const FORMATS = [
  { cat: "fotografia", label: "Fotografia", verb: "Fotografe", result: "Publique a fotografia com uma breve explicação da sua escolha.", materials: ["Câmera ou celular"] },
  { cat: "video", label: "Vídeo", verb: "Grave um vídeo de até 15 segundos sobre", result: "Publique o vídeo e conte na legenda qual plano foi o mais difícil.", materials: ["Celular ou câmera", "Editor de vídeo simples"] },
  { cat: "design", label: "Design", verb: "Crie um pôster sobre", result: "Publique o pôster e explique a escolha tipográfica.", materials: ["Figma, Canva ou papel e caneta"] },
  { cat: "edicao", label: "Edição", verb: "Edite uma imagem antiga sua para expressar", result: "Publique como antes e depois, mostrando o original.", materials: ["Uma foto sua", "Lightroom, Snapseed ou similar"] },
  { cat: "mobile", label: "Criação mobile", verb: "Usando só o celular, registre", result: "Publique o resultado e diga quais apps usou.", materials: ["Só o celular"] },
];

const RULES = [
  "Utilize até três elementos no quadro.",
  "Explore luz e sombra — nada de luz chapada.",
  "Crie um enquadramento intencional: decida o que fica de fora.",
  "Use no máximo duas cores predominantes.",
  "Trabalhe com uma única fonte de luz.",
  "Nenhuma pessoa pode aparecer de rosto.",
  "Faça tudo em um raio de 100 metros de onde você está.",
  "Use uma única família tipográfica.",
  "Três planos diferentes: geral, médio e detalhe.",
  "Preto e branco obrigatório.",
  "Comece pelo detalhe, termine no contexto.",
];

const LEVELS: Mission["level"][] = ["Iniciante", "Intermediário", "Avançado"];

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

export function generateMission(seed: number, category?: string): Mission {
  const r = rng(seed);
  const theme = THEMES[Math.floor(r() * THEMES.length)]!;
  const format = FORMATS.find((f) => f.cat === category) ?? FORMATS[Math.floor(r() * FORMATS.length)]!;
  const pool = [...RULES];
  const rules: string[] = [];
  const nRules = 2 + Math.floor(r() * 2);
  while (rules.length < nRules) rules.push(pool.splice(Math.floor(r() * pool.length), 1)[0]!);
  const level = LEVELS[Math.min(2, rules.length - 2 + Math.floor(r() * 2))]!;
  const minutes = [20, 30, 45, 60, 90][Math.floor(r() * 5)]!;
  return {
    theme: theme.t,
    mission: `${format.verb} ${theme.m}.`,
    rules,
    result: format.result,
    category: format.cat,
    categoryLabel: format.label,
    level,
    minutes,
    materials: format.materials,
    steps: [
      `Pense por 5 minutos no tema “${theme.t}” e anote três possibilidades.`,
      "Escolha a mais simples de executar hoje.",
      ...rules.map((x) => `Regra: ${x}`),
      "Produza pelo menos três versões e escolha uma.",
      format.result,
    ],
  };
}

/** Converte a missão no formato salvo pelo estúdio (reaproveita ideias e projetos). */
export function missionToProposal(m: Mission): IdeaProposal {
  return {
    title: `Missão: ${m.theme}`,
    concept: m.mission,
    visualReference: m.rules.join(" "),
    structure: m.steps,
    palette: [],
    framing: `Materiais: ${m.materials.join(", ")}`,
    editing: `${m.level} · cerca de ${m.minutes} min`,
    caption: m.result,
    cta: "",
    inputs: { kind: m.category, goal: "experimentar", style: "missao", platform: "feed", time: `${m.minutes}min` },
  };
}
