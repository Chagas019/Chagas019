// Tudo o que aparece no vídeo está aqui: textos, números, datas, fotos, áudio e tempos.
// Mude o que quiser, salve e recarregue o index.html (ou rode o render.mjs de novo).
window.PAFIES = {
  // Duração total em segundos (o fim do vídeo).
  duracao: 58,

  audio: {
    // Troque por uma gravação de locutora humana com o mesmo nome, se preferir.
    narracao: "audio/narracao.mp3",
    // Segundo do vídeo em que a narração começa.
    narracaoInicio: 1.5,
    trilha: "audio/trilha.wav",
    // Volume da trilha quando a voz está falando e nos respiros entre as falas.
    trilhaSobVoz: 0.16,
    trilhaNasPausas: 0.42,
  },

  // Início (em segundos) de cada cena. Ajuste se trocar a narração.
  cenas: {
    comeco: 0,
    crescimento: 11.1,
    conquista: 17.3,
    alimentosFim: 21.4, // o contador chega ao total junto com "50 mil"
    decima: 23.2,
    revelacao: 29.0,
    marco: 31.8,
    convite: 42.3,
    final: 50.8,
  },

  // Legendas na parte de baixo (boas para quem assiste sem som no celular).
  legendas: true,
  // Cada fala: início e fim em segundos, e o texto.
  falas: [
    [1.58, 5.66, "Tudo começou em 2017… com um pequeno grupo de jovens"],
    [5.7, 7.9, "e um grande desejo no coração:"],
    [8.0, 10.7, "fazer a diferença na vida de outras pessoas."],
    [11.14, 13.42, "O que começou pequeno foi crescendo,"],
    [13.5, 17.2, "reunindo pessoas e transformando solidariedade em ação."],
    [17.34, 18.7, "Ao longo dessa caminhada,"],
    [18.74, 22.9, "já conseguimos arrecadar mais de 50 mil toneladas de alimentos!"],
    [23.26, 25.58, "Hoje, depois de nove edições,"],
    [25.66, 28.38, "estamos prestes a viver algo ainda maior:"],
    [28.42, 31.7, "a nossa décima Gincana Solidária PAFIES!"],
    [31.81, 34.1, "E essa não é apenas mais uma edição."],
    [34.22, 35.9, "É um marco na nossa história,"],
    [35.98, 39.82, "um momento especial que representa tudo o que construímos juntos…"],
    [39.86, 42.2, "e tudo o que ainda podemos realizar."],
    [42.3, 44.65, "E você? Quer fazer parte dessa história?"],
    [44.78, 46.6, "Venha viver esse momento com a gente."],
    [46.7, 50.8, "Nossa décima Gincana Solidária PAFIES está chegando!"],
  ],

  textos: {
    anoInicio: "2017",
    comecoTitulo: "O COMEÇO",
    comecoFrase: "Tudo começou com um pequeno grupo de jovens",
    crescimentoTitulo: "UMA HISTÓRIA QUE CRESCEU",
    edicoesRealizadas: 9,
    edicoesRotulo: "edições realizadas",
    alimentos: 50000,
    alimentosPrefixo: "+",
    alimentosRotulo: "toneladas de alimentos arrecadadas",
    edicaoNumero: 10,
    edicaoNome: "GINCANA SOLIDÁRIA",
    marca: "PAFIES",
    ano: "2027",
    calendarioTitulo: "PRÓXIMA EDIÇÃO",
    calendarioFrase: "Uma história de solidariedade continua",
    finalTitulo: "Faça parte dessa história.",
    finalInscricoes: "Inscrições abertas — link na bio.",
  },

  // Fotos reais das edições anteriores (coloque os arquivos na pasta fotos/).
  // Enquanto um arquivo não existir, o cartão mostra uma textura no lugar.
  fotos: [
    { arquivo: "fotos/foto-01.jpg", legenda: "1ª edição" },
    { arquivo: "fotos/foto-02.jpg", legenda: "2ª edição" },
    { arquivo: "fotos/foto-03.jpg", legenda: "3ª edição" },
    { arquivo: "fotos/foto-04.jpg", legenda: "4ª edição" },
    { arquivo: "fotos/foto-05.jpg", legenda: "5ª edição" },
    { arquivo: "fotos/foto-06.jpg", legenda: "6ª edição" },
    { arquivo: "fotos/foto-07.jpg", legenda: "7ª edição" },
    { arquivo: "fotos/foto-08.jpg", legenda: "8ª edição" },
    { arquivo: "fotos/foto-09.jpg", legenda: "9ª edição" },
  ],

  // Formas 3D de cromo iridescente que flutuam no fundo.
  // forma: anel, fitas, brilho, estrela, moldura ou torcido
  // de/ate: segundos em que aparece; x, y: posição a partir do centro da tela; z: profundidade (negativo = mais longe)
  // tam: tamanho em px; incl: inclinação [x, y, z] em radianos; giro: voltas a cada 10 s; doCentro: nasce do centro
  elementos: [
    { forma: "brilho", de: 2.2, ate: 11.8, x: 600, y: -250, z: -220, tam: 300, incl: [0.3, 0, 0.25], giro: 1.0 },
    { forma: "anel", de: 4.0, ate: 18.4, x: -660, y: 270, z: -320, tam: 260, incl: [1.05, 0, 0.45], giro: 0.8 },
    { forma: "fitas", de: 12.2, ate: 18.6, x: 830, y: -40, z: -60, tam: 300, incl: [0.15, 0, 0], giro: 0.7 },
    { forma: "torcido", de: 18.4, ate: 23.2, x: -800, y: -320, z: -160, tam: 300, incl: [0.9, 0, 0.3], giro: 0.9 },
    { forma: "moldura", de: 23.3, ate: 29.0, x: 0, y: 0, z: -260, tam: 1300, incl: [0.22, 0, 0], giro: 0.3 },
    { forma: "estrela", de: 29.3, ate: 43.0, x: -770, y: -300, z: -140, tam: 270, incl: [0.25, 0, 0.3], giro: 0.8, doCentro: true },
    { forma: "brilho", de: 29.45, ate: 43.0, x: 770, y: 290, z: -120, tam: 260, incl: [0.4, 0, -0.2], giro: 1.1, doCentro: true },
    { forma: "anel", de: 29.6, ate: 43.0, x: 760, y: -330, z: -280, tam: 230, incl: [0.7, 0, -0.5], giro: 0.7, doCentro: true },
    { forma: "estrela", de: 51.2, ate: 58, x: -640, y: 250, z: -60, tam: 220, incl: [0.3, 0, -0.25], giro: 0.9 },
    { forma: "brilho", de: 51.5, ate: 58, x: 660, y: -280, z: -120, tam: 220, incl: [0.4, 0, -0.2], giro: 1.1 },
  ],

  // Ícones 3D que "explodem" na cena do convite (blocos azuis com espessura).
  // icone: coracao, maos, cesta, pessoas, play, compartilhar, chat, estrela, link ou um texto curto (ex.: "10ª")
  // claro: bloco em azul claro; x, y, z: onde o bloco para; tam: lado em px
  icones: {
    de: 42.5,        // quando a explosão começa
    ate: 55.0,       // quando terminam de sumir
    origem: [0, 620], // de onde saem (embaixo, no centro)
    lista: [
      { icone: "chat", x: -820, y: -320, z: -120, tam: 150 },
      { icone: "pessoas", x: -650, y: -110, z: 40, tam: 190 },
      { icone: "cesta", x: -860, y: 140, z: -200, tam: 160, claro: true },
      { icone: "coracao", x: -690, y: 390, z: 60, tam: 180 },
      { icone: "play", x: -430, y: -420, z: -260, tam: 150, claro: true },
      { icone: "estrela", x: 430, y: -430, z: -260, tam: 140 },
      { icone: "maos", x: 660, y: -150, z: 30, tam: 190, claro: true },
      { icone: "link", x: 860, y: -350, z: -160, tam: 150 },
      { icone: "compartilhar", x: 850, y: 120, z: -60, tam: 160 },
      { icone: "10ª", x: 690, y: 400, z: 70, tam: 190, claro: true },
    ],
  },

  cores: {
    fundo: "#01040d",
    painel: "#0d0f10",
    azul: "#2f7bff",
    azulClaro: "#8cc8ff",
    ciano: "#27c4f5",
    laranja: "#4da3ff",
    branco: "#f4f6f5",
  },
};
