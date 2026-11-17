# Chagas — Design System v2 "Estúdio / Artboard"

> Fonte de verdade visual. Tokens em `portfolio/assets/css/tokens.css`.
> Nomes de tokens são **contrato estável**: os da v1 continuam existindo (valores mudaram); v2 só adiciona.
> A referência enviada (CV de terceiros) inspira **apenas o estilo**: nunca usar nome, texto, dados ou foto dela.

## 1. Conceito

O site inteiro é a **janela de um app de design aberto no trabalho do Chagas**. Moldura grafite com os três
pontos do macOS e uma barra de ferramentas; dentro, um **canvas cinza claro** com cantos grandes, onde o
conteúdo aparece como objetos editáveis (caixa de texto selecionada, alças, artboards); e **painéis
azul-cobalto** com linhas orgânicas suaves, que fazem o papel de "painel de propriedades".

Pilares:
1. **Ferramenta como linguagem** — seleção, alças, camadas, régua, conta-gotas: a interface fala de *fazer*.
2. **Contraste de planos** — canvas claro (respiro) × bloco azul saturado (energia) × chrome escuro (moldura).
3. **Retrato com personalidade** — recorte P&B transbordando a caixa azul, iniciais gigantes em script creme atrás.
4. **Toque humano** — um rabisco desenhado à mão (smiley/seta/círculo) por seção, no máximo.

Evitar: glassmorphism, sombras pesadas, gradientes multicoloridos, grids de cards iguais, ícones de banco
genéricos, logos de software de terceiros sem licença (usar tiles com sigla própria), emojis.

## 2. Paleta

| Token | Hex | Uso |
|---|---|---|
| `--c-chrome` / `-2` / `-3` | `#262626` / `#2F2F2F` / `#3A3A3A` | Moldura, toolbar, hover de ferramenta |
| `--c-dot-red/yellow/green` | `#FF5F57` `#FEBC2E` `#28C840` | Semáforo (decorativo, `aria-hidden`) |
| `--c-canvas` / `-2` | `#F2F2F2` / `#E6E6E6` | Seção clara / artboard vazio |
| `--c-white` | `#FFFFFF` | Cartões no canvas, texto sobre azul |
| `--c-ink` / `-2` / `-3` | `#1A1A1A` / `#555555` / `#6B6B6B` | Texto sobre canvas |
| `--c-blue` | `#0A4FD9` | Cobalto — cor da marca |
| `--c-blue-deep` | `#083DA8` | Hover de botão azul; topo de gradiente |
| `--c-navy` | `#14213D` | Base do gradiente azul→navy |
| `--c-blue-tint` | `#C4D7FF` | Texto claro sobre azul (períodos, organizações) |
| `--c-blue-light` | `#7FA6FF` | Links/destaques sobre chrome e navy |
| `--c-select` | `#D3E1FF` | Preenchimento de caixa de texto selecionada |
| `--c-wave` | `rgba(255,255,255,.09)` | Linhas orgânicas no fundo azul |
| `--c-cream` | `#FFF6E3` | Iniciais em script |
| `--c-paper` / `-dim` / `-mute` | `#FFFFFF` / `#A3A3A3` / `#8F8F8F` | Texto sobre chrome (nomes v1) |
| `--c-error` / `--c-error-dark` / `--c-success` | `#B42318` / `#FF8F87` / `#176F3D` | Validação |

`--c-accent*` agora apontam para o azul. **Hover de botão azul escurece** (`--c-blue-deep`), não clareia.

### Contraste verificado (WCAG 2.1, luminância relativa)

| Texto | Fundo | Razão | Resultado |
|---|---|---|---|
| branco | blue `#0A4FD9` | **6.70:1** | AA (AAA ≥ 24px) |
| branco | blue-deep | 9.36:1 | AAA |
| branco | navy | 15.97:1 | AAA |
| blue-tint `#C4D7FF` | blue | **4.63:1** | AA (texto normal) |
| blue-tint | blue-deep / navy | 6.47 / 11.04:1 | AA / AAA |
| `#A9C4FF` (mais claro que o ref.) | blue | 3.84:1 | **reprovado → por isso blue-tint** |
| cream | blue | 6.24:1 | AA (decorativo) |
| ink `#1A1A1A` | canvas | 15.55:1 | AAA |
| ink-2 `#555555` | canvas | 6.66:1 | AA |
| ink-3 `#6B6B6B` | canvas | 4.76:1 | AA (em canvas-2: só texto grande) |
| blue | canvas / white / canvas-2 | 5.99 / 6.70 / 5.37:1 | AA |
| ink | select `#D3E1FF` | 13.25:1 | AAA |
| blue | select | 5.10:1 | AA |
| branco | chrome | 15.13:1 | AAA |
| paper-dim `#A3A3A3` | chrome / chrome-2 | 6.00 / 5.31:1 | AA |
| paper-mute `#8F8F8F` | chrome | 4.68:1 | AA (em chrome-2: 4.14 → só grande) |
| blue-light `#7FA6FF` | chrome / navy | 6.34 / 6.69:1 | AA |
| **blue `#0A4FD9`** | **chrome** | **2.26:1** | **PROIBIDO como texto** (use blue-light) |
| error / success | canvas | 5.87 / 5.55:1 | AA |
| error-dark | chrome / navy | 6.87 / 7.25:1 | AA |
| borda input `#6B6B6B` | canvas | 4.76:1 | AA não-texto (≥3:1) |

## 3. Tipografia

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter+Tight:ital,wght@0,400..800;1,400..600&family=Pacifico&family=JetBrains+Mono:wght@400;500&display=swap">
```

| Papel | Família | Config |
|---|---|---|
| Display (títulos, nome) | **Inter Tight** 800 | `--ls-display` (−0.035em), `--lh-tight` (.95), caixa normal (não uppercase) |
| Subtítulos de seção | Inter Tight 700 | `--fs-3xl`, `--ls-tight` |
| Corpo | Inter Tight 500 | `--fs-lg` no "Sobre", `--fs-base` geral, `--lh-relaxed`, máx. `--measure` |
| Períodos / datas | Inter Tight 500 *itálico* | cor `--c-text-2` (blue-tint no azul) |
| Script decorativo | **Pacifico** | **só** iniciais gigantes "CH" `--fs-script` em `--c-cream`, `aria-hidden` |
| Rótulos de app | JetBrains Mono 400/500 | `--fs-mono`: "1920 × 1080", "100%", nomes de camada |

Escala: `--fs-mono` 11–12 · `xs` 12–13 · `sm` 14–15 · `base` 16–18 · `lg` 18–22 · `xl` 22–32 · `2xl` 28–48 ·
`3xl` 36–72 · `4xl` 44–96 · `hero` 48–136 · `script` 160–448. `text-wrap: balance` em títulos; `tabular-nums` em preços.

## 4. Espaço, grid, forma

Espaço base 4px: `--sp-1…--sp-11` (4 → 192px); fluidos `--sp-section`, `--sp-section-sm`, `--sp-gutter`,
`--sp-frame` (moldura chrome ao redor do canvas, 8–20px).
Grid 12 col, `--grid-gap`, `--grid-max` 1440px, `--grid-narrow` 880px. Breakpoints 600 / 900 / 1200 / 1440.

Layouts-mestre:
- **Janela**: `body` chrome → toolbar (`--header-h`) → canvas com `--r-panel` nos cantos superiores.
- **Sobre (hero)**: retrato `1 / 6`, texto `7 / 13`. Mobile: retrato em cima, texto abaixo.
- **Painel azul**: bloco `1 / -1` com `border-top-left-radius: var(--r-panel)`; dentro, coluna azul `1 / 6`
  + coluna navy `6 / 13` com `--c-gradient-panel`.
Raios: `--r-xs` 6 · `--r-sm` 10 · `--r-tile` 14 · `--r-card` 16–24 · `--r-panel` 24–40 · `--r-pill`.
Seleção: `--bw-select` 2px, `--handle` 8px, `--bw-rule` 4px, `--tilt-badge` −2deg.

Temas de seção via atributo: `data-theme="canvas"` (alias v1 `paper`), `"blue"`, `"navy"`; padrão = chrome.

## 5. Componentes

**Janela / header (toolbar)** — sticky, fundo `--c-chrome-2`, cantos superiores `--r-panel`. Esquerda: 3 pontos
(12px, decorativos). Centro: **ferramentas = navegação**, cada uma com ícone SVG próprio + `aria-label`/tooltip:
Pincel→Início, Mão→Trabalhos, Balde→Serviços, Caneta→Motion/Vídeo, Mover→Planos, Elipse→Sobre, T→Contato.
Ativa: quadrado `--c-blue` `--r-sm` com ícone branco e triângulo de submenu no canto. Hover: `--c-chrome-3`.
Direita: círculo azul (amostra de cor) = botão "Orçamento". Mobile: semáforo + ferramenta ativa + botão "Ferramentas"
que abre uma paleta flutuante (grid 4×2). Botões ≥ 44×44px.

**Hero "Sobre"** (canvas) — caixa `--c-blue` `--r-card` com "CH" em Pacifico creme sangrando; retrato P&B
recortado (PNG/WebP com alpha) transbordando o topo da caixa. À direita: rótulo de seção dentro de **caixa de
texto selecionada** (fundo `--c-select`, linha vertical azul de 2px com alças redondas nas pontas); rabisco
SVG desenhado à mão; nome em `--fs-hero` 800; **pílula de cargo** `--c-blue` texto branco, `rotate(var(--tilt-badge))`
("Fotógrafo & Videomaker"); parágrafo `--fs-lg` 500; régua azul `--bw-rule` com `--r-pill`.

**Painel azul (serviços/trajetória)** — fundo `--c-blue` + SVG de ondas `--c-wave` (stroke 40–60px, não animado).
Coluna esquerda: **Serviços** e **Trajetória** em timeline: período itálico blue-tint, título 700 branco, detalhe
blue-tint. Ícone "≡" (menu de camadas) no topo. Coluna direita (navy gradiente): **Ferramentas** (tiles 56px
`--r-tile` com sigla própria, ex. "Pr", "Ae", "Lr" desenhados em CSS — não logos oficiais), **Especialidades**
(lista de 2 colunas com bullets) e **Redes** (ícones de link). Barra de scroll fake à direita é decorativa.

**Trabalhos = artboards** (canvas) — cada projeto é um **artboard**: rótulo mono acima ("Casamento — 3:2"),
superfície branca `--r-card`, mídia dentro. Layout de prancheta: grid 12 col com spans variados (7+5, 4+4+4, 12)
e alinhamentos desencontrados, como pranchetas espalhadas. Filtros = **abas de página** no topo (pílulas).
*Hover/foco*: aparece **bounding box** azul 2px com 4 alças quadradas brancas de borda azul (`--handle`) nos cantos,
e etiqueta mono azul "1920 × 1080" abaixo — desenhada em `--dur-draw`. *Film-strip* (Reels): faixa horizontal com
scroll-snap, artboards 9:16. *Antes/depois 4K*: slider estilo "divisor de camada" com alça azul.

**Detalhe / lightbox** — fundo `--c-scrim`, mídia centralizada num artboard; barra inferior estilo app: nome da
camada, zoom "100%", `←  →`, `Esc`. Abre escalando de 0.96 → 1 + fade, `--ease-out` `--dur-page`. Foco preso,
retorno ao gatilho, `aria-modal`, swipe no mobile, vídeo nunca com som automático.

**Planos (pricing) = painel de camadas** — container navy/gradiente `--r-panel`; cada plano é uma **linha de camada**:
ícone de olho, miniatura, nome 700, "a partir de R$" tabular, chevron para expandir os itens. Plano recomendado =
camada **selecionada** (fundo `--c-blue`, texto branco, etiqueta "Recomendado"). Desktop alternativo: 3 painéis
lado a lado, o do meio azul sólido e os laterais navy. Contrato mensal como "grupo de camadas" com sub-itens.

**Formulário de contato** (canvas) — painel branco `--r-card` estilo "inspector": label 600 acima, input com
borda 1px `--c-line-strong`, `--r-xs`; foco: borda azul 2px + alças nos cantos (seleção). Tipos de serviço =
chips-ferramenta. Erro em `--c-error` + texto + `aria-describedby`. Botão primário azul.

**Footer** (chrome) — "Contato:" 700 `--fs-2xl`; links com ícone (WhatsApp, e-mail, Instagram etc.) sublinhados em
`--c-blue-light`. © e "voltar ao topo" em `--c-paper-mute`.

**Botões** — *Primário*: `--c-blue`, texto branco, `--r-pill`, 600, hover `--c-blue-deep`. *Secundário*: borda 2px
`--c-blue` no canvas / branco no azul. *Ferramenta*: quadrado `--toolbar-btn` `--r-sm`. *Link*: sublinhado
`text-underline-offset: .18em`. Foco universal: `outline: var(--bw-focus) solid var(--c-focus); outline-offset: 3px`.

## 6. Movimento — micro-interações de ferramenta, contidas

| Token | Valor | Uso |
|---|---|---|
| `--dur-fast` | 160ms | hover de ferramenta, cor |
| `--dur-base` | 260ms | alças aparecendo, menus |
| `--dur-draw` | 420ms | desenhar bounding box / régua |
| `--dur-slow` / `--dur-slower` | 560 / 800ms | reveals, retrato |
| `--dur-page` | 600ms | página / lightbox |
| `--ease-out` | `cubic-bezier(.22,1,.36,1)` | padrão |
| `--ease-in-out` | `cubic-bezier(.65,0,.35,1)` | painéis |
| `--ease-snap` | `cubic-bezier(.34,1.36,.64,1)` | encaixe de alças, pílula, ferramenta ativa |

Padrões:
- **Seleção**: bounding box cresce de `scale(.98)`+opacity 0 → 1 em `--dur-draw`; alças entram com `--ease-snap`, stagger 40ms.
- **Caixa "Sobre"**: fundo `--c-select` "pinta" da esquerda (`clip-path: inset(0 100% 0 0)` → `inset(0)`), depois a linha/alças.
- **Régua azul**: `transform: scaleX(0→1)`, origem à esquerda, `--dur-draw`.
- **Pílula de cargo**: entra de `rotate(0)` para `--tilt-badge` com `--ease-snap`.
- **Ferramenta ativa**: quadrado azul desliza entre ferramentas (um único elemento indicador animado em `transform`).
- **Retrato**: sobe `--reveal-distance` + fade; iniciais creme fazem fade 200ms depois.
- **Cursor**: opcional, só desktop `pointer: fine` — sobre artboards o cursor vira seta de seleção; sobre mídia, mão.
  Usar `cursor:` CSS com SVG, nunca cursor seguidor em JS.
- Animar só `transform`, `opacity`, `clip-path`. Reveals via IntersectionObserver (threshold .15), uma vez.

**prefers-reduced-motion**: tokens de duração → 0, `--ease-snap` → `--ease-out`, sem rotação de entrada (pílula já
aparece girada), seleção aparece sem desenho, vídeos de fundo pausados com poster, film-strip sem autoplay.
Conteúdo visível sem JS.

## 7. Imagem

- Retrato do Chagas: P&B, recorte com alpha, alto contraste. Trabalhos: cor natural, sem filtro.
- AVIF/WebP + JPG, `srcset/sizes`, `loading="lazy"` (exceto hero), `width/height` sempre; vídeo `muted playsinline`,
  poster, ≤ 6 MB no topo.
- `alt` descritivo e factual. Iniciais, rabiscos, ondas, semáforo e tiles: `aria-hidden="true"`.
- Sem fotos de banco como se fossem do Chagas: artboard vazio `--c-canvas-2` com rótulo mono "Em breve".
- Trabalhos reais: realce 4K (gameplay + antes/depois), motion "moto-personagem", aberturas Comunica+Fé, ilustração Carlo Acutis.

## 8. Voz e tom

- Primeira pessoa, pt-BR, próximo e direto ("Eu fotografo, filmo e animo."). Frases curtas, verbos concretos.
- Rótulos de seção curtos como nomes de painel: "Sobre mim", "Trabalhos", "Serviços", "Planos", "Contato:".
- Brincadeira de ferramenta só em microcopy ("Selecione um trabalho", "Camada recomendada") — sem exagero.
- Nada de "soluções", superlativos vazios, exclamações; não inventar clientes/prêmios. CTAs específicos
  ("Pedir orçamento", "Falar no WhatsApp"). Preço transparente ("a partir de").

## 9. Índice de tokens

- **Novos v2**: `--c-chrome(-2,-3)`, `--c-dot-*`, `--c-canvas(-2)`, `--c-white`, `--c-blue`, `--c-blue-deep`, `--c-navy`,
  `--c-blue-tint`, `--c-blue-light`, `--c-select`, `--c-wave`, `--c-cream`, `--c-error-dark`, `--c-line-dark`, `--c-link`,
  `--c-gradient-panel`, `--f-script`, `--fs-script`, `--sp-frame`, `--toolbar-btn`, `--r-sm`, `--r-tile`, `--r-card`,
  `--r-panel`, `--bw-select`, `--bw-rule`, `--handle`, `--tilt-badge`, `--shadow-panel`, `--z-select`, `--dur-draw`, `--ease-snap`.
- **Mantidos (valor novo)**: `--c-ink(-2,-3)`, `--c-paper(-dim,-mute)`, `--c-accent(-hi,-deep)`, `--c-on-accent`, `--c-line(-strong)`,
  semânticas `--c-bg/surface/text/border/focus/selection/scrim/veil`, `--c-inv-*`, `--f-*`, `--fw-*`, `--fs-*`, `--lh-*`, `--ls-*`,
  `--sp-*`, `--grid-*`, `--header-h`, `--r-0/xs/pill`, `--ar-*`, `--z-*`, `--dur-*`, `--ease-*`, `--stagger`, `--reveal-distance`, `--hover-scale`.
- **Compat (evitar em código novo)**: `--f-serif` (→ script), `--fstretch-*` (100%), `--c-glow` (none), `--grain-opacity` (0),
  `--ease-shutter` (→ in-out), `data-theme="paper"` (→ canvas).
