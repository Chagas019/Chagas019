/**
 * Conteúdo da Formação PASCOM.
 * Os caminhos de menu citam os nomes em português das versões recentes de iOS/Android;
 * podem variar um pouco por modelo e atualização do sistema.
 */

export type Block =
  | { t: 'p'; text: string }
  | { t: 'list'; title?: string; items: string[] }
  | { t: 'steps'; title?: string; items: string[] }
  | { t: 'table'; title?: string; head: string[]; rows: string[][] }
  | { t: 'callout'; tone: 'info' | 'warn' | 'ok'; title: string; text: string }
  | { t: 'dodont'; do: string[]; dont: string[] }
  | { t: 'devices'; items: DeviceGuide[] }
  | { t: 'checklist'; id: string; title: string; items: string[] }
  | { t: 'map' }
  | { t: 'moments' }
  | { t: 'quiz'; questions: QuizQuestion[] };

export interface DeviceGuide {
  id: string;
  label: string;
  models: string;
  sections: { title: string; items: string[] }[];
}

export interface QuizQuestion {
  q: string;
  options: string[];
  answer: number;
  explain: string;
}

export interface Lesson {
  id: string;
  title: string;
  minutes: number;
  blocks: Block[];
}

export interface TrainingModule {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  level: 'Básico' | 'Intermediário' | 'Avançado';
  lessons: Lesson[];
}

export const MODULES: TrainingModule[] = [
  /* ------------------------------------------------------------------ */
  {
    id: 'missao',
    title: 'A missão da PASCOM',
    subtitle: 'Postura, liturgia e cuidado com as pessoas antes de qualquer câmera',
    icon: 'Church',
    color: '#5BFF9A',
    level: 'Básico',
    lessons: [
      {
        id: 'postura',
        title: 'Servir sem aparecer',
        minutes: 6,
        blocks: [
          { t: 'p', text: 'A PASCOM registra a celebração para evangelizar quem não está presente, mas quem está na igreja veio rezar. A regra de ouro: a assembleia não pode perceber que você está trabalhando. Discrição vale mais do que qualquer foto.' },
          {
            t: 'dodont',
            do: [
              'Chegar 30 minutos antes, testar o equipamento e combinar com o padre/coordenador quais lugares você pode usar.',
              'Vestir roupa escura, discreta e sem estampas. Calçado que não faça barulho.',
              'Ajoelhar-se e fazer silêncio na Consagração, como todos.',
              'Andar pelas laterais, encostado às paredes, sem cruzar o corredor central durante a celebração.',
              'Desligar o som do obturador e o flash; colocar o celular no modo Não Perturbe.',
            ],
            dont: [
              'Subir ao presbitério (área do altar) sem autorização explícita.',
              'Ficar na frente de quem está rezando ou bloquear a visão do altar.',
              'Usar flash em qualquer momento da missa.',
              'Fotografar a Consagração de frente, perto do altar, ou se movimentar durante ela.',
              'Conversar com a equipe durante a celebração; combine tudo antes, ou por mensagem.',
            ],
          },
          { t: 'callout', tone: 'warn', title: 'Momentos de silêncio', text: 'Da epiclese até a elevação do cálice (Consagração), e também na Adoração ao Santíssimo, não se mova. Se precisar registrar, faça do ponto onde já estava, sem som, sem flash e só se isso foi combinado antes.' },
        ],
      },
      {
        id: 'imagem',
        title: 'Direito de imagem e cuidado com as pessoas',
        minutes: 5,
        blocks: [
          { t: 'p', text: 'Publicar a imagem de alguém é uma responsabilidade. A Lei Geral de Proteção de Dados (LGPD) e o bom senso pastoral pedem cuidado especial com crianças, pessoas em sofrimento e momentos íntimos de oração.' },
          {
            t: 'list',
            title: 'Combine com a coordenação',
            items: [
              'Aviso na igreja ou no folheto informando que a celebração é fotografada e transmitida.',
              'Crianças e adolescentes: publicar só com autorização dos responsáveis, e preferir fotos de grupo, de costas ou sem identificação do rosto.',
              'Batizados, Primeira Eucaristia, Crisma e casamentos: confirme antes com a família o que pode ser publicado.',
              'Se alguém pedir para não ser fotografado(a) ou pedir para apagar uma foto, atenda na hora, sem discutir.',
              'Não publique pessoas chorando, doentes, em confissão ou em sofrimento sem consentimento.',
            ],
          },
          { t: 'callout', tone: 'info', title: 'Dica', text: 'Na dúvida, escolha a foto de detalhe (mãos, terço, vela, vitral) em vez do rosto. Ela comunica a mesma fé e preserva a pessoa.' },
        ],
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  {
    id: 'celular',
    title: 'Configuração do celular',
    subtitle: 'iPhone antigo, iPhone novo, Android antigo e Android novo, passo a passo',
    icon: 'Smartphone',
    color: '#55B8FF',
    level: 'Básico',
    lessons: [
      {
        id: 'aparelhos',
        title: 'Ajustes por aparelho',
        minutes: 12,
        blocks: [
          { t: 'p', text: 'Escolha o seu tipo de aparelho abaixo e siga os ajustes. Faça isso com calma em casa, uma vez só. A maioria fica salva.' },
          {
            t: 'devices',
            items: [
              {
                id: 'iphone-antigo',
                label: 'iPhone antigo',
                models: 'iPhone 6s, 7, 8, SE (2ª geração), X, XR, XS e 11',
                sections: [
                  {
                    title: 'Ajustes › Câmera',
                    items: [
                      'Formatos: “Alta Eficiência” economiza espaço (HEIF/HEVC). Se o computador da paróquia não abrir os arquivos, use “Mais Compatível” (JPEG/H.264).',
                      'Gravar Vídeo: 1080p a 30 qps. Use 4K a 30 qps apenas se tiver bastante espaço livre (cerca de 350 MB por minuto).',
                      'Grade: ativada. Ajuda a alinhar o altar e a regra dos terços.',
                      'HDR Inteligente (XS, XR e 11) ou HDR Automático (modelos anteriores): ativado. Desative “Manter Foto Normal” para não duplicar arquivos.',
                      'Preservar Ajustes: ative “Modo da Câmera” e “Live Photo” para a câmera não voltar ao padrão toda vez.',
                    ],
                  },
                  {
                    title: 'Na hora de fotografar',
                    items: [
                      'Desligue o Live Photo (ícone de círculos no topo): fotos de pessoas em movimento ficam mais nítidas e ocupam menos espaço.',
                      'Toque no rosto/altar para focar; toque e segure até aparecer “Bloqueio de AE/AF” para travar foco e exposição.',
                      'Arraste o ícone do sol para baixo quando o altar estiver estourado (branco demais).',
                      'Evite o zoom além do “2x” (nos modelos com teleobjetiva). Nos demais, aproxime-se em vez de dar zoom: o zoom digital perde muita qualidade.',
                      'Use o Modo Retrato (7 Plus, 8 Plus, X ou superior) para fotos de pessoas fora da missa, com fundo desfocado.',
                    ],
                  },
                  {
                    title: 'Limitações',
                    items: [
                      'Pouca luz gera ruído (granulado). Prefira posições perto de janelas e luzes, e não use o Modo Noite para pessoas em movimento.',
                      'Bateria antiga dura pouco: leve carregador portátil e verifique em Ajustes › Bateria › Saúde da Bateria.',
                    ],
                  },
                ],
              },
              {
                id: 'iphone-novo',
                label: 'iPhone novo',
                models: 'iPhone 12 ao 16 e mais recentes (inclui Pro e Pro Max)',
                sections: [
                  {
                    title: 'Ajustes › Câmera › Formatos',
                    items: [
                      'Captura de Fotos: “Alta Eficiência”.',
                      'Pro (12 Pro ou superior): ative “Apple ProRAW” só se você for editar no Lightroom. O arquivo é grande (25 a 75 MB).',
                      'Controle de Resolução / Modo Foto (14 Pro ou superior e linha 15 em diante): 24 MP é o melhor equilíbrio. Use 48 MP para fotos de arquitetura e grupos grandes.',
                    ],
                  },
                  {
                    title: 'Ajustes › Câmera › Gravar Vídeo',
                    items: [
                      '4K a 30 qps para registros e edição; 1080p a 30 qps se o espaço estiver curto.',
                      'Vídeo HDR: desativado. Vídeos HDR (Dolby Vision) costumam ficar com cores lavadas ou estouradas no Instagram, no WhatsApp e em editores simples.',
                      'Bloquear Câmera: ativado (impede a troca automática de lente no meio da gravação).',
                      'Bloquear Balanço de Branco (quando disponível): ativado, para a cor não mudar no meio do vídeo.',
                      'Modo Ação (14 ou superior): use apenas para procissões e caminhadas; ele corta a imagem e precisa de boa luz.',
                    ],
                  },
                  {
                    title: 'Outros ajustes úteis',
                    items: [
                      'Grade e Nível: ativados.',
                      'Estilos Fotográficos: deixe em “Padrão”, para todos da equipe terem a mesma cor.',
                      'Preservar Ajustes: ative tudo, inclusive “Exposição”.',
                      'Lentes: 0,5x para a igreja inteira (cuidado com a distorção nas bordas), 1x para o dia a dia, 2x a 5x para o altar à distância, sem precisar se aproximar.',
                      'Botão Controle da Câmera (linha 16): abre a câmera e ajusta zoom e exposição sem tirar o olho da cena.',
                      'Modo Cinema: bonito para entrevistas e testemunhos, mas não use na missa: o foco automático pode “pular” de pessoa.',
                    ],
                  },
                ],
              },
              {
                id: 'android-antigo',
                label: 'Android antigo',
                models: 'Aparelhos com Android 8 a 11 ou de entrada (Galaxy A antigos, Moto G antigos, Redmi antigos)',
                sections: [
                  {
                    title: 'Engrenagem dentro do app Câmera',
                    items: [
                      'Tamanho da foto: a maior resolução em 4:3 (não use 16:9 nem “tela cheia”: ele corta a imagem).',
                      'Tamanho do vídeo: 1080p (FHD) a 30 fps.',
                      'Estabilização de vídeo: ativada, se existir.',
                      'Linhas de grade: ativadas.',
                      'HDR: automático.',
                      'Modo beleza / pele suave: DESATIVADO. Ele deixa rostos artificiais.',
                      'Local de armazenamento: cartão SD, se o aparelho tiver.',
                      'Som do obturador: desligado (quando o sistema permitir).',
                    ],
                  },
                  {
                    title: 'Melhorando o resultado',
                    items: [
                      'Se a câmera tiver modo “Pro” ou “Manual”, use os valores da tabela de luz da igreja (lição seguinte).',
                      'Sem modo manual? Instale o “Open Camera” (gratuito, na Play Store): permite travar ISO, velocidade, foco e balanço de branco.',
                      'Toque para focar e arraste a barrinha de exposição para baixo se o altar estourar.',
                      'Limpe a lente com pano macio antes de começar: lente engordurada deixa tudo com “névoa”.',
                      'Feche os outros apps antes da missa: aparelhos com pouca memória travam ao gravar vídeo.',
                    ],
                  },
                  {
                    title: 'Limitações',
                    items: [
                      'Pouca luz é o maior problema: aproxime-se das luzes e evite fotos de longe.',
                      'Prefira fotos e stories a vídeos longos; reserve as gravações longas para aparelhos melhores da equipe.',
                    ],
                  },
                ],
              },
              {
                id: 'android-novo',
                label: 'Android novo',
                models: 'Galaxy S/A recentes, Pixel 6 ou superior, Xiaomi/Redmi/POCO, Motorola Edge/G recentes',
                sections: [
                  {
                    title: 'Ajustes gerais da Câmera',
                    items: [
                      'Foto: 12 MP (ou o padrão “binning”) para o dia a dia; 50 MP/108 MP/200 MP só com muita luz.',
                      'Vídeo: 4K a 30 fps ou 1080p a 30 fps. Evite 8K: arquivos enormes e pouca vantagem.',
                      'Vídeo HDR10+ (Samsung, em Opções de gravação avançadas): desativado, pelo mesmo motivo do HDR no iPhone.',
                      'Estabilização / “Super Estável”: ative a estabilização normal; o “Super Estável” só em procissões.',
                      'Otimizador de cena / IA de cena: desative, para a equipe manter cores parecidas.',
                      'Grade e nível: ativados. Modo beleza: desativado.',
                    ],
                  },
                  {
                    title: 'Modo Pro (Samsung, Xiaomi, Motorola) / controles Pro (Pixel 8 Pro ou superior)',
                    items: [
                      'ISO entre 100 e 800 (até 1600 em igrejas escuras).',
                      'Velocidade: 1/120 s ou mais rápida para pessoas; 1/250 s em procissões e crianças.',
                      'Balanço de branco: entre 3200 K e 4500 K em igrejas com luz amarela; “Auto” com luz do dia.',
                      'Foco: automático contínuo; em fotos do altar, use foco manual com “focus peaking” se disponível.',
                      'Formato: RAW + JPEG apenas se for editar (Samsung tem o app “Expert RAW”).',
                    ],
                  },
                  {
                    title: 'Vídeo Pro',
                    items: [
                      '30 fps, velocidade 1/60 s (regra dos 180°), ISO o mais baixo possível.',
                      'Balanço de branco fixo (não deixe em automático: a cor muda quando o padre se move).',
                      'Microfone: “Omni” ou externo. Para a homilia, o melhor é o áudio da mesa de som.',
                    ],
                  },
                ],
              },
            ],
          },
          {
            t: 'checklist',
            id: 'antes-da-missa',
            title: 'Checklist antes de toda missa',
            items: [
              'Bateria acima de 80% e carregador portátil na bolsa',
              'Pelo menos 10 GB livres no aparelho',
              'Lente limpa',
              'Modo Não Perturbe ou modo avião (com Wi-Fi, se for subir stories)',
              'Som do obturador e flash desligados',
              'Brilho da tela baixo (economiza bateria e não incomoda a assembleia)',
              'Posições combinadas com o coordenador',
            ],
          },
        ],
      },
      {
        id: 'luz',
        title: 'A luz dentro da igreja',
        minutes: 7,
        blocks: [
          { t: 'p', text: 'Igrejas costumam ter pouca luz, luz amarela (quente), vitrais coloridos e janelas fortes. O celular tenta compensar sozinho e erra, por isso entender a luz faz mais diferença do que ter um aparelho caro.' },
          {
            t: 'table',
            title: 'Valores de partida (modo Pro/manual)',
            head: ['Situação', 'ISO', 'Velocidade', 'Balanço de branco'],
            rows: [
              ['Missa de dia, igreja clara', '100–400', '1/120–1/250 s', 'Auto ou 5000 K'],
              ['Missa à noite, luz amarela', '400–1600', '1/120 s', '3200–3800 K'],
              ['Luz de LED branca', '200–800', '1/120 s (evita faixas)', '4500–5500 K'],
              ['Adoração / velas', '800–3200', '1/60 s (apoie o celular)', '3000–3400 K'],
              ['Procissão ao ar livre', '50–200', '1/500 s', 'Auto'],
            ],
          },
          { t: 'callout', tone: 'info', title: 'Por que 1/120 s e não 1/125 s?', text: 'A rede elétrica no Brasil é de 60 Hz: lâmpadas LED e fluorescentes piscam 120 vezes por segundo. Velocidades múltiplas disso (1/60, 1/120) evitam faixas escuras na foto e cintilação no vídeo. Pelo mesmo motivo, grave vídeo a 30 ou 60 fps, nunca a 25 ou 50.' },
          {
            t: 'list',
            title: 'Contraluz (altar na frente de um vitral ou janela)',
            items: [
              'Mude de posição para a luz bater de lado, e não por trás da pessoa.',
              'Toque no rosto para medir a luz nele, e aceite que a janela vai estourar.',
              'Ou use o HDR, mas só para cenas paradas (arquitetura, altar vazio).',
            ],
          },
        ],
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  {
    id: 'camera',
    title: 'Câmera fotográfica',
    subtitle: 'Câmeras DSLR e mirrorless: modos, lentes e ajustes para a liturgia',
    icon: 'Camera',
    color: '#B98BFF',
    level: 'Intermediário',
    lessons: [
      {
        id: 'triangulo',
        title: 'O triângulo de exposição',
        minutes: 8,
        blocks: [
          { t: 'p', text: 'Três ajustes controlam quanta luz entra: abertura (f), velocidade do obturador e ISO. Na igreja, a prioridade é velocidade suficiente para não tremer; depois, abertura grande; por último, o ISO.' },
          {
            t: 'table',
            head: ['Ajuste', 'O que faz', 'Na igreja'],
            rows: [
              ['Abertura (f/1.8, f/2.8, f/4…)', 'Número menor = mais luz e fundo desfocado', 'f/1.8–f/2.8 para pessoas; f/4–f/8 para grupos e arquitetura'],
              ['Velocidade (1/60, 1/250…)', 'Mais rápida congela movimento', '1/120 s mínimo para pessoas; 1/250 s para gestos e procissões'],
              ['ISO (100, 1600, 6400…)', 'Clareia a foto, mas gera ruído', 'Deixe em Auto com limite de 6400 (câmeras recentes) ou 3200 (antigas)'],
            ],
          },
          { t: 'callout', tone: 'ok', title: 'Receita rápida', text: 'Modo M, f/2.8, 1/120 s, ISO Auto (limite 6400), compensação de exposição em 0 e balanço de branco em 3800 K. Ajuste a partir daí.' },
        ],
      },
      {
        id: 'ajustes-camera',
        title: 'Ajustes e lentes recomendados',
        minutes: 8,
        blocks: [
          {
            t: 'list',
            title: 'No menu da câmera',
            items: [
              'Formato: RAW + JPEG (o JPEG serve para stories rápidos, o RAW para editar).',
              'Foco: AF-C (contínuo) com rastreamento de rosto/olho; área de foco em zona.',
              'Disparo: contínuo baixo (3–5 fotos por segundo) para garantir uma foto sem olhos fechados.',
              'Obturador silencioso/eletrônico: use, mas teste antes. Sob LED ele pode criar faixas; se aparecerem, volte ao mecânico com velocidade 1/120 s.',
              'Estabilização (IBIS/OIS): ligada. Desligue só no tripé.',
              'Bipe de foco e luz auxiliar de AF: desligados.',
              'Dois cartões ou cartão reserva; bateria extra carregada.',
            ],
          },
          {
            t: 'table',
            title: 'Lentes',
            head: ['Lente', 'Uso na igreja'],
            rows: [
              ['50 mm f/1.8', 'A mais barata e luminosa: pessoas, detalhes e pouca luz'],
              ['24–70 mm f/2.8', 'A mais versátil: do plano geral ao altar'],
              ['70–200 mm f/2.8', 'Altar à distância sem se aproximar (ideal em celebrações grandes)'],
              ['16–35 mm / grande angular', 'Arquitetura, igreja cheia, coro'],
              ['Lente do kit 18–55 mm f/3.5–5.6', 'Funciona, mas exige ISO alto à noite; prefira posições perto da luz'],
            ],
          },
          { t: 'callout', tone: 'warn', title: 'Flash', text: 'Nunca durante a missa. Fora dela (fotos de grupo, eventos), use rebatido no teto ou na parede, nunca direto no rosto.' },
        ],
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  {
    id: 'video',
    title: 'Vídeo e transmissão',
    subtitle: 'Gravação, áudio, planos e configuração da live',
    icon: 'Video',
    color: '#FF6B7A',
    level: 'Intermediário',
    lessons: [
      {
        id: 'gravacao',
        title: 'Gravando bem',
        minutes: 9,
        blocks: [
          {
            t: 'table',
            title: 'Configurações de vídeo',
            head: ['Destino', 'Resolução', 'Quadros', 'Orientação'],
            rows: [
              ['Reels / Stories / TikTok', '1080 × 1920', '30 fps', 'Vertical 9:16'],
              ['YouTube / telão', '1920 × 1080 ou 4K', '30 fps', 'Horizontal 16:9'],
              ['Câmera lenta (procissão, incenso)', '1080p', '60 fps (reduza para 30 na edição)', 'Qualquer'],
              ['Feed do Instagram', '1080 × 1350', '30 fps', 'Vertical 4:5'],
            ],
          },
          {
            t: 'list',
            title: 'Regras de ouro',
            items: [
              'Regra dos 180°: a velocidade do obturador é o dobro dos quadros (30 fps → 1/60 s; 60 fps → 1/120 s). O movimento fica natural.',
              'Grave cada plano por pelo menos 8 a 10 segundos, parado, antes de mexer a câmera.',
              'Movimentos lentos, sempre com as duas mãos, cotovelos colados ao corpo; melhor ainda com tripé, monopé ou estabilizador (gimbal).',
              'Trave exposição e foco antes de gravar (toque e segure no celular).',
              'Planos: geral (situa), médio (pessoa da cintura para cima), detalhe (mãos, cálice, Bíblia). Alterne os três.',
              'Grave B-roll: vitrais, velas, fachada, pessoas chegando. É o que deixa a edição bonita.',
            ],
          },
        ],
      },
      {
        id: 'audio',
        title: 'Áudio: metade do vídeo',
        minutes: 5,
        blocks: [
          { t: 'p', text: 'As pessoas toleram imagem ruim, mas não áudio ruim. O microfone do celular capta o eco da igreja e quem está perto.' },
          {
            t: 'steps',
            items: [
              'Peça ao operador de áudio uma saída da mesa de som (cabo P2/USB para o celular ou para a placa de captura da live).',
              'Para entrevistas e testemunhos, use microfone de lapela (com fio ou sem fio), a um palmo da boca.',
              'Faça um teste de 10 segundos e ouça com fone antes de começar.',
              'Grave um minuto de “silêncio da igreja” (som ambiente) para usar na edição.',
            ],
          },
        ],
      },
      {
        id: 'live',
        title: 'Transmissão ao vivo',
        minutes: 8,
        blocks: [
          {
            t: 'table',
            title: 'Configuração de partida (OBS / software de live)',
            head: ['Item', 'Valor sugerido'],
            rows: [
              ['Resolução / quadros', '1920 × 1080 a 30 fps (720p se a internet for fraca)'],
              ['Taxa de bits do vídeo', '4.500 a 6.000 kbps (confira a recomendação atual da plataforma)'],
              ['Codificador', 'Hardware (NVENC/QuickSync/Apple) para não travar o computador'],
              ['Áudio', 'AAC, 160 kbps, 48 kHz, vindo da mesa de som'],
              ['Internet', 'Cabo de rede; upload estável de pelo menos o dobro da taxa de bits'],
            ],
          },
          {
            t: 'checklist',
            id: 'live',
            title: 'Checklist da live',
            items: [
              'Transmissão agendada e com título e capa (thumbnail) publicados 1 dia antes',
              'Teste de internet e de áudio 40 minutos antes',
              'Tela de “Começamos em instantes” no ar 10 minutos antes',
              'Celular/câmera na tomada, nunca só na bateria',
              'Pessoa responsável pelo chat (moderação e respostas)',
              'Gravação local ligada como cópia de segurança',
            ],
          },
          { t: 'callout', tone: 'info', title: 'Direitos autorais', text: 'Músicas tocadas ao vivo pelo ministério costumam ser aceitas pelas plataformas, mas trilhas de fundo gravadas podem bloquear a live. Na tela de espera, use músicas livres de direitos.' },
        ],
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  {
    id: 'posicoes',
    title: 'Posições dentro da igreja',
    subtitle: 'Mapa interativo de onde ficar, o que registrar e o que evitar',
    icon: 'MapPin',
    color: '#FFC857',
    level: 'Básico',
    lessons: [
      {
        id: 'mapa',
        title: 'Mapa das posições',
        minutes: 10,
        blocks: [
          { t: 'p', text: 'Planta típica de uma igreja católica em cruz: abside com crucifixo e sacrário (com a lâmpada do Santíssimo acesa), presbitério elevado com altar, cadeira presidencial, credência e ambão com o círio pascal; transepto com as imagens de Nossa Senhora e do padroeiro; nave com a Via-Sacra nas paredes, confessionário, pia batismal e coro. Toque em cada número para ver o que fotografar dali, com qual lente e quais cuidados ter. A área tracejada (presbitério) só pode ser usada com autorização do padre.' },
          { t: 'map' },
          { t: 'callout', tone: 'ok', title: 'Equipe de dois', text: 'Com duas pessoas, uma fica no fundo (posições 1 e 7) e a outra nas laterais (2, 3 e 5). Combinem antes quem cobre a Consagração, para ninguém se mexer nesse momento.' },
        ],
      },
      {
        id: 'momentos',
        title: 'Momentos da missa e o que registrar',
        minutes: 8,
        blocks: [
          { t: 'p', text: 'Cada parte da missa tem uma foto “clássica”. Saber o que vem a seguir é o que separa quem corre atrás de quem já está posicionado.' },
          { t: 'moments' },
        ],
      },
      {
        id: 'composicao',
        title: 'Composição: fotos que contam a história',
        minutes: 7,
        blocks: [
          {
            t: 'list',
            items: [
              'Simetria: o corredor central e o altar pedem enquadramento centralizado. Use a grade e alinhe as linhas verticais.',
              'Regra dos terços: em fotos de pessoas, coloque os olhos na linha superior da grade.',
              'Linhas que guiam: bancos, colunas e o tapete levam o olhar até o altar.',
              'Moldura natural: fotografe através de arcos, portas ou entre pessoas (desfocadas em primeiro plano).',
              'Detalhes: mãos em oração, terço, Bíblia aberta, vela, incenso, vitral com luz. Uma boa série tem sempre 30% de detalhes.',
              'Altura: fotografe crianças na altura delas. Do coro (alto), mostre a assembleia inteira.',
              'Sequência para as redes: 1 foto geral + 1 do momento principal + 2 detalhes + 1 de pessoas (com autorização).',
            ],
          },
          { t: 'callout', tone: 'warn', title: 'Cuidado com o grande-angular', text: 'A lente 0,5x distorce pessoas nas bordas. Use para arquitetura e igreja cheia, e mantenha as pessoas no centro da imagem.' },
        ],
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  {
    id: 'edicao',
    title: 'Edição de fotos e vídeos',
    subtitle: 'Lightroom, Snapseed, CapCut e o padrão visual da paróquia',
    icon: 'Wand2',
    color: '#7CF5FF',
    level: 'Intermediário',
    lessons: [
      {
        id: 'fotos',
        title: 'Editando fotos (Lightroom Mobile ou Snapseed)',
        minutes: 10,
        blocks: [
          { t: 'p', text: 'Os dois apps são gratuitos para o que precisamos. Siga sempre a mesma ordem: assim a equipe inteira chega a um resultado parecido.' },
          {
            t: 'steps',
            title: 'Fluxo em 7 passos',
            items: [
              'Selecione: descarte fotos tremidas, olhos fechados e repetidas. Entregue só as melhores (geralmente 20% a 30%).',
              'Corte e endireite: linhas verticais retas (colunas, altar) e proporção 4:5 para o feed.',
              'Luz: Exposição para acertar o geral; Realces para baixo (recupera janelas e toalhas do altar); Sombras para cima.',
              'Cor: Temperatura para tirar o excesso de amarelo; cuidado com o tom de pele (no Lightroom, Matiz/Saturação do laranja).',
              'Presença: Textura e Clareza leves (+5 a +15). Vibração no lugar da Saturação.',
              'Ruído: Redução de ruído de 15 a 30 em fotos noturnas. Exagero deixa a pele “de plástico”.',
              'Exporte: JPEG, lado maior com 2048 px para redes, ou resolução total para o arquivo da paróquia.',
            ],
          },
          {
            t: 'table',
            title: 'Predefinição “PASCOM” (ponto de partida no Lightroom)',
            head: ['Ajuste', 'Valor'],
            rows: [
              ['Temperatura', '−5 a −10 (em luz amarela)'],
              ['Realces', '−40'],
              ['Sombras', '+30'],
              ['Brancos / Pretos', '+10 / −10'],
              ['Textura / Clareza', '+10 / +8'],
              ['Vibração', '+12'],
              ['Laranja (Saturação)', '−5 (pele natural)'],
              ['Vinheta', '−10 (discreta)'],
            ],
          },
          { t: 'callout', tone: 'info', title: 'Salve como predefinição', text: 'No Lightroom, depois de ajustar uma foto: “…” › Criar predefinição › “PASCOM”. Compartilhe o arquivo com a equipe para todos terem o mesmo estilo.' },
        ],
      },
      {
        id: 'videos',
        title: 'Editando vídeos (CapCut, InShot, VN)',
        minutes: 10,
        blocks: [
          {
            t: 'steps',
            title: 'Reels de 30 a 60 segundos',
            items: [
              'Escolha uma frase da homilia ou da leitura do dia: ela é o tema do vídeo.',
              'Monte a sequência: abertura forte (2 s) › planos gerais › momento principal › detalhes › fechamento com a frase.',
              'Corte no ritmo da música; planos de 1,5 a 3 segundos.',
              'Legendas automáticas, revisadas (nomes e termos litúrgicos costumam sair errados).',
              'Cor: aplique o mesmo ajuste em todos os clipes; tire o amarelo excessivo.',
              'Áudio: voz por cima da música, música entre −18 e −25 dB quando houver fala.',
              'Exporte em 1080 × 1920, 30 fps, taxa de bits alta. Confira em tela cheia antes de publicar.',
            ],
          },
          {
            t: 'dodont',
            do: [
              'Usar músicas da biblioteca do próprio app/plataforma ou livres de direitos.',
              'Colocar o logotipo da paróquia de forma discreta, sempre no mesmo canto.',
              'Guardar o projeto e os arquivos originais na pasta da celebração.',
            ],
            dont: [
              'Efeitos exagerados (zoom tremido, glitch) em momentos litúrgicos.',
              'Músicas seculares com letra inadequada.',
              'Cortar no meio de uma frase da homilia ou da Palavra.',
            ],
          },
          { t: 'p', text: 'Para projetos maiores (retrospectivas, Natal, festas), o DaVinci Resolve é gratuito no computador e muito mais completo.' },
        ],
      },
      {
        id: 'artes',
        title: 'Artes e identidade visual',
        minutes: 5,
        blocks: [
          {
            t: 'list',
            items: [
              'Use os modelos da paróquia no Canva (crie uma “Equipe” e compartilhe a pasta de modelos).',
              'No máximo 2 fontes e a paleta oficial. Texto curto: data, horário, local.',
              'Contraste: texto claro sobre foto escura (ou com faixa), nunca texto sobre áreas cheias de detalhe.',
              'Revise datas, horários e nomes com outra pessoa antes de publicar. Erro em arte de aviso gera confusão real.',
              'Tamanhos: post 1080 × 1350, stories 1080 × 1920, capa do YouTube 1280 × 720.',
            ],
          },
        ],
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  {
    id: 'redes',
    title: 'Stories, redes e arquivos',
    subtitle: 'Publicação ao vivo, legendas e organização do acervo',
    icon: 'Share2',
    color: '#FF8BD1',
    level: 'Básico',
    lessons: [
      {
        id: 'stories',
        title: 'Stories durante a celebração',
        minutes: 6,
        blocks: [
          {
            t: 'steps',
            title: 'Sequência sugerida',
            items: [
              'Antes: arte de “Hoje tem” com horário, mais a fachada ou a igreja se enchendo.',
              'Entrada: procissão de entrada (vídeo curto de até 10 s).',
              'Palavra: foto do ambão mais o texto curto da leitura ou a referência (ex.: Lc 15,1-10).',
              'Homilia: uma frase marcante em texto sobre foto do padre.',
              'Depois da missa: “Obrigado por rezar conosco” e o próximo horário.',
            ],
          },
          { t: 'callout', tone: 'warn', title: 'Não poste a Consagração ao vivo', text: 'Para não usar o celular no momento mais sagrado da missa, deixe o registro da Consagração para depois, e somente se a foto foi feita de forma discreta e combinada.' },
        ],
      },
      {
        id: 'arquivos',
        title: 'Organização e backup',
        minutes: 6,
        blocks: [
          {
            t: 'table',
            title: 'Estrutura de pastas (Google Drive / disco da paróquia)',
            head: ['Pasta', 'Conteúdo'],
            rows: [
              ['2026-10-31_Missa-da-Vigilia/', 'Pasta da celebração: data primeiro, para ordenar sozinha'],
              ['  01_Brutos/', 'Tudo como saiu do aparelho, separado por pessoa (Ana, Lucas…)'],
              ['  02_Selecionadas/', 'As melhores, antes de editar'],
              ['  03_Editadas/', 'Prontas para publicar'],
              ['  04_Video/', 'Projeto de edição, clipes e vídeo final'],
            ],
          },
          {
            t: 'list',
            title: 'Regras',
            items: [
              'Regra do backup 3-2-1: 3 cópias, em 2 lugares diferentes, 1 fora da igreja (nuvem).',
              'Descarregue o material no mesmo dia; não deixe só no celular.',
              'Prazos: stories ao vivo; fotos editadas em até 24 h; vídeo em até 3 dias.',
              'Marque no MídiaFlow (Eventos › checklist) quando cada etapa estiver pronta.',
            ],
          },
        ],
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  {
    id: 'avaliacao',
    title: 'Avaliação final',
    subtitle: 'Teste o que aprendeu e receba o certificado',
    icon: 'Award',
    color: '#A6FF5B',
    level: 'Básico',
    lessons: [
      {
        id: 'quiz',
        title: 'Questionário',
        minutes: 6,
        blocks: [
          {
            t: 'quiz',
            questions: [
              { q: 'Durante a Consagração, o fotógrafo deve:', options: ['Aproximar-se do altar para a melhor foto', 'Ficar parado e em silêncio; registrar só do lugar combinado, sem flash', 'Usar flash rapidamente', 'Subir ao presbitério pela lateral'], answer: 1, explain: 'É o momento mais sagrado da missa: não se mova, sem som e sem flash.' },
              { q: 'Qual velocidade evita faixas escuras sob lâmpadas LED no Brasil?', options: ['1/125 s', '1/100 s', '1/120 s', '1/1000 s'], answer: 2, explain: 'A rede de 60 Hz faz as lâmpadas piscarem 120 vezes por segundo; 1/120 s acompanha esse ciclo.' },
              { q: 'Por que desativar o Vídeo HDR no iPhone (ou HDR10+ no Samsung)?', options: ['Porque grava sem som', 'Porque as cores ficam lavadas ou estouradas em redes e editores simples', 'Porque é proibido na igreja', 'Porque reduz a resolução'], answer: 1, explain: 'O HDR é ótimo em telas compatíveis, mas causa problemas de cor no Instagram, no WhatsApp e em edições simples.' },
              { q: 'A 30 fps, qual é a velocidade de obturador ideal (regra dos 180°)?', options: ['1/30 s', '1/60 s', '1/250 s', '1/1000 s'], answer: 1, explain: 'O dobro do número de quadros: 30 fps → 1/60 s.' },
              { q: 'Para fotografar uma criança na Primeira Eucaristia e publicar, é preciso:', options: ['Nada, pois a missa é pública', 'Autorização dos responsáveis', 'Apenas marcar a família', 'Desfocar o padre'], answer: 1, explain: 'Imagem de criança exige autorização dos responsáveis (LGPD e cuidado pastoral).' },
              { q: 'Num celular Android antigo sem modo manual, o melhor app para controlar ISO e velocidade é:', options: ['Open Camera', 'Modo beleza', 'Zoom digital', 'Filtro preto e branco'], answer: 0, explain: 'O Open Camera é gratuito e permite travar ISO, velocidade, foco e balanço de branco.' },
              { q: 'Ordem correta na edição de fotos:', options: ['Filtro › exportar › cortar', 'Selecionar › cortar/endireitar › luz › cor › nitidez/ruído › exportar', 'Cor › selecionar › cortar', 'Exportar › editar'], answer: 1, explain: 'Selecionar primeiro economiza tempo; depois corte, luz, cor e acabamento.' },
              { q: 'O que é a regra do backup 3-2-1?', options: ['3 fotos por momento, 2 vídeos, 1 story', '3 cópias, 2 lugares diferentes, 1 fora da igreja', '3 pessoas, 2 câmeras, 1 celular', 'Publicar 3 vezes ao dia'], answer: 1, explain: 'Três cópias em dois lugares, sendo uma fora (nuvem): assim nada se perde.' },
            ],
          },
        ],
      },
    ],
  },
];

/* ------------------------------------------------------------------ */
/* Mapa de posições                                                    */
/* ------------------------------------------------------------------ */
export interface ChurchSpot {
  id: string;
  n: number;
  name: string;
  x: number;
  y: number;
  /** direção do olhar em graus (0 = para cima, em direção ao altar) */
  dir: number;
  access: 'livre' | 'discreto' | 'autorizado';
  moments: string;
  lens: string;
  shots: string[];
  care: string[];
}

export const SPOTS: ChurchSpot[] = [
  {
    id: 'fundo', n: 1, name: 'Fundo do corredor central', x: 220, y: 560, dir: 0, access: 'livre',
    moments: 'Procissão de entrada, visão geral, bênção final',
    lens: 'Celular 1x ou 0,5x · câmera 24–70 mm',
    shots: ['Plano geral simétrico da igreja inteira com o altar ao centro', 'Procissão de entrada de costas, entrando na nave', 'Assembleia de pé na bênção final'],
    care: ['Fique encostado à parede ou atrás do último banco, nunca no meio do corredor', 'Use o celular na vertical e na horizontal: os stories pedem vertical'],
  },
  {
    id: 'lateral-ambao', n: 2, name: 'Transepto esquerdo, perto do ambão', x: 78, y: 272, dir: 40, access: 'discreto',
    moments: 'Liturgia da Palavra, salmo, homilia',
    lens: 'Celular 2x–3x · câmera 70–200 mm',
    shots: ['Leitor no ambão de perfil, com a Bíblia', 'Padre na homilia em 3/4 (um pouco de lado)', 'Salmista e o ministério de música'],
    care: ['Vá para lá antes da Liturgia da Palavra começar, nunca durante a leitura', 'Agachado ou sentado na ponta do banco, para não tapar ninguém'],
  },
  {
    id: 'lateral-direita', n: 3, name: 'Transepto direito, ao lado do presbitério', x: 362, y: 272, dir: -40, access: 'discreto',
    moments: 'Ofertório, Oração Eucarística, Comunhão',
    lens: 'Celular 2x · câmera 70–200 mm ou 85 mm',
    shots: ['Apresentação das oferendas (pão e vinho)', 'Elevação da hóstia ou do cálice de lado, de longe, se foi combinado', 'Ministros distribuindo a comunhão'],
    care: ['Posição da Consagração: chegue antes do Santo e não se mova até o fim da elevação', 'Sem som e sem flash; se não houver autorização, só observe'],
  },
  {
    id: 'presbiterio', n: 4, name: 'Presbitério (área do altar)', x: 272, y: 180, dir: 180, access: 'autorizado',
    moments: 'Somente quando o padre autorizar (ex.: casamentos, ordenações)',
    lens: 'Celular 1x · câmera 35–50 mm',
    shots: ['Detalhes do altar antes da missa (cálice, missal, flores)', 'Visão do padre para a assembleia, antes ou depois da celebração'],
    care: ['Nunca durante a missa sem autorização expressa', 'Prefira registrar detalhes do altar ANTES da celebração começar', 'Ao passar diante do sacrário, faça a genuflexão; nunca dê as costas para fotografar o sacrário de perto'],
  },
  {
    id: 'comunhao', n: 5, name: 'Fila da comunhão (corredor lateral)', x: 116, y: 420, dir: 15, access: 'discreto',
    moments: 'Comunhão',
    lens: 'Celular 1x–2x · câmera 50 mm',
    shots: ['Fila de fiéis de lado, sem identificar rostos', 'Mãos recebendo a Eucaristia (de longe e discretamente)'],
    care: ['Nunca fotografe de frente quem está comungando, a centímetros da pessoa', 'Se for comungar, guarde o equipamento antes'],
  },
  {
    id: 'coro', n: 6, name: 'Coro / mezanino (alto)', x: 220, y: 632, dir: 0, access: 'livre',
    moments: 'Celebrações cheias, festas, Natal e Páscoa',
    lens: 'Celular 0,5x–1x · câmera 16–35 mm',
    shots: ['Igreja cheia vista de cima', 'Procissão com velas na Vigília Pascal', 'Ministério de música, se ele ficar no coro'],
    care: ['Cuidado com o guarda-corpo; prenda bem a alça do celular/câmera', 'Ótimo lugar para a câmera fixa da transmissão'],
  },
  {
    id: 'porta', n: 7, name: 'Porta principal (de fora para dentro)', x: 220, y: 702, dir: 0, access: 'livre',
    moments: 'Acolhida, chegada dos fiéis, saída do casamento',
    lens: 'Celular 1x · câmera 24–35 mm',
    shots: ['Pessoas chegando, acolhida dos ministros', 'Fachada com o céu ao entardecer (antes da missa)', 'Saída da procissão para a rua'],
    care: ['Não bloqueie a passagem; fique de um dos lados da porta'],
  },
  {
    id: 'sacristia', n: 8, name: 'Sacristia / bastidores', x: 356, y: 155, dir: -90, access: 'autorizado',
    moments: 'Antes da celebração',
    lens: 'Celular 1x · câmera 35–50 mm',
    shots: ['Coroinhas e ministros se preparando', 'Detalhes das vestes litúrgicas', 'Oração da equipe antes da missa'],
    care: ['Peça licença; é um espaço de preparação e oração', 'Bastidores ficam ótimos nos stories e mostram quem serve'],
  },
];

export const MASS_MOMENTS: { name: string; what: string; where: string; flag?: 'silencio' }[] = [
  { name: 'Antes da missa', what: 'Fachada, igreja se enchendo, altar preparado, bastidores', where: 'Posições 7, 8 e 4 (com licença)' },
  { name: 'Procissão de entrada', what: 'Cruz processional, coroinhas, padre entrando', where: 'Posição 1 (de costas) ou 2 e 3 (de lado)' },
  { name: 'Ato penitencial e Glória', what: 'Assembleia rezando, ministério de música', where: 'Posições 1 e 6' },
  { name: 'Liturgia da Palavra', what: 'Leitores, salmista, Evangelho proclamado', where: 'Posição 2' },
  { name: 'Homilia', what: 'Padre em 3/4, assembleia ouvindo', where: 'Posições 2 e 3' },
  { name: 'Ofertório', what: 'Procissão das oferendas, pão e vinho', where: 'Posição 3 ou 1' },
  { name: 'Oração Eucarística / Consagração', what: 'Somente se combinado: elevação, de longe e de lado', where: 'Posição 3, sem se mover', flag: 'silencio' },
  { name: 'Pai-Nosso e Paz', what: 'Mãos dadas, abraço da paz (de longe)', where: 'Posições 1 e 6' },
  { name: 'Comunhão', what: 'Fila e ministros, sem identificar quem comunga', where: 'Posição 5' },
  { name: 'Bênção final e envio', what: 'Padre abençoando, assembleia de pé, saída', where: 'Posições 1 e 7' },
];

export const totalLessons = MODULES.reduce((a, m) => a + m.lessons.length, 0);
