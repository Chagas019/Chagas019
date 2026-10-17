# SOMOS CHAMADOS A ALGO MAIOR

*Uma história sobre vocação, comunicação e missão.*

Documentário cinematográfico vertical (1080×1920, 30 fps, MP4) sobre o chamado da Pastoral da
Comunicação, feito em **React + TypeScript + Remotion**. A mensagem: fotografar na Igreja vai além
de registrar momentos — é servir, testemunhar a fé e evangelizar. A câmera é ferramenta, o dom é
responsabilidade, a comunicação é missão e Cristo é o centro.

## O que já está pronto

| Parte | Estado |
|---|---|
| Montagem em 5 atos (Silêncio, Chamado, Algo Maior, Missão, Envio), 2 min 39 s | pronta |
| Motion design: tipografia autoral, máscaras, transições por luminosidade, câmera simulada | pronto |
| Acabamento de película (para não parecer "gerado"): grão de 35 mm, trepidação do projetor, poeira e fios, vazamentos de luz, suavidade óptica, exposição que respira | pronto |
| Trilha original (piano, cordas, tímpanos) com pausa antes do clímax e clímax em 0:55,7 | composta por código, sem licenças de terceiros |
| Sound design: ambiente de igreja, passos, porta, zíper, anel de foco, obturador sincronizado com os cortes | sintetizado |
| Legendas da narração (queimadas no vídeo e em `.srt`) | prontas |
| Busca e download de vídeos reais (Pexels, Pixabay, Wikimedia, Internet Archive) com manifesto de licenças | script pronto; **ainda sem vídeos baixados** (ver abaixo) |
| Narração em voz | **roteiro de gravação pronto**; o áudio precisa ser gravado |
| Formatos extras: 16:9 (telões/YouTube) e 4:5 (feed) | compostos; mesma montagem |

Enquanto um plano não tem filmagem real, ele usa uma **placa procedural** desenhada em SVG com a
mesma função narrativa (vitral com feixes de luz, porta se abrindo, lente com diafragma e anel de
foco, visor da câmera com rack focus, velas, comunidade em silhueta, procissão, feed de curtidas que
se apagam, nave com a cruz ao centro). O filme já se sustenta assim. Cada vídeo baixado substitui a
placa do seu plano automaticamente.

## Como usar

Requisitos: Node 18+, ffmpeg; para refazer a trilha, Python 3 com `numpy` e `scipy`.

```bash
npm install
npm run studio                 # pré-visualização interativa no navegador
npm run render                 # out/somos-chamados-a-algo-maior-9x16.mp4
npm run render:16x9            # versão para telões
```

Se o Remotion não conseguir baixar o Chrome Headless Shell (rede restrita), aponte para um Chromium
instalado: `REMOTION_BROWSER=/caminho/para/headless_shell npm run render`.

### 1. Vídeos reais

```bash
cp .env.example .env           # preencha PEXELS_API_KEY e PIXABAY_API_KEY (gratuitas)
npm run media:search           # só pesquisa: grava metadata/candidates.json para revisão
npm run media:fetch            # escolhe e baixa um clipe por plano, verifica com ffprobe
npm run assets:scan            # a composição passa a usar os arquivos baixados
```

- Chaves: [Pexels API](https://www.pexels.com/api/) e [Pixabay API](https://pixabay.com/api/docs/).
  Ficam só no `.env` (ignorado pelo git) e são usadas apenas pelo script local, nunca no vídeo.
- Wikimedia Commons e Internet Archive não precisam de chave. Do Commons só entram licenças livres
  (CC0, domínio público, CC BY, CC BY-SA); o Internet Archive só lista candidatos, a não ser que você
  passe `--include-archive`.
- Unsplash não oferece vídeos pela API, por isso não está na rotina.
- Cada plano tem suas buscas em `src/data/timeline.json` (`queries`). O script dá preferência a
  clipes verticais, ≥1080 px, longos o bastante para o plano e, onde há câmera lenta, gravados a 50+ fps.
- `--replace=w-hit` troca o clipe de um plano; `--only=o-door,o-glass` restringe a busca.
- Tudo o que foi baixado fica em `public/assets/metadata/media-manifest.json` (arquivo, plataforma,
  URL original, autor, licença, resolução, duração, cena, observações) e em `sources.md`.
- Há uma lista de candidatos achados por busca na web, para download manual, em
  `docs/candidatos-manuais.md`.

O ideal, para uma PASCOM, é **misturar** banco de imagens com filmagens da própria paróquia (a
procissão, a equipe trabalhando, a comunidade real). Basta colocar o arquivo na pasta do ato e
registrá-lo no manifesto (instruções no mesmo documento).

### 2. Narração

O roteiro com pausas, ênfases e indicações de interpretação está em `docs/roteiro-narracao.md`.
Grave cada fala como `n01.wav`…`n33.wav` (ou o filme inteiro como `full.wav`) em
`public/assets/audio/narration/`, rode `npm run assets:scan` e renderize. A música recua sob a
voz sozinha. Se uma fala ficar mais longa, ajuste o `end` dela em `timeline.json` em vez de acelerar.

### 3. Trilha e efeitos

```bash
npm run audio:compose          # refaz score.mp3, church-ambience.mp3 e foley.mp3
```

Os eventos (clímax, pausa musical, cliques de câmera, passos, porta) vêm de `timeline.json`. Mudou
um tempo lá, rode de novo e o som acompanha.

## Tipografia

Todas com licença livre (SIL OFL), instaladas pelo npm via Fontsource. Nada é baixado na hora do render.

| Uso | Fonte | Por quê |
|---|---|---|
| Frase principal e PASCOM | **Instrument Serif** (normal e itálico) | serifa de alto contraste, de cartaz de cinema contemporâneo |
| Afirmações ("Mas não se tratava…", "Maior do que curtidas…") | **Fraunces Light** | serifa editorial com desenho de livro impresso; a segunda linha em itálico dourado responde à primeira |
| Frases íntimas ("Às vezes, tudo começa com um olhar.", "Transformar dons em missão.") | **Homemade Apple** | letra de mão, como a anotação de quem fotografa, escrita na tela num ritmo irregular |
| Cartelas de capítulo e dados da câmera | **IBM Plex Mono** | linguagem de documentário, datilografada letra a letra |
| Legendas | **Instrument Sans** | legível no celular |

## Linha do tempo

| Tempo | Ato | O que acontece |
|---|---|---|
| 0:00 | O Silêncio | Tela preta, ambiente nasce, passos, a porta se abre, luz nos vitrais, a câmera sai da bolsa, a lente ganha foco. "Mas não se tratava apenas de fotografar." A imagem respira. |
| 0:26 | O Chamado | Pessoas entram, o fotógrafo acompanha a Missa, a equipe se prepara, jovens rezam, a comunidade se encontra. A música cresce. |
| 0:54,4 | — | A música para e a imagem quase apaga. |
| 0:55,7 | Algo Maior | Clarão e tutti: **SOMOS CHAMADOS A ALGO MAIOR.** Cortes secos no pulso, curtidas e números se apagam, adoração, o clique no abraço, procissão. |
| 1:29,5 | A Missão | A música desacelera. Quem estava atrás da câmera, as horas de edição, o acolhimento, a esperança, Cristo ao centro. |
| 2:07 | — | Silêncio de narração. Sobre a igreja iluminada: "Talvez a única Igreja / que alguém veja esta semana / *seja a que você mostrou.*" |
| 2:13,5 | O Envio | A câmera se afasta da nave, a tela escurece. "SOMOS CHAMADOS A ALGO MAIOR." → "Somos chamados a levar *o amor de Cristo* através da comunicação." → "SOMOS CHAMADOS A SER PÁSCOA." → **PASCOM** — *Comunicar para evangelizar.* O som da igreja some. |

A duração (2 min 39 s) é maior que os 90–120 s pensados no início porque segue o ritmo natural da
narração completa, sem comprimir as falas. Para um corte de 90 s, o caminho é encurtar o texto do
Ato 4 em `timeline.json` (falas, planos e títulos), não acelerar a voz.

## Estrutura

```
src/
  data/timeline.json            fonte única de sincronia (atos, planos, falas, títulos, sons)
  data/assets.generated.json    gerado por assets:scan (o que existe em disco)
  compositions/PascomCallingDocumentary.tsx
  scenes/                       Opening, Calling, Worship, Mission, Ending (um por ato)
  components/
    CinematicScene.tsx          um plano: filmagem gradada ou placa, câmera simulada, entrada
    VideoSequence.tsx           monta os planos de um ato com dissolves e cortes secos
    CinematicText.tsx           frases na tela (sussurro, afirmação, herói, assinatura)
    Subtitles.tsx               legendas da narração
    FilmTransition.tsx          clarões de obturador, respiração antes do clímax, granulação, vinheta
    SoundDesign.tsx             trilha, ambiente, foley, narração com ducking
    plates/                     placas procedurais por tipo de plano
public/
  assets/footage/{opening,calling,worship,mission,ending}/
  assets/audio/{music,ambience,sfx,narration}/
  assets/images/                texturas de granulação
  assets/metadata/              media-manifest.json, sources.md
  subtitles/pascom-calling-pt-BR.srt
scripts/
  fetch-media.mjs  scan-assets.mjs  build-subtitles.mjs  compose-audio.py  make-grain.py
docs/
  roteiro-narracao.md  candidatos-manuais.md
```

## Publicação

- **Reels / Shorts / Stories:** use o MP4 9:16. As legendas ficam acima da faixa ocupada pela
  interface dos aplicativos. Para publicar sem legendas queimadas: `showCaptions: false` nas
  props (`npx remotion render PascomCallingDocumentary out/sem-legenda.mp4 --props='{"showCaptions":false,"musicVolume":0.9}'`)
  e envie o `.srt`.
- **Telões:** `npm run render:16x9`.
- Se usar vídeos com licença que exige atribuição (CC BY / CC BY-SA), coloque os créditos de
  `sources.md` na descrição da publicação.
