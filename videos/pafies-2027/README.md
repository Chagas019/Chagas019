# Vídeo — 10ª Gincana Solidária PAFIES 2027

Vídeo de 73,5 segundos (8 s de abertura + 65,5 s de documentário), 16:9, 30 quadros/s, com narração feminina em português do Brasil, trilha instrumental, fundo em degradê preto → azul, painéis 3D animados inspirados nos widgets de referência (cartões escuros com cantos arredondados, gráficos de barras, anéis de progresso, galeria flutuante e linhas de conexão) e formas 3D de cromo iridescente flutuando ao fundo.

- `pafies-2027-1080p.mp4`: o vídeo final (1920 × 1080)
- `index.html`: o vídeo em código. Abra no navegador e clique em **Assistir** (espaço também funciona). A barra permite ir a qualquer segundo.
- `config.js`: **todos os textos, números, datas, fotos, tempos, cores e formas de cromo**. Edite aqui e renderize de novo.
- `abertura.js`: a abertura com o emblema PAFIES sobre o tecido roxo (composição reutilizável; ajustes em `abertura` no `config.js`).
- `cromo.js`: as formas de cromo iridescente (anel, fitas cruzadas, brilho de 8 pontas, estrela, moldura ondulada e anel torcido), desenhadas em 3D de verdade por um shader WebGL.

## Fonte

Títulos, números grandes, a marca "10ª PAFIES" e o encerramento usam a **Montserrat Alternates** (geométrica, pesada, com o "a" de um bojo só), guardada em `fontes/` com a licença livre OFL. Rótulos pequenos e legendas seguem na Inter, que é mais legível em tamanho pequeno.

## Abertura (0–8 s)

Feita a partir da foto original do emblema (`abertura/pafies-emblema.png`). A logo **não é redesenhada**: a própria foto é o "set" filmado, e o movimento vem de uma câmera virtual (aproximação, deslize pelas dobras e inclinação de perspectiva que simula uma órbita curta), com luz, reflexos e sombras em camadas presas à foto. Como a foto é vertical, o tecido continua para os lados com cópias espelhadas da própria foto, mais escuras e desfocadas.

| Tempo | Na tela | No som |
|---|---|---|
| 0–2 s | Tela escura; uma luz violeta revela o tecido de perto, com foco se ajustando e um feixe de luz passando pelas fibras | Som ambiente grave e sutil, em Dó (o tom do piano que vem depois) |
| 2–4 s | A câmera desliza pelas dobras até o emblema, que sai da sombra; um brilho delicado percorre a borda cromada | Três toques metálicos suaves e o ambiente crescendo |
| 4–6 s | Emblema centralizado; no impacto (4,6 s) um reflexo forte atravessa a borda e o esmalte, o tecido escurece em volta e entra "10ª GINCANA SOLIDÁRIA PAFIES · 2027" | Subida até o impacto, com grave encorpado e reflexo metálico |
| 6–8 s | A câmera mergulha no azul do emblema até ele encher a tela; um reflexo metálico atravessa a tela e o azul se dissolve no degradê azul da primeira cena | Sopro de transição; o ambiente segue até a voz entrar ("Tudo começou em 2017…") |

Ajustes em `config.js` → `abertura`: duração, posição do emblema na foto, ponto do mergulho, segundo do impacto e textos. Todos os outros tempos do `config.js` continuam contando a partir do início do documentário, então trocar a duração da abertura não desalinha nada (a trilha usa `ABERTURA` e `IMPACTO` no `trilha.py`).

## Roteiro e cenas

| Tempo | Cena | Na tela |
|---|---|---|
| 0–11 s | O começo (2017) | Tela escura, painel "2017" surge devagar; duas fotografias antigas (em sépia) aparecem atrás |
| 11–18 s | A história cresceu | As fotos das 9 edições entram em sequência como galeria flutuante, ligadas por linhas luminosas; painel "9 edições realizadas" com barras crescendo uma a uma e a 10ª pontilhada (2027) |
| 18–23 s | Conquista | Contador "+50.000 toneladas de alimentos arrecadadas" com anel, terminando junto com a fala "mais de 50 mil toneladas" |
| 23–29 s | A décima edição | Contador de edições sobe de 1 a 9 na fala "depois de nove edições" e vira 10 em "décima"; tudo converge para o centro |
| 29–32 s | Revelação | Flash e raios de luz: **10ª GINCANA SOLIDÁRIA PAFIES 2027** |
| 32–43 s | Um marco | As fotos voltam em órbita ao redor da marca, conectadas a ela |
| 43–52 s | O convite | Uma luz azul sobe de baixo e ícones 3D (coração, mãos dadas, cesta, pessoas, play, compartilhar, chat, estrela, link, "10ª") explodem para fora e ficam flutuando em volta do painel de calendário "Próxima edição — Uma história de solidariedade continua", com a linha do tempo de 2017 a 2027 |
| 51–53,7 s | Encerramento | Painéis somem, fica a identidade: "Faça parte dessa história." e "Inscrições abertas — link na bio." |
| 53,7–65,5 s | Lembrete | A narradora lembra: "E só lembrando: amanhã é o último dia de inscrições! Então, se você ainda não se inscreveu… corre, que dá tempo!". Na tela, o painel "Amanhã — é o último dia de inscrições", com um relógio e uma barra de prazo quase completos e pulsando, e a chamada "Corre que dá tempo! Link na bio." (textos em `lembrete…` no `config.js`; a fala é `audio/lembrete.mp3`) |

Os únicos números usados são os do roteiro: 2017, 9 edições, mais de 50 mil toneladas de alimentos, 10ª edição, 2027.

As legendas (ligadas por padrão, para quem assiste sem som) podem ser desligadas em `config.js` (`legendas: false`).

## Formas de cromo iridescente

Inspiradas no pacote de referência, mas desenhadas do zero em código (nenhuma imagem do pacote é usada). Aparecem assim:

- abertura: um brilho de 8 pontas e um anel, ao fundo do "2017";
- crescimento: fitas cruzadas (a união das equipes) ao lado da galeria;
- conquista: um anel torcido perto do contador de alimentos;
- décima edição: uma moldura ondulada girando atrás do contador 1 → 10;
- revelação: estrela, brilho e anel nascem do centro junto com o flash e ficam em volta da marca até o fim.

Mude posição, tamanho, inclinação, velocidade e momento de cada uma na lista `elementos` do `config.js`.

No navegador as formas são desenhadas ao vivo. Na renderização, o `render.mjs` primeiro desenha cada forma em 72 ângulos (pasta `.cromo/`, criada sozinha e refeita quando `cromo.js` ou os `elementos` mudam) e depois usa essas imagens, o que deixa o processo muitas vezes mais rápido.

## Ícones 3D do convite

Inspirados na referência dos ícones de aplicativo flutuando: blocos azuis arredondados, com espessura, brilho na face e giro. Saem juntos de baixo, no centro, quando a narração pergunta "E você?", ficam balançando em volta do calendário e se afastam no encerramento. Os ícones são do próprio tema (no lugar dos logotipos de marcas da referência). A lista fica em `icones` no `config.js`: dá para trocar o ícone, a posição, o tamanho, o tom (claro/escuro) ou usar um texto curto, como "10ª".

## Narração

Gerada no ElevenLabs com a voz **Muriell** (feminina, português do Brasil, natural e acolhedora), modelo `eleven_v4`, com direção de interpretação por trecho: carinho e nostalgia em "Tudo começou em 2017…", orgulho em "50 mil toneladas de alimentos", expectativa crescente na décima edição e tom próximo no convite final. Foram geradas duas versões; a usada é `audio/narracao.mp3` (49 s), que respeita melhor as pausas.

**Para trocar por uma locutora humana:** grave o texto do roteiro, salve como `audio/narracao.mp3` e, se o ritmo mudar, ajuste em `config.js` o `narracaoInicio`, os inícios das `cenas` e os tempos das `falas`.

## Trilha

`audio/trilha.wav` é gerada por `trilha.py` (piano suave e cordas, crescendo até a revelação). Para usar uma música licenciada, substitua o arquivo mantendo o nome. Na mixagem, a trilha abaixa sozinha sempre que a voz fala (sidechain) e o resultado é normalizado para −14 LUFS (padrão de redes sociais) em duas passadas, no modo linear, para manter a dinâmica: a abertura começa baixinha e cresce até o impacto.

## Fotos reais

Coloque as fotos na pasta `fotos/` (veja `fotos/LEIA-ME.md`). Enquanto não houver fotos, os cartões mostram uma textura no lugar. Depois de colocar as fotos, renderize de novo.

## Como renderizar

Precisa de Node.js, Playwright (com Chromium) e ffmpeg.

```bash
python3 trilha.py              # só se quiser gerar a trilha de novo
node render.mjs                # 4K → pafies-2027-4k.mp4
node render.mjs --1080         # 1920 × 1080 → pafies-2027-1080p.mp4 (mais rápido)
node render.mjs --partes 8     # usa 8 navegadores ao mesmo tempo
node render.mjs --1080 --ate 13  # prévia só da abertura e do começo do documentário
```

Para Reels/TikTok (9:16), dá para recortar o centro do vídeo 16:9 no editor, mas o ideal é uma versão vertical própria.
