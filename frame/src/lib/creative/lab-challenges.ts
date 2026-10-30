/**
 * Desafios do LAB: missões permanentes escritas pela equipe FRAME.
 * Participar = criar um projeto no estúdio; publicar o resultado com a hashtag do desafio.
 * "Publicações participantes" são posts reais com essa hashtag.
 */
export type LabChallenge = {
  slug: string;
  title: string;
  description: string;
  category: string;
  categoryLabel: string;
  level: "Iniciante" | "Intermediário" | "Avançado";
  minutes: number;
  materials: string[];
  steps: string[];
  /** Prazo sugerido em dias (opcional, pessoal). */
  suggestedDays?: number;
  accent: string;
};

export const LAB_CHALLENGES: LabChallenge[] = [
  {
    slug: "so-luz-natural",
    title: "Uma foto usando apenas luz natural",
    description: "Sem flash, sem LED, sem luz de tela. Só sol, janela, céu nublado ou o reflexo de uma parede.",
    category: "fotografia",
    categoryLabel: "Fotografia",
    level: "Iniciante",
    minutes: 30,
    materials: ["Câmera ou celular", "Uma janela ou área externa"],
    steps: ["Escolha o horário: luz baixa (manhã ou fim de tarde) cria mais volume.", "Posicione o assunto em relação à luz, não o contrário.", "Teste luz de frente, de lado e de contra.", "Escolha a versão com melhor direção de luz.", "Publique contando de onde veio a luz."],
    suggestedDays: 3,
    accent: "#e8a15a",
  },
  {
    slug: "tres-planos-10s",
    title: "Vídeo de 10 segundos com três planos",
    description: "Geral, médio e detalhe. Três cortes para contar uma ação completa em dez segundos.",
    category: "video",
    categoryLabel: "Vídeo",
    level: "Iniciante",
    minutes: 45,
    materials: ["Celular", "Editor de vídeo"],
    steps: ["Escolha uma ação curta (abrir uma porta, servir um café).", "Grave um plano geral mostrando o lugar.", "Grave um plano médio da ação.", "Grave um detalhe (mãos, objeto, olhar).", "Monte em 10 segundos, cortando no movimento."],
    suggestedDays: 2,
    accent: "#6b74ff",
  },
  {
    slug: "duas-cores",
    title: "Edite uma imagem com duas cores predominantes",
    description: "Reduza a paleta até sobrar o essencial: duas cores dominantes e o resto neutro.",
    category: "edicao",
    categoryLabel: "Edição",
    level: "Intermediário",
    minutes: 40,
    materials: ["Uma foto sua", "Lightroom, Snapseed ou similar"],
    steps: ["Escolha uma foto com duas cores já presentes.", "Dessature tudo que não for essas duas cores (HSL).", "Ajuste luminância para separar as duas.", "Equilibre contraste sem criar novas cores.", "Publique como antes e depois."],
    accent: "#ff6b2c",
  },
  {
    slug: "poster-uma-familia",
    title: "Pôster com uma única família tipográfica",
    description: "Toda a hierarquia sai de uma família só: peso, tamanho, caixa e espaçamento.",
    category: "design",
    categoryLabel: "Design",
    level: "Intermediário",
    minutes: 60,
    materials: ["Figma, Canva ou Illustrator", "Uma família tipográfica livre"],
    steps: ["Escolha uma família com vários pesos.", "Defina título, apoio e informação.", "Crie contraste só com tamanho e peso.", "Use no máximo duas cores.", "Publique e conte qual fonte usou."],
    suggestedDays: 5,
    accent: "#d4ff36",
  },
  {
    slug: "recrie-uma-referencia",
    title: "Recrie uma referência com seu estilo",
    description: "Escolha uma obra que você admira e refaça do seu jeito. Sempre credite a original.",
    category: "fotografia",
    categoryLabel: "Qualquer área",
    level: "Avançado",
    minutes: 90,
    materials: ["A referência (com autoria)", "Seu equipamento de sempre"],
    steps: ["Escolha a referência e anote o que te atrai nela.", "Decida o que manter e o que mudar.", "Produza a sua versão.", "Compare lado a lado.", "Publique creditando a obra original e o autor."],
    accent: "#c0c2b8",
  },
  {
    slug: "so-celular",
    title: "Um projeto feito somente com o celular",
    description: "Capture, edite e finalize sem sair do celular. A restrição é a graça.",
    category: "mobile",
    categoryLabel: "Criação mobile",
    level: "Iniciante",
    minutes: 60,
    materials: ["Só o celular"],
    steps: ["Planeje um projeto pequeno (3 a 5 imagens ou 15 segundos).", "Capture tudo com o celular.", "Edite em apps do celular.", "Exporte no formato da plataforma.", "Publique listando os apps usados."],
    suggestedDays: 3,
    accent: "#5eead4",
  },
];

export function labTag(slug: string) {
  return `lab${slug.replace(/-/g, "")}`.slice(0, 40);
}

export function getLabChallenge(slug: string) {
  return LAB_CHALLENGES.find((c) => c.slug === slug) ?? null;
}
