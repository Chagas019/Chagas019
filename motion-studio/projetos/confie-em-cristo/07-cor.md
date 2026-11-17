# 07 — COR — confie-em-cristo

Biblioteca visual de cor e luz, preparada antes de `voz.ts` e `cenas.ts`. Os tempos das cenas ainda não existem: os componentes recebem intensidade/progresso por props, e o agente CÓDIGO faz o keyframe deles com `interpolate` sobre os frames de `cenas.ts`.

## Paleta `fe` (`src/cor/tema.ts`)

| Token | Hex | Papel |
|---|---|---|
| fundo | `#050608` | preto profundo (60%) |
| fundo2 | `#0B1628` | azul escuro / céu (60%) |
| primaria | `#D9B56E` | dourado suave: palavras-chave, cruz (30%) |
| secundaria | `#2B4A72` | azul noite: sombras, estrada, linhas (30%) |
| destaque | `#FFB24A` | luz âmbar: SÓ fontes de luz e "CONFIE." (10%) |
| texto | `#F5EEE2` | branco quente |
| textoSuave | `#B8AE9E` | referência "João 14,6", apoio |
| superficie | `rgba(245,238,226,0.07)` | painéis/linhas sutis |
| sucesso | `#F3D9A4` | luz plena / esperança (cenas 4–6) |

Tokens extras: `luzFe` = {preto, azulNoite, azulProfundo, azulSombra, azulMedio, dourado, douradoClaro `#EBCF94`, ambar, ambarQuente, nucleo `#FFF4DE`, brancoQuente, sombraQuente, altaFria, altaQuente}.

Semântica fixa (`estilo.ts > semantica`): branco = narração · dourado = fé / palavras-chave · âmbar = foco/luz · azul = profundidade/sombra.

## Contraste (WCAG, calculado com `contraste()`)

| Frente \ Fundo | fundo `#050608` | fundo2 `#0B1628` | azulProfundo `#071020` | secundaria `#2B4A72` | amanhecer `#4A3318` |
|---|---|---|---|---|---|
| texto `#F5EEE2` | **17.58** | **15.70** | **16.49** | 7.83 | 10.24 |
| textoSuave `#B8AE9E` | 9.25 | 8.27 | 8.68 | 4.12 (só ≥72px) | 5.39 |
| primaria `#D9B56E` | **10.41** | **9.30** | 9.77 | 4.64 | 6.07 |
| douradoClaro `#EBCF94` | 13.40 | 11.97 | 12.58 | 5.97 | 7.81 |
| destaque `#FFB24A` | 11.31 | 10.11 | 10.62 | 5.04 | 6.59 |
| sucesso `#F3D9A4` | 14.74 | 13.17 | 13.83 | 6.57 | 8.59 |

Todos os pares de texto passam 4.5:1 sobre fundo, fundo2 e amanhecer. Ressalva: **sobre o núcleo de uma Halacao/feixe forte o fundo local passa de ~#C08040, e nenhum texto atinge 4.5:1 ali**. Não coloque texto em cima do núcleo da luz (mínimo de 1,5× `raio` de distância) e não use `secundaria` como cor de texto.

## Componentes (`src/cor/Cinematico.tsx`)

Todos são determinísticos (`random('seed')` + `noise2D`, sem `Math.random`) e não usam `filter: blur`: o desfoque e o bokeh são simulados pela suavidade dos radial/conic-gradients. Posições em fração da tela (0..1). `tempo?` substitui o frame (para congelar ou deslocar).

Ordem de camadas recomendada (de baixo para cima):
`FundoProfundo | CeuNoturno` → cenário/personagens → `LuzVolumetrica` → `PoeiraDeLuz` → `FonteDeLuz/Halacao` → **`GradacaoCor`** → **tipografia** → `Grao` → `Vinheta`.
O GradacaoCor fica ABAIXO do texto para preservar o branco quente (validado em stills: por cima, ele acinzenta o texto no frio e amarela no quente).

Luz principal coerente: SEMPRE do alto, levemente à direita (`luzPrincipal = {origem:{x:0.62,y:-0.06}, angulo:192}`), com as sombras caindo para baixo/esquerda em todas as cenas.

## Arco de luz sugerido (`estilo.ts`)

| Cena | `GradacaoCor.mistura` | `FundoProfundo.luz` | Grão | Vinheta | Luz |
|---|---|---|---|---|---|
| 1 Incerteza | 0 | 0 (ou CeuNoturno) | 0.07 | 0.6 | FonteDeLuz progresso 0→~0.4 |
| 2 Momentos difíceis | 0.1 | 0.05 | 0.07 | 0.6 | horizonte frio, poeira fraca 0.3 |
| 3 Mensagem | 0.15→0.6 | 0.1→0.5 | 0.06 | 0.5 | LuzVolumetrica intensidade 0→1 |
| 4 Confiança | 0.8 | 0.7 | 0.05 | 0.35 | pulso de Halacao em cada "confie" |
| 5 Cristo | 0.95 | 0.85 | 0.05 | 0.35 | feixes atrás da cruz, origem acima |
| 6 Final | 0.9 | 0.6 | 0.05 | 0.4 | luz assenta, poeira 0.5 |

## Validação
- `npx tsc --noEmit` sem erros · `npm run qa`: 34 arquivos, nenhum erro.
- Stills de teste (entrada temporária no scratchpad, sem tocar no Root.tsx) nos frames 20/300/600 de uma rampa 0→1: céu frio com estrela, luz atravessando e quente luminoso. Calibragem feita depois dos stills: grading menos denso (os pretos ficavam azul-marinho chapados), quente menos saturado e feixes mais largos.
- Render local: o Chrome Headless do Remotion não baixa (sem rede para remotion.media). Funciona com `--browser-executable=/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell`.

## Pedidos a outros agentes
- CÓDIGO: respeitar a ordem de camadas acima (GradacaoCor abaixo do texto); usar `misturaPorCena`/`luzFundoPorCena`/`atmosferaFe` e `luzPrincipal` de `estilo.ts`; para render/review, passar `--browser-executable` (ver Validação).
- TEXTO: cores de `semantica`; "CONFIE." em `destaque` (âmbar) ou no gradiente `gradFe.ouro`; referência em `textoSuave`; nada de texto sobre o núcleo da luz.
- PEÇAS (cruz, estrada): cruz em `primaria`/`douradoClaro` com borda iluminada pelo lado da `luzPrincipal`; estrada e silhueta em `secundaria`/`fundo`.
- CENAS: confirmar se a luz da cena 1 nasce no centro (x 0.5, y ~0.42); a direção da luz principal vale a partir da cena 3.
- REVISÃO: checar visualmente o banding no amanhecer (o grão 0.05 deve cobrir).

---

## Correção — revisão 1, item 6 (cena 4 luminosa)

**Causas encontradas**
1. `FundoProfundo` chegava no máximo a `#4A3318` (marrom escuro), e a cena 4 usava `luz` 0.7.
2. `GradacaoCor`: o ponto médio da temperatura (`#4A4038`) era cinza escuro. Em `soft-light`, qualquer cor abaixo de 50% escurece, e por isso a mistura 0.5–0.8 deixava a imagem lamacenta.

**Mudanças**
- `FundoProfundo` ganhou a **faixa luminosa `luz` 1..2**. As cenas que usam 0..1 (5 e 6) ficam idênticas. A camada luminosa (opacidade = `luz − 1`) tem:
  - céu de amanhecer creme → âmbar nos 25% superiores (`altaQuente → #F0C27E → #DB9A4E → #B06A2C`), descendo para âmbar queimado e base escura quente;
  - sol difuso no alto, do lado da luz principal;
  - retorno âmbar embaixo, em continuidade com a estrada dourada da cena 3;
  - **lente escura** radial atrás da tipografia (prop nova `lente = {y: 0.42, altura: 0.34}`).
- `GradacaoCor`: o ponto médio da temperatura passou a ser neutro (`#7E7870`) e o quente virou `#B8823F`. Isso tira a lama de qualquer `mistura` intermediária. A cena 3 foi conferida em f800/1100/1300 e esquenta de forma progressiva, sem regressão.
- `estilo.ts`: `luzFundoPorCena.cena4` foi de 0.7 para **1.9** e `misturaPorCena.cena4` de 0.8 para **0.85**. O `atmosferaFe` ficou como estava: grão 0.05 e vinheta 0.35 já eram os valores "luminosos".

**Contraste medido nos pixels renderizados** (média 9×9 px do fundo ao lado e acima/abaixo do texto)

| Ponto | Fundo | Branco quente | Dourado `#D9B56E` |
|---|---|---|---|
| f1620 editorial ("Quando faltar força,"), lado | `#4B290E` | 11.22 | 6.65 |
| f1620 editorial, acima | `#5A3612` | 9.24 | 5.47 |
| f1620 editorial, abaixo | `#563413` | 9.60 | 5.69 |
| f1620 "CONFIE.", lado | `#3E220B` | 12.66 | 7.50 |
| f1780 editorial ("direção,"), acima | `#5F3814` | 8.83 | 5.23 |
| f1780 editorial, abaixo | `#5D3A15` | 8.75 | 5.18 |
| f1780 "CONFIE." dourado, lado | `#41250C` | 12.18 | 7.22 |
| topo (céu, sem texto) | `#DAB273` | 1.72 | 1.02 |

Todos os textos ficam ≥ 5.18:1. Antes desta segunda calibragem, o dourado na linha editorial dava 3.7–4.3. O topo claro (céu) não leva texto e **não pode receber tipografia**.

Stills: `render/revisao/ConfieEmCristo-Vertical/cor-r1/` (`m2.png` = f1476 | 1500 | 1620 | 1780 | 1840; `m3.png` = cena 3 em f800/1100/1300).

**Pedidos**
- CÓDIGO: nada obrigatório, porque a cena 4 já consome `luzFundoPorCena.cena4`. Opcional: passar `lente={{y: 0.42, altura: 0.34}}` explicitamente no `FundoProfundo` da Cena4 se o layout mudar (âncoras do texto em 0.33 e 0.5), mantendo a lente entre as duas.
- CÓDIGO/REVISÃO: a cena 5 (f1840) agora fica bem mais escura que a 4. Isso é coerente com a cruz "recortada pela luz" (item 5), mas o T4 vai ter uma queda de luminância. Se a revisão achar que ela quebra o arco, a correção é passar `luzFundoPorCena.cena5` para ~1.4 (fundo luminoso atrás da cruz em silhueta). Me peçam, que eu ajusto e meço.
