/**
 * Laboratório Criativo — exemplos editoriais escritos pela equipe FRAME.
 * Não são publicações de usuários: a interface sempre os identifica como "Exemplo FRAME".
 * As prévias são composições geradas com CSS (sem fotos de terceiros).
 */

export type ExampleArea = "fotografia" | "video" | "design" | "edicao";
export type ExampleLevel = "iniciante" | "intermediario" | "avancado";
export type PreviewKind = "portrait" | "split" | "frames" | "poster" | "grid" | "beforeAfter" | "minimal";

export type CreativeExample = {
  slug: string;
  area: ExampleArea;
  title: string;
  summary: string;
  concept: string;
  steps: string[];
  tools: string[];
  level: ExampleLevel;
  minutes: number;
  /** Categoria do feed sugerida ao publicar a sua versão. */
  category: string;
  preview: { kind: PreviewKind; colors: [string, string, string] };
};

export const EXAMPLE_AREAS: { slug: ExampleArea; label: string }[] = [
  { slug: "fotografia", label: "Fotografia" },
  { slug: "video", label: "Vídeo" },
  { slug: "design", label: "Design" },
  { slug: "edicao", label: "Edição" },
];

export const LEVEL_LABEL: Record<ExampleLevel, string> = { iniciante: "Iniciante", intermediario: "Intermediário", avancado: "Avançado" };

export const EXAMPLES: CreativeExample[] = [
  // Fotografia
  {
    slug: "retrato-cinematografico",
    area: "fotografia",
    title: "De foto comum a retrato cinematográfico",
    summary: "Luz direcional, fundo escuro e um grão leve transformam um retrato do dia a dia.",
    concept:
      "O “olhar de cinema” vem menos do equipamento e mais de três decisões: uma fonte de luz principal com direção clara, contraste entre o rosto e o fundo e uma proporção de tela mais larga. A cor final costuma separar tons de pele quentes de sombras frias.",
    steps: [
      "Posicione a pessoa perto de uma janela, com a luz batendo de lado (45° a 90°).",
      "Afaste a pessoa da parede para o fundo ficar mais escuro que o rosto.",
      "Exponha para a pele: as sombras podem ficar bem fechadas.",
      "Recorte em 2,39:1 ou 16:9 deixando espaço na direção do olhar.",
      "Na edição, aqueça meios-tons, esfrie sombras levemente e adicione grão fino.",
    ],
    tools: ["Qualquer câmera ou celular", "Lightroom ou Snapseed", "DaVinci Resolve (opcional, para cor)"],
    level: "iniciante",
    minutes: 30,
    category: "cinematografica",
    preview: { kind: "portrait", colors: ["#0d0d0d", "#e8a15a", "#2734f0"] },
  },
  {
    slug: "luz-lateral-profundidade",
    area: "fotografia",
    title: "Luz lateral para criar profundidade",
    summary: "Use uma única fonte de luz para dar volume a rostos, objetos e texturas.",
    concept:
      "Luz frontal achata. Luz lateral revela textura e cria um degradê de claro para escuro que o olho lê como volume. Quanto mais lateral, mais dramático; um rebatedor do lado oposto controla o quanto a sombra “fecha”.",
    steps: [
      "Desligue as outras luzes do ambiente e use só uma fonte (janela, abajur, LED).",
      "Coloque a luz a 90° do assunto e faça uma foto de teste.",
      "Gire a luz aos poucos para 45° e compare as duas versões.",
      "Use uma folha branca do outro lado para abrir a sombra, se quiser suavizar.",
      "Escolha a versão em que a textura aparece sem perder os olhos.",
    ],
    tools: ["Uma fonte de luz", "Folha branca ou rebatedor", "Celular ou câmera"],
    level: "iniciante",
    minutes: 20,
    category: "retrato",
    preview: { kind: "split", colors: ["#121212", "#f2efe6", "#6b74ff"] },
  },
  {
    slug: "celebracao-pouca-luz",
    area: "fotografia",
    title: "Fotografar uma celebração com pouca luz",
    summary: "Casamentos, cultos e festas à noite sem flash estourado e sem fotos tremidas.",
    concept:
      "Em ambientes escuros, a prioridade é velocidade: abertura grande, ISO alto aceito e velocidade mínima de 1/125 para pessoas em movimento. Ruído se trata na edição; foto tremida não. Respeite o momento e as regras do local, principalmente em cerimônias religiosas.",
    steps: [
      "Converse antes com quem organiza: onde você pode ficar e se o flash é permitido.",
      "Configure abertura máxima (f/1.8–f/2.8) e velocidade mínima de 1/125.",
      "Deixe o ISO subir (3200–6400) e exponha um pouco à direita.",
      "Procure fontes de luz existentes (velas, palco, vitrais) e posicione as pessoas em relação a elas.",
      "Na edição, reduza ruído de luminância com moderação e preserve a atmosfera.",
    ],
    tools: ["Lente clara (f/1.8–f/2.8)", "Lightroom ou DxO", "Cartão rápido"],
    level: "intermediario",
    minutes: 60,
    category: "eventos",
    preview: { kind: "frames", colors: ["#0d0d0d", "#f5b84a", "#7a3cff"] },
  },
  {
    slug: "composicao-minimalista",
    area: "fotografia",
    title: "Composição minimalista",
    summary: "Menos elementos, mais intenção: espaço negativo como protagonista.",
    concept:
      "Uma imagem minimalista tem um assunto claro, poucos elementos e muito espaço vazio. O vazio guia o olhar e dá peso ao que restou. Cores sólidas e linhas simples ajudam.",
    steps: [
      "Escolha um único assunto (uma pessoa, uma árvore, uma janela).",
      "Encontre um fundo liso: céu, parede, mar, chão.",
      "Coloque o assunto pequeno no quadro, perto de um terço.",
      "Remova tudo o que disputa atenção mudando o ângulo, não na edição.",
      "Teste preto e branco e uma versão com uma única cor forte.",
    ],
    tools: ["Celular ou câmera", "Editor básico"],
    level: "iniciante",
    minutes: 25,
    category: "fotografia",
    preview: { kind: "minimal", colors: ["#ebebe6", "#0d0d0d", "#2734f0"] },
  },
  // Vídeo
  {
    slug: "transicoes-reels",
    area: "video",
    title: "Transições criativas para Reels",
    summary: "Transições feitas na hora de gravar, não só na edição.",
    concept:
      "As melhores transições de vídeo curto são “de câmera”: um movimento termina um plano e começa o outro (cobrir a lente, girar, passar por trás de um objeto). Na edição, basta cortar no ponto exato do movimento.",
    steps: [
      "Planeje três planos que se conectam por um mesmo movimento (ex.: chicote para a direita).",
      "Grave o fim do plano A terminando o movimento rápido.",
      "Grave o plano B começando no mesmo movimento e direção.",
      "Corte no frame de maior desfoque de movimento.",
      "Adicione um som de “whoosh” discreto só se ajudar o ritmo.",
    ],
    tools: ["Celular", "CapCut, InShot ou Premiere"],
    level: "iniciante",
    minutes: 40,
    category: "reels",
    preview: { kind: "frames", colors: ["#2734f0", "#d5ff40", "#0d0d0d"] },
  },
  {
    slug: "abertura-tres-segundos",
    area: "video",
    title: "Uma abertura que prende nos 3 primeiros segundos",
    summary: "Gancho visual + promessa clara antes que a pessoa role a tela.",
    concept:
      "Em vídeo curto, o primeiro plano decide tudo. Funciona começar pelo resultado (o “depois”), por um movimento inesperado ou por uma pergunta escrita na tela. O resto do vídeo cumpre a promessa feita ali.",
    steps: [
      "Escreva a promessa do vídeo em uma frase de até 8 palavras.",
      "Escolha o plano mais forte do material e coloque-o primeiro.",
      "Adicione o texto da promessa nos primeiros 2 segundos.",
      "Corte qualquer introdução, saudação ou logotipo do começo.",
      "Assista sem som: a abertura ainda se entende?",
    ],
    tools: ["CapCut, Premiere ou DaVinci", "Legendas automáticas"],
    level: "iniciante",
    minutes: 20,
    category: "reels",
    preview: { kind: "poster", colors: ["#0d0d0d", "#d5ff40", "#ff6b2c"] },
  },
  {
    slug: "sequencia-cinematografica",
    area: "video",
    title: "Montar uma sequência cinematográfica",
    summary: "Plano geral, médio, detalhe: a gramática básica para contar uma cena.",
    concept:
      "Uma sequência clássica apresenta o espaço (plano geral), a ação (plano médio) e a emoção (detalhe). Alternar esses tamanhos dá ritmo e deixa a história clara mesmo sem diálogo.",
    steps: [
      "Escolha uma ação simples: preparar um café, chegar a um lugar.",
      "Grave um plano geral mostrando onde estamos.",
      "Grave planos médios da ação acontecendo.",
      "Grave 3 a 5 detalhes (mãos, objetos, olhar).",
      "Monte geral → médio → detalhes → médio, cortando na ação.",
    ],
    tools: ["Câmera ou celular", "Tripé opcional", "Editor de vídeo"],
    level: "intermediario",
    minutes: 90,
    category: "video",
    preview: { kind: "frames", colors: ["#121212", "#c0c2b8", "#e8a15a"] },
  },
  {
    slug: "movimentos-de-camera",
    area: "video",
    title: "Movimentos de câmera que contam história",
    summary: "Cada movimento tem um significado: aproximar, revelar, acompanhar.",
    concept:
      "Movimento sem motivo cansa. Aproximar (push-in) cria tensão ou intimidade; afastar (pull-out) revela contexto; acompanhar mantém a pessoa no centro da história; panorâmica conecta dois pontos.",
    steps: [
      "Defina o que a cena precisa comunicar (tensão, descoberta, liberdade).",
      "Escolha um único movimento que traduza isso.",
      "Ensaie o movimento devagar, com os joelhos levemente flexionados.",
      "Grave 3 versões em velocidades diferentes.",
      "Na edição, mantenha só a mais estável e intencional.",
    ],
    tools: ["Celular com estabilização", "Gimbal (opcional)"],
    level: "intermediario",
    minutes: 45,
    category: "video",
    preview: { kind: "split", colors: ["#0d0d0d", "#2734f0", "#d5ff40"] },
  },
  // Design
  {
    slug: "combinacoes-de-cores",
    area: "design",
    title: "Combinações de cores para projetos visuais",
    summary: "Uma cor dominante, uma de apoio e uma de destaque usada com parcimônia.",
    concept:
      "A regra 60-30-10 ajuda a não errar: 60% de uma cor de base, 30% de uma cor secundária e 10% de destaque. Contraste suficiente entre texto e fundo é obrigatório para a peça ser legível.",
    steps: [
      "Escolha a cor de destaque pelo sentimento da peça.",
      "Defina uma base neutra (quase preto, off-white ou cinza).",
      "Escolha a secundária próxima da base ou complementar ao destaque.",
      "Aplique 60-30-10 em uma peça de teste.",
      "Verifique o contraste do texto (mínimo 4,5:1 para texto comum).",
    ],
    tools: ["Figma ou Canva", "Verificador de contraste"],
    level: "iniciante",
    minutes: 20,
    category: "design",
    preview: { kind: "grid", colors: ["#0d0d0d", "#2734f0", "#d5ff40"] },
  },
  {
    slug: "composicao-editorial",
    area: "design",
    title: "Composições editoriais modernas",
    summary: "Grid, hierarquia e espaço em branco como numa revista.",
    concept:
      "Layout editorial combina um grid firme com contrastes de escala: um título enorme, um bloco de texto pequeno, uma imagem que respira. A ordem de leitura é decidida pelo tamanho e pelo peso.",
    steps: [
      "Crie um grid de 6 ou 12 colunas com margens generosas.",
      "Defina 3 níveis de texto: título, subtítulo e corpo.",
      "Coloque o título bem maior que o resto (3 a 5 vezes).",
      "Alinhe tudo ao grid e deixe pelo menos uma área vazia.",
      "Teste a peça em tamanho de celular.",
    ],
    tools: ["Figma, InDesign ou Canva"],
    level: "intermediario",
    minutes: 45,
    category: "design",
    preview: { kind: "poster", colors: ["#ebebe6", "#0d0d0d", "#2734f0"] },
  },
  {
    slug: "poster-tipografico",
    area: "design",
    title: "Pôster com tipografia expressiva",
    summary: "Quando a letra é a imagem: escala, corte e repetição.",
    concept:
      "Em pôsteres tipográficos, a palavra vira forma. Fontes condensadas em tamanho gigante, cortes na borda e repetição criam ritmo. Use no máximo duas famílias tipográficas.",
    steps: [
      "Escolha uma palavra ou frase curta com força.",
      "Use uma fonte condensada em caixa alta ocupando a largura toda.",
      "Corte parte das letras na borda do pôster.",
      "Repita ou sobreponha a palavra com contorno.",
      "Use só duas cores e um pequeno bloco de informação.",
    ],
    tools: ["Figma, Illustrator ou Canva", "Fontes livres (Google Fonts)"],
    level: "iniciante",
    minutes: 40,
    category: "design",
    preview: { kind: "poster", colors: ["#2734f0", "#d5ff40", "#0d0d0d"] },
  },
  {
    slug: "layout-redes-sociais",
    area: "design",
    title: "Estudos de layout para redes sociais",
    summary: "Carrossel que se lê como uma história, slide por slide.",
    concept:
      "Um bom carrossel tem capa com promessa, desenvolvimento em blocos curtos e um fechamento com chamada para ação. Consistência de margens e tipografia faz o conjunto parecer profissional.",
    steps: [
      "Defina o formato (4:5 é o mais versátil).",
      "Crie um modelo com margens, posição do título e do número do slide.",
      "Escreva uma ideia por slide, com no máximo 25 palavras.",
      "Use uma cor de destaque para o elemento mais importante de cada slide.",
      "Feche com um slide de chamada para ação.",
    ],
    tools: ["Figma ou Canva"],
    level: "iniciante",
    minutes: 60,
    category: "identidade-visual",
    preview: { kind: "grid", colors: ["#121212", "#ff6b2c", "#ebebe6"] },
  },
  // Edição
  {
    slug: "antes-e-depois",
    area: "edicao",
    title: "Antes e depois de uma edição",
    summary: "Mostrar o processo ensina mais que mostrar só o resultado.",
    concept:
      "Um bom antes/depois mostra decisões, não filtros: correção de exposição, balanço de branco, recorte e cor. No FRAME, publique como Showcase com a foto original para ativar o controle deslizante.",
    steps: [
      "Exporte a foto original antes de qualquer ajuste.",
      "Corrija exposição e balanço de branco primeiro.",
      "Ajuste recorte e horizonte.",
      "Faça a cor por último (HSL, curvas, gradação).",
      "Publique como Showcase anexando a original no campo “Antes”.",
    ],
    tools: ["Lightroom, Snapseed ou Darktable"],
    level: "iniciante",
    minutes: 30,
    category: "edicao",
    preview: { kind: "beforeAfter", colors: ["#7a7a72", "#e8a15a", "#2734f0"] },
  },
  {
    slug: "estilos-color-grading",
    area: "edicao",
    title: "Comparação de estilos de color grading",
    summary: "O mesmo plano em três climas: quente, frio e teal & orange.",
    concept:
      "Color grading define a emoção. Tons quentes trazem nostalgia e acolhimento; frios, distância e tensão; teal & orange separa pele do fundo. Compare lado a lado antes de escolher.",
    steps: [
      "Faça a correção de cor neutra primeiro (balanço e exposição).",
      "Duplique a versão três vezes.",
      "Na primeira, aqueça meios-tons e realces.",
      "Na segunda, esfrie sombras e reduza saturação.",
      "Na terceira, empurre sombras para azul-esverdeado e proteja a pele.",
    ],
    tools: ["DaVinci Resolve", "Lightroom ou Premiere"],
    level: "intermediario",
    minutes: 40,
    category: "color-grading",
    preview: { kind: "split", colors: ["#e8a15a", "#2a6f7a", "#0d0d0d"] },
  },
  {
    slug: "correcao-de-cor",
    area: "edicao",
    title: "Correção de cor que ninguém percebe",
    summary: "Pele natural, brancos neutros e contraste certo antes de qualquer estilo.",
    concept:
      "Correção é tornar a imagem “verdadeira”: brancos sem dominante, pele com o tom certo e contraste equilibrado. Só depois disso o estilo (grading) funciona bem.",
    steps: [
      "Encontre algo que deveria ser branco ou cinza e use o conta-gotas.",
      "Ajuste exposição pelo rosto ou assunto principal.",
      "Use o vectorscópio (ou o olho) para checar a linha de pele.",
      "Recupere realces e abra sombras sem achatar.",
      "Compare com a original: deve parecer natural, não editado.",
    ],
    tools: ["DaVinci Resolve", "Lightroom"],
    level: "intermediario",
    minutes: 30,
    category: "color-grading",
    preview: { kind: "beforeAfter", colors: ["#8a8f5a", "#e0b48c", "#0d0d0d"] },
  },
  {
    slug: "fluxo-de-trabalho",
    area: "edicao",
    title: "Fluxo de trabalho da importação à entrega",
    summary: "Organizar, selecionar, editar e exportar sem perder arquivos nem tempo.",
    concept:
      "Um fluxo previsível evita retrabalho: pastas padronizadas, seleção em etapas (rejeitar rápido, escolher devagar), edição em lote quando possível e exportação com nomes claros. Faça backup em dois lugares.",
    steps: [
      "Crie a pasta do projeto: AAAA-MM-DD_cliente_tema.",
      "Importe e faça backup imediatamente.",
      "Primeira passada: rejeite o que está fora de foco ou repetido.",
      "Segunda passada: marque as melhores e edite uma como base.",
      "Sincronize ajustes, revise uma a uma e exporte com nomes claros.",
    ],
    tools: ["Lightroom, Capture One ou DaVinci", "HD externo ou nuvem"],
    level: "avancado",
    minutes: 60,
    category: "edicao",
    preview: { kind: "grid", colors: ["#121212", "#6b74ff", "#c0c2b8"] },
  },
];

export function getExample(slug: string) {
  return EXAMPLES.find((e) => e.slug === slug) ?? null;
}
