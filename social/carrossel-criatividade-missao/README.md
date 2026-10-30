# Quem disse que criatividade não é missão?

Carrossel de 6 slides para Instagram (1080×1350). Estética de revista independente: preto, papel e cinza, laranja `#FF4F12` como sinal.

- `index.html` é a versão digital, com animações sutis. Abra no navegador.
- `png/` traz os 6 PNGs prontos para postar.
- `node render.js` exporta os PNGs de novo depois de qualquer ajuste.

## Fotos

Os quadros de foto mostram uma placa cinza com a pauta escrita enquanto não houver arquivo. Coloque fotos reais da sua equipe em `fotos/` com estes nomes e rode `node render.js`. Elas recebem P&B, contraste e retícula automaticamente.

| Arquivo | Pauta |
|---|---|
| `01-capa-lente.jpg` | Close de mão ajustando o foco da lente. Luz dura, de lado. |
| `02-camera.jpg` | Alguém operando câmera ou editando. Mãos em foco, rosto fora de foco. |
| `03-momento.jpg` | Um momento real: abraço, riso, oração em grupo. Sem pose. |
| `05-equipe.jpg` | Equipe de comunicação da igreja em ação: mesa de som, câmera no tripé, notebook. Registro documental. |

Fotografe com luz disponível, sem flash, sem pedir para sorrir. O tratamento gráfico faz o resto.

## Tipografia

Anton (display), Archivo Narrow (texto), Instrument Serif itálico (respiro) e JetBrains Mono (anotações). Todas via Google Fonts, em `fonts/`.

## Legenda sugerida

> Você passa horas ajustando luz, corte, cor e fonte. E se tudo isso também pudesse anunciar alguém maior que você?
>
> Criatividade não é só talento. É missão.
>
> Desafio da semana: crie algo que leve alguém mais perto de Deus. Comenta aqui qual talento você quer colocar a serviço do Reino. 👇
>
> #CriatividadeDoReino #ComunicaçãoCatólica #PastoralDaComunicação #Evangelização #FéECriatividade

## Versão interativa — identidade @chagas_catolico

`interativo.html` segue a linguagem do feed: foto escura em tela cheia com serifada fina, pôster laranja com condensada pesada, assinatura `-chagas_catolico` e faixa "Salve este post". PNGs em `png/criatividade-missao-interativo-*.png`, exportados com `node render.js interativo`.

Cada slide pede uma ação nativa do Instagram:

| Slide | Interação |
|---|---|
| 01 | "Arrasta e responde →" |
| 02 | Toque duas vezes se você já pensou nisso (curtida) |
| 03 | Marque quem da sua equipe é a câmera, o vídeo, o design e a ideia |
| 04 | Enquete: comente 01, 02 ou 03 |
| 05 | Envie para sua equipe (compartilhamento) |
| 06 | Comente seu talento + salve o post |

No navegador, as interações funcionam de verdade: duplo clique curte, os quadros recebem @, a enquete marca a opção, o botão abre o compartilhar do celular e os talentos podem ser escolhidos.

Fotos desta versão: `i01-noite.jpg` (encontro de jovens à noite, luzes amarelas), `i03-camera.jpg`, `i03-video.jpg`, `i03-design.jpg` e `i05-pascom.jpg` (equipe trabalhando na missa ou num encontro, sem pose).
