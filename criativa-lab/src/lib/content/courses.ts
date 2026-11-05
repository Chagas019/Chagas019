import type { Course } from "../types";

export const COURSES: Course[] = [
  {
    slug: "composicao-fotografica",
    title: "Composição fotográfica",
    subtitle: "Onde colocar as coisas — e por quê.",
    category: "fotografia",
    level: "iniciante",
    color: "#d4ff3a",
    lessons: [
      {
        slug: "o-quadro-e-uma-decisao",
        title: "O quadro é uma decisão",
        minutes: 6,
        body: [
          "Toda foto começa pelo que fica de fora. Enquadrar é editar o mundo antes do clique.",
          "Antes de fotografar, pergunte: qual é o assunto? O que distrai dele? Dê um passo à frente ou mude o ângulo até que só reste o essencial.",
        ],
        exercise: "Fotografe o mesmo objeto 5 vezes, removendo um elemento distrativo a cada foto.",
      },
      {
        slug: "tercos-linhas-e-diagonais",
        title: "Terços, linhas e diagonais",
        minutes: 8,
        body: [
          "A regra dos terços divide o quadro em 9 partes; os pontos de interseção atraem o olhar.",
          "Linhas guiam: estradas, corrimãos e sombras levam o olho até o assunto. Diagonais criam movimento; horizontais, calma.",
        ],
        exercise: "Faça 3 fotos: uma com linha guia, uma com diagonal forte e uma com o assunto num ponto de terço.",
      },
      {
        slug: "espaco-negativo-e-escala",
        title: "Espaço negativo e escala",
        minutes: 7,
        body: [
          "O vazio não é desperdício: ele dá respiro e importância ao assunto.",
          "Um assunto pequeno num grande espaço comunica solidão, liberdade ou grandiosidade.",
        ],
        exercise: "Crie uma foto em que o assunto ocupe menos de 10% do quadro.",
      },
    ],
  },
  {
    slug: "iluminacao",
    title: "Iluminação",
    subtitle: "Luz é o verdadeiro assunto de toda imagem.",
    category: "fotografia",
    level: "intermediario",
    color: "#ffd23f",
    lessons: [
      {
        slug: "dura-ou-suave",
        title: "Luz dura ou suave",
        minutes: 7,
        body: [
          "Quanto menor a fonte em relação ao assunto, mais dura a luz e mais marcada a sombra.",
          "Aproxime uma janela grande para suavizar; use o sol do meio-dia para drama gráfico.",
        ],
        exercise: "Fotografe um rosto com luz dura e com luz suave e compare a emoção.",
      },
      {
        slug: "direcao-da-luz",
        title: "A direção da luz",
        minutes: 6,
        body: [
          "Luz frontal achata; lateral revela textura; contraluz cria silhueta e halo.",
          "Mudar a posição do assunto em relação à luz é mais barato que comprar equipamento.",
        ],
        exercise: "Gire ao redor de um objeto e fotografe a cada 45°, mantendo a luz fixa.",
      },
      {
        slug: "cor-da-luz",
        title: "A cor da luz",
        minutes: 6,
        body: [
          "Luz quente (amanhecer, lâmpadas incandescentes) aconchega; fria (sombra, LED) distancia.",
          "Misturar temperaturas de cor de propósito cria tensão cinematográfica.",
        ],
        exercise: "Crie uma cena com uma fonte quente e uma fria ao mesmo tempo.",
      },
    ],
  },
  {
    slug: "teoria-das-cores",
    title: "Teoria das cores",
    subtitle: "Cor é emoção com coordenadas.",
    category: "design",
    level: "iniciante",
    color: "#ff5c39",
    lessons: [
      {
        slug: "matiz-saturacao-luminosidade",
        title: "Matiz, saturação e luminosidade",
        minutes: 6,
        body: [
          "Toda cor tem três dimensões. Mexer na luminosidade muda a hierarquia; na saturação, a energia.",
          "Teste sua paleta em escala de cinza: se tudo vira o mesmo cinza, falta contraste.",
        ],
        exercise: "Crie uma paleta de 5 cores e verifique o contraste em preto e branco.",
      },
      {
        slug: "harmonias",
        title: "Harmonias cromáticas",
        minutes: 8,
        body: [
          "Análogas acalmam, complementares vibram, triádicas equilibram.",
          "A regra 60-30-10 ajuda: 60% cor dominante, 30% secundária, 10% acento.",
        ],
        exercise: "Aplique a regra 60-30-10 em um post usando uma paleta da biblioteca.",
      },
      {
        slug: "cor-e-significado",
        title: "Cor e significado",
        minutes: 6,
        body: [
          "Significados de cor são culturais e contextuais. Vermelho é perigo, paixão ou promoção dependendo do entorno.",
          "Defina a emoção primeiro; escolha a cor depois.",
        ],
        exercise: "Escolha 3 emoções e crie uma paleta para cada uma.",
      },
    ],
  },
  {
    slug: "tipografia",
    title: "Tipografia",
    subtitle: "A voz visual das palavras.",
    category: "tipografia",
    level: "iniciante",
    color: "#f3f3ee",
    lessons: [
      {
        slug: "anatomia-da-letra",
        title: "Anatomia da letra",
        minutes: 6,
        body: [
          "Serifa, haste, altura-x, contraste: conhecer as partes ajuda a escolher com intenção.",
          "Fontes com altura-x grande leem melhor em tamanhos pequenos.",
        ],
        exercise: "Compare 3 fontes escrevendo a mesma frase e anote as diferenças de altura-x e contraste.",
      },
      {
        slug: "hierarquia",
        title: "Hierarquia tipográfica",
        minutes: 7,
        body: [
          "Tamanho, peso, cor e espaço definem o que é lido primeiro.",
          "Use no máximo 3 níveis de hierarquia por peça. Mais do que isso vira ruído.",
        ],
        exercise: "Diagrame um anúncio com título, subtítulo e texto usando só uma família.",
      },
      {
        slug: "combinacoes",
        title: "Combinando fontes",
        minutes: 6,
        body: [
          "Combine por contraste (serifa + sem serifa) ou por parentesco (mesma família, pesos diferentes).",
          "Evite duas fontes 'parecidas mas diferentes' — isso parece erro.",
        ],
        exercise: "Crie 2 pares tipográficos: um por contraste e um por parentesco.",
      },
    ],
  },
  {
    slug: "design-editorial",
    title: "Design editorial",
    subtitle: "Grid, ritmo e leitura.",
    category: "design",
    level: "intermediario",
    color: "#7cc4ff",
    lessons: [
      {
        slug: "o-grid",
        title: "O grid invisível",
        minutes: 8,
        body: [
          "Grids dão coerência entre páginas e liberdade para quebrar com intenção.",
          "Comece com 6 ou 12 colunas e margens generosas.",
        ],
        exercise: "Desenhe um grid de 6 colunas e diagrame uma página com imagem e texto.",
      },
      {
        slug: "ritmo-de-paginas",
        title: "Ritmo entre páginas",
        minutes: 6,
        body: [
          "Alternar páginas densas e páginas de respiro mantém o leitor engajado.",
          "Pense numa revista como música: refrões, pausas e clímax.",
        ],
        exercise: "Planeje o espelho de uma revista de 8 páginas marcando ritmo denso/leve.",
      },
    ],
  },
  {
    slug: "storytelling-visual",
    title: "Storytelling visual",
    subtitle: "Imagens que contam histórias.",
    category: "direcao-de-arte",
    level: "intermediario",
    color: "#b69cff",
    lessons: [
      {
        slug: "conflito",
        title: "Toda história tem conflito",
        minutes: 7,
        body: [
          "Sem tensão não há história. Mesmo uma foto única pode sugerir 'antes' e 'depois'.",
          "Pergunte: o que o espectador quer saber que a imagem não mostra?",
        ],
        exercise: "Crie uma imagem que faça o espectador perguntar 'o que aconteceu?'.",
      },
      {
        slug: "sequencia",
        title: "Sequência e série",
        minutes: 6,
        body: [
          "Três imagens já formam uma narrativa: situação, mudança, consequência.",
          "Mantenha uma constante (cor, enquadramento, personagem) para conectar a série.",
        ],
        exercise: "Conte uma história em 3 fotos mantendo o mesmo enquadramento.",
      },
    ],
  },
  {
    slug: "edicao-de-fotografia",
    title: "Edição de fotografia",
    subtitle: "Do arquivo bruto à imagem final.",
    category: "fotografia",
    level: "intermediario",
    color: "#5cffc8",
    lessons: [
      {
        slug: "fluxo-basico",
        title: "Fluxo básico de edição",
        minutes: 8,
        body: [
          "Ordem recomendada: corte e alinhamento → exposição → balanço de branco → contraste → cor → detalhes.",
          "Edite pela emoção, não pelo filtro da moda.",
        ],
        exercise: "Edite uma foto seguindo a ordem e salve um 'antes e depois'.",
      },
      {
        slug: "cor-e-consistencia",
        title: "Cor e consistência",
        minutes: 6,
        body: [
          "Crie um preset próprio a partir de uma foto-referência e aplique em série.",
          "Consistência de cor é o que transforma fotos soltas em portfólio.",
        ],
        exercise: "Crie um preset e aplique em 5 fotos diferentes.",
      },
    ],
  },
  {
    slug: "edicao-de-video",
    title: "Edição de vídeo",
    subtitle: "O corte é onde o filme acontece.",
    category: "video",
    level: "iniciante",
    color: "#ff5c39",
    lessons: [
      {
        slug: "por-que-cortar",
        title: "Por que cortar?",
        minutes: 6,
        body: [
          "Cada corte deve ter um motivo: nova informação, emoção ou ritmo.",
          "Corte no movimento para esconder a emenda.",
        ],
        exercise: "Grave uma ação simples em 3 planos e una com cortes no movimento.",
      },
      {
        slug: "som-e-ritmo",
        title: "Som e ritmo",
        minutes: 7,
        body: [
          "Som é metade da imagem. Um J-cut (som antes da imagem) suaviza transições.",
          "A trilha define o ritmo da edição — escolha a música antes de cortar.",
        ],
        exercise: "Edite 20 segundos usando um J-cut e cortes na batida.",
      },
    ],
  },
  {
    slug: "direcao-de-arte",
    title: "Direção de arte",
    subtitle: "Pensar a imagem antes de existir.",
    category: "direcao-de-arte",
    level: "avancado",
    color: "#b69cff",
    lessons: [
      {
        slug: "conceito-antes-da-forma",
        title: "Conceito antes da forma",
        minutes: 8,
        body: [
          "O diretor de arte traduz uma ideia em decisões visuais: cor, luz, cenário, figurino, tipografia.",
          "Escreva o conceito em uma frase. Se não cabe numa frase, ainda não é um conceito.",
        ],
        exercise: "Escreva o conceito de uma campanha em uma frase e liste 5 decisões visuais derivadas dela.",
      },
      {
        slug: "moodboard-que-funciona",
        title: "Moodboard que funciona",
        minutes: 7,
        body: [
          "Um bom moodboard tem direção, não só imagens bonitas: paleta, textura, luz, referências de pose e tipografia.",
          "Retire tudo que não ajuda a decidir.",
        ],
        exercise: "Monte um moodboard com 9 imagens e marque o que cada uma define.",
      },
    ],
  },
  {
    slug: "criatividade-redes-sociais",
    title: "Criatividade para redes sociais",
    subtitle: "Parar o scroll com intenção.",
    category: "social",
    level: "iniciante",
    color: "#ffd23f",
    lessons: [
      {
        slug: "o-primeiro-segundo",
        title: "O primeiro segundo",
        minutes: 6,
        body: [
          "No feed, você tem cerca de 1 segundo. Contraste, rosto ou pergunta prendem a atenção.",
          "O gancho deve ser compreendido sem som e sem legenda.",
        ],
        exercise: "Crie 3 versões de gancho para o mesmo post e compare qual para o olhar.",
      },
      {
        slug: "formatos-e-series",
        title: "Formatos e séries",
        minutes: 6,
        body: [
          "Séries criam hábito: o público sabe o que esperar e volta.",
          "Defina um formato fixo (ex.: 'antes/depois às terças') e mantenha a identidade visual.",
        ],
        exercise: "Crie o template de uma série semanal com nome, grid e paleta.",
      },
    ],
  },
];

export const courseBySlug = (slug: string) => COURSES.find((c) => c.slug === slug);
export const LESSON_XP = 25;
export const TOTAL_LESSONS = COURSES.reduce((n, c) => n + c.lessons.length, 0);
