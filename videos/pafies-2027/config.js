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
    crescimento: 11.5,
    conquista: 18.0,
    decima: 23.2,
    revelacao: 29.1,
    marco: 32.0,
    convite: 42.7,
    final: 51.6,
  },

  // Legendas na parte de baixo (boas para quem assiste sem som no celular).
  legendas: true,
  // Cada fala: início e fim em segundos, e o texto.
  falas: [
    [1.58, 5.85, "Tudo começou em 2017… com um pequeno grupo de jovens"],
    [5.9, 8.2, "e um grande desejo no coração:"],
    [8.38, 11.2, "fazer a diferença na vida de outras pessoas."],
    [11.54, 13.88, "O que começou pequeno foi crescendo,"],
    [13.9, 17.8, "reunindo pessoas e transformando solidariedade em ação."],
    [18.03, 19.28, "Ao longo dessa caminhada,"],
    [19.3, 23.1, "já conseguimos arrecadar mais de 50 mil alimentos!"],
    [23.26, 25.58, "Hoje, depois de nove edições,"],
    [25.6, 28.48, "estamos prestes a viver algo ainda maior:"],
    [28.5, 31.8, "a nossa décima Gincana Solidária PAFIES!"],
    [31.97, 34.5, "E essa não é apenas mais uma edição."],
    [34.54, 36.24, "É um marco na nossa história,"],
    [36.26, 40.22, "um momento especial que representa tudo o que construímos juntos…"],
    [40.26, 42.6, "e tudo o que ainda podemos realizar."],
    [42.77, 45.2, "E você? Quer fazer parte dessa história?"],
    [45.34, 47.3, "Venha viver esse momento com a gente."],
    [47.34, 51.6, "Nossa décima Gincana Solidária PAFIES está chegando!"],
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
    alimentosRotulo: "alimentos arrecadados",
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
