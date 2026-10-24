# Vídeo — 10ª Gincana Solidária PAFIES 2027

Vídeo de 58 segundos, 16:9, 30 quadros/s, com narração feminina em português do Brasil, trilha instrumental, fundo em degradê preto → azul, painéis 3D animados inspirados nos widgets de referência (cartões escuros com cantos arredondados, gráficos de barras, anéis de progresso, galeria flutuante e linhas de conexão) e formas 3D de cromo iridescente flutuando ao fundo.

- `pafies-2027-4k.mp4`: o vídeo final (4K)
- `index.html`: o vídeo em código. Abra no navegador e clique em **Assistir** (espaço também funciona). A barra permite ir a qualquer segundo.
- `config.js`: **todos os textos, números, datas, fotos, tempos, cores e formas de cromo**. Edite aqui e renderize de novo.
- `cromo.js`: as formas de cromo iridescente (anel, fitas cruzadas, brilho de 8 pontas, estrela, moldura ondulada e anel torcido), desenhadas em 3D de verdade por um shader WebGL.

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
| 52–58 s | Encerramento | Painéis somem, fica a identidade: "Faça parte dessa história." e "Inscrições abertas — link na bio." |

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

`audio/trilha.wav` é gerada por `trilha.py` (piano suave e cordas, crescendo até a revelação). Para usar uma música licenciada, substitua o arquivo mantendo o nome. Na mixagem, a trilha abaixa sozinha sempre que a voz fala (sidechain) e o resultado é normalizado para −14 LUFS (padrão de redes sociais).

## Fotos reais

Coloque as fotos na pasta `fotos/` (veja `fotos/LEIA-ME.md`). Enquanto não houver fotos, os cartões mostram uma textura no lugar. Depois de colocar as fotos, renderize de novo.

## Como renderizar

Precisa de Node.js, Playwright (com Chromium) e ffmpeg.

```bash
python3 trilha.py              # só se quiser gerar a trilha de novo
node render.mjs                # 4K → pafies-2027-4k.mp4
node render.mjs --1080         # 1920 × 1080 → pafies-2027-1080p.mp4 (mais rápido)
node render.mjs --partes 8     # usa 8 navegadores ao mesmo tempo
```

Para Reels/TikTok (9:16), dá para recortar o centro do vídeo 16:9 no editor, mas o ideal é uma versão vertical própria.
