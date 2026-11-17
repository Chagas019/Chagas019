# DESIGN SYSTEM — CHAGAS CREATIVE (v3 "Sala escura / Editorial")

Dono: A1 Creative Director. Tokens: `assets/css/tokens.css` (única fonte de valores). Briefing: `docs/BRIEFING.md`.
A v2 (janela de app azul) foi aposentada. **Nomes de tokens e `data-theme` foram mantidos; só os valores mudaram.**

## 1. Conceito
Estúdio criativo internacional visto como **sala de projeção**: preto profundo, grafite, papel claro neutro, cinza.
Um único acento — **tally** (`--c-signal` #C2410C / `--c-signal-light` #FF7A45): o laranja-avermelhado da luz REC
de câmera. Escolhido porque nasce do ofício (foto/vídeo), não é neon, conversa com o grão e o preto, e aparece
só onde algo "está gravando": foco, seleção, CTA principal, ponto REC, hover de link. Regra: **≤ 5% da tela**.
Assinatura de estúdio (sutil): caixa de seleção com alças + rótulo mono `W×H` no hover dos trabalhos; microcopy
"Selecione um trabalho". Proibido: gradientes chamativos, painéis grandes coloridos, ícones decorativos, cantos arredondados grandes, sombras pesadas.

## 2. Cor e contraste (WCAG 2.x, calculado)
| Texto / UI | Fundo | Razão | Uso permitido |
|---|---|---|---|
| `--c-paper` #F2F1EE | preto #0A0A0A / chrome-2 #131313 / grafite #1F1F1F | 17.53 / 16.45 / 14.59 | texto |
| `--c-paper-dim` #ADADAD | preto / grafite / #2E2E2E | 8.82 / 7.34 / 6.05 | texto secundário |
| `--c-paper-mute` #8C8C8C | preto / #1C1C1C / grafite / #161616 | 5.89 / 5.07 / 4.90 / 5.38 | metadados, mono |
| `--c-blue-tint` #BDBDBD | grafite / #161616 / #262626 | 8.77 / 9.63 / 8.06 | secundário em temas blue/navy |
| `--c-signal-light` #FF7A45 | preto / grafite / #161616 / #262626 | 7.66 / 6.37 / 7.00 / 5.85 | texto-acento, foco, linhas no escuro |
| branco sobre `--c-signal` #C2410C | — | 5.18 (paper: 4.58) | botão primário, badge, rótulo W×H |
| branco sobre `--c-signal-hi` #9A3412 | — | 7.31 | hover do primário |
| `--c-signal-hi` #9A3412 | papel #ECEBE8 | 6.13 | texto-acento/links hover no claro |
| `--c-ink` / `--c-ink-2` / `--c-ink-3` | papel #ECEBE8 | 16.61 / 8.04 / 5.61 | texto no tema canvas |
| `--c-ink-2` / `--c-ink-3` | canvas-2 #DCDBD7 | 6.92 / 4.83 | placeholders |
| `--c-ink` / `--c-ink-3` | `--c-select` #F7DDCF | 15.27 / 5.16 | linha selecionada |
| `--c-error` #B42318 / `--c-success` #176F3D | papel | 5.51 / 5.22 | mensagens (sempre com texto) |
| `--c-error-dark` #FF8F87 | preto / grafite | 8.99 / 7.48 | erro no escuro |
| `--c-line-strong` #7A7A7A | papel | 3.60 | borda de input (UI ≥3:1) |
| `--c-line-dark-strong` #6E6E6E | preto / grafite | 3.88 / 3.23 | borda de input no escuro |
| `--c-signal` como linha | preto / papel | 3.82 / 4.34 | bounding box, filete (UI ≥3:1) |

**Proibido (falha AA):** `--c-signal` como *texto* sobre papel (4.34) ou preto (3.82); `--c-signal-light` sobre papel (2.17);
`--c-line*` / `--c-line-dark` como texto. Erro e acento são vizinhos de matiz → erro sempre com prefixo "Erro:" + `aria-invalid`.

### Temas (`data-theme`)
- *(sem tema)* = **preto** `--c-chrome` (#0A0A0A). Base da página, hero, portfólio, footer.
- `canvas` (e `paper`, compat) = **papel claro** #ECEBE8, texto ink. Use 1–2 vezes (ex.: Sobre, Orçamento/form) para ritmo.
- `blue` = **grafite** #1F1F1F (não é mais azul). Serviços, Produtos.
- `navy` = **grafite profundo** #161616. Ferramentas/Equipamentos, Projetos.
Alternar preto → grafite → papel cria cortes de "cena". Nunca dois temas iguais adjacentes exceto preto↔preto com filete.
Compat de nomes: `--c-blue` = acento de preenchimento; `--c-blue-deep` = hover/texto-acento no claro; `--c-blue-light` = acento no escuro;
`--c-navy` = grafite profundo; `--c-select` = tint de seleção; `--c-gradient-panel` = grafite→grafite (quase plano); `--c-dot-*` obsoletos.
**Não** usar `--c-blue` como fundo de área grande (só botão, badge, rótulo, alça).

## 3. Tipografia
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,100..900&family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;500&display=swap">
```
- **Archivo** (variável, eixo de largura 62–125): display **condensado** (`font-stretch: var(--fstretch-display)` 72%, `--fw-display` 800,
  caixa-alta, `--lh-tight` .88) e corpo a 100%. Expandido (`--fstretch-wide`) só em kicker/marca "CHAGAS CREATIVE" e numerais grandes.
- **Instrument Serif** itálico (`--f-serif`): 1 a 3 palavras de acento por seção (ex.: "*histórias visuais*"), citações (`--fs-quote`), iniciais marca-d'água. Nunca em parágrafos.
- **JetBrains Mono** (`--f-mono`, `--fs-mono`, caixa-alta, `--ls-caps`, `font-variant-numeric: tabular-nums`): timecode, contadores de quadro, W×H, rótulos, preços.
- Escala: hero `--fs-hero` (52–176px), seção `--fs-3xl`, subtítulo `--fs-xl`, corpo `--fs-base`, legenda `--fs-sm`. Parágrafos ≤ `--measure`.
- `text-wrap: balance` em títulos; `hyphens: manual`; `font-synthesis: none`.

## 4. Grid, espaço e breakpoints
- 12 colunas, `--grid-gap`, largura máx `--grid-max` 1440, margem `--sp-gutter` (16px no mobile).
- Breakpoints: **600** (2 col em listas) · **900** (grid de 12 col ativa, layout assimétrico) · **1200** (hero completo, nav inline) · **1440** (largura máx; só cresce o respiro).
- Assimetria padrão: título em `1 / span 5`, conteúdo em `7 / span 6`; imagens destaque sangram até a margem (`grid-column: 1 / -1` ou full-bleed).
- Seções `padding-block: var(--sp-section)`. Cabeçalho de seção: mono `01 — SOBRE` + filete `--bw-rule` + título condensado.

## 5. Movimento
- Easing padrão `--ease-out` (expo); máscaras/letterbox `--ease-cine`; alças `--ease-snap`.
- Reveal `[data-reveal]`: `opacity 0→1` + `translateY(var(--reveal-distance))` em `--dur-slow`; títulos revelam por linha com `clip-path: inset(0 0 100% 0)`→`inset(0)`; listas com `transition-delay: calc(var(--i) * var(--stagger))`.
- Hero: letterbox abre (faixas de `--letterbox-h` deslizam de 50% para a altura final) em `--dur-slower`; título entra linha a linha; timecode começa a contar.
- Hover de imagem: `scale(var(--hover-scale))` em `--dur-slow`; nada de rotação/brilho.
- **Reduced motion:** todas as durações = 0 via tokens; `[data-reveal]` visível de imediato; timecode estático; REC sem piscar; grão estático. Nunca depender de animação para mostrar conteúdo.

## 6. Elementos de cinema (globais)
- **Grão:** `body::after` fixo, `background-image: var(--grain-image)`, `opacity: var(--grain-opacity)`, `mix-blend-mode: overlay`, `pointer-events:none`, `z-index: var(--z-grain)`. Sem animar (ou `steps()` a 8fps só sem reduced-motion).
- **Timecode/contadores:** mono `--c-text-3`, ex.: `00:00:12:04`, `FR 0247`, `SC 03 / 08` (cena = índice da seção). Decorativo → `aria-hidden="true"`.
- **Ponto REC:** 8px, `--c-rec`, pisca em `--dur-blink` com `steps(2)`. Máx. 1 por viewport.
- **Marcas de corte:** cantos em L de 12px, `--c-line-dark`, em mídias destacadas.

## 7. Componentes

**Header/nav (8 itens):** fixo, `--header-h`, fundo `rgb(10 10 10 / .7)` + `backdrop-filter: blur(12px)`, filete inferior `--c-border`.
Esquerda: marca "CHAGAS CREATIVE" (Archivo expandido, 600, `--fs-sm`). Itens: Início, Sobre, Serviços, Portfólio, Projetos, Produtos, Orçamento, Contato — `--fs-sm`, `--c-text-2`; hover/atual = `--c-text` + sublinhado 1px que desenha (scaleX) em `--dur-draw`; atual com `aria-current` e prefixo mono `●` em `--c-signal-light`.
≥1200 inline; <1200 botão `[data-nav-toggle]` 44×44 ("Menu"/"Fechar", mono) abre `[data-nav-menu]` em tela cheia preta: itens em display condensado `--fs-2xl`, numerados `01–08` mono, stagger; Esc fecha, foco preso, devolve foco ao botão.

**Hero `#home`:** `min-height: var(--hero-min-h)`, preto. Faixas letterbox `--c-letterbox` em cima/baixo (`--letterbox-h`). Mídia de fundo opcional (vídeo/foto real) sob `--c-veil-hero`; sem mídia → preto + grão.
Moldura HUD nos 4 cantos (mono `--fs-mono`, `--c-text-3`): sup. esq. `● REC  CHAGAS CREATIVE`; sup. dir. `CAMPINAS — SP`; inf. esq. timecode `00:00:00:00`; inf. dir. `2019 — HOJE`/`FR 0001`.
Título: "CRIATIVIDADE QUE TRANSFORMA IDEIAS EM EXPERIÊNCIAS." `--fs-hero`, condensado 800, caixa-alta, colunas `1 / -1`, alinhado à base; "EXPERIÊNCIAS." pode trocar para Instrument Serif itálico em caixa normal (1 palavra). Subtítulo `--fs-lg` `--c-text-2` em `7 / span 5`, ≤ `--measure-sm`.
Botões: primário "Explorar projetos" (#projetos) + secundário "Solicitar orçamento" (#orcamento). Indicador de rolagem mono "ROLE ↓".

**Botões:** altura ≥ 44px, padding `0 var(--sp-5)`, `--r-sm`, Archivo 600 `--fs-sm` caixa-alta `--ls-caps`.
Primário: `--c-accent` + `--c-on-accent`; hover `--c-accent-hi`. Secundário: transparente, borda 1px `currentColor`, hover inverte (fundo `--c-text`, texto `--c-bg`).
Link-texto: sublinhado 1px offset .25em; hover `--c-link-hover`. Foco: `outline: var(--bw-focus) solid var(--c-focus); outline-offset: 3px` em tudo.

**Sobre `#sobre` (canvas):** grid 5/7: coluna esq. foto (`--ar-port`, reta; `photo:null` → placeholder `--c-canvas-2` com mono "RETRATO — EM BREVE") e iniciais "C" em serifa itálica marca-d'água; dir. parágrafos `--fs-lg` (1º) e `--fs-base`; uma frase em Instrument Serif `--fs-quote`. Linha do tempo: lista mono `2019` + título + texto, filete à esquerda.

**Serviços `#servicos` (blue/grafite) — 5 áreas:** lista editorial, não cards: cada área é uma linha de grid com número mono `01–05`, nome condensado `--fs-2xl`, intro `--c-text-2`, itens em texto corrido separados por " / " ou colunas de 2. Filete entre linhas. Hover: número fica `--c-signal-light` e filete desenha. Opcional `<details>` no mobile.

**Ferramentas (navy) — mapa de uso, sem níveis:** tabela/matriz: linhas = ferramentas (nome em Archivo 600), colunas = Foto · Vídeo · Design/Motion · Conteúdo · Código; célula marcada com quadrado 8px `--c-text` + texto oculto ("usado em Vídeo"). Mobile: cada ferramenta vira bloco com tags mono dos usos + `context`. Proibido barras, %, estrelas, "domínio".

**Equipamentos (navy):** lista mono compacta `KIND — NOME` (ex.: `CELULAR — iPhone 16 Pro Max`) + nota visível: "Equipamentos já utilizados ou explorados." Conhecimentos como linha de tags texto separadas por "·". Nunca "disponível para locação/contratação".

**Portfólio `#portfolio` (preto):** filtros = botões mono caixa-alta com `aria-pressed`; ativo: texto `--c-text` + sublinhado `--c-signal-light`. Destaques em grid assimétrico (7+5, depois 5+7; 1ª peça `--ar-cine`). Card: mídia reta, legenda abaixo — título Archivo 600 `--fs-lg`, meta mono `CATEGORIA · ANO`.
**Hover/foco de trabalho (assinatura):** caixa de seleção 1px `--c-blue-light` desenhada em `--dur-draw`, 4 alças quadradas `--handle` (fundo `--c-black`, borda 1px `--c-blue-light`) com `--ease-snap`; rótulo `W×H` (dimensões reais da mídia, ex.: `1920 × 1080`) mono, fundo `--c-blue`, texto branco, abaixo à esquerda; imagem `--hover-scale`. Mesmo estado em `:focus-visible`. Índice de projetos: linhas mono com hover `--c-surface-2`. "Em curadoria": bloco borda tracejada `--c-line-dark-strong`, mono "EM CURADORIA", texto honesto, sem imagem de banco.

**Projetos selecionados `#projetos` (navy):** lista/grade 2 col (≥900) com filtros por tipo. Card mínimo: capa (`cover:null` → quadro grafite com título em display condensado e marcas de corte), título, `role`, `summary`, slogan em serifa itálica se houver.
**Badges de tipo** (`--r-pill`, mono `--fs-mono` caixa-alta, distinção não só por cor):
`REALIZADO` = sólido `--c-text` / texto `--c-bg` · `PESSOAL` = contorno 1px `currentColor` · `CONCEITUAL` = contorno **tracejado** + prefixo "◇". Status (`EM ANDAMENTO`, `PREVISTO`) = texto mono `--c-signal-light` com ponto REC.

**Produtos `#produtos` (blue/grafite):** cards 3 col (≥1200), 2 (≥600), 1. Imagem `--ar-port`; `image:null` → placeholder: fundo `--c-graphite-3`, marcas de corte, nome em condensado, mono "PRÉVIA EM PRODUÇÃO" (honesto). Corpo: `kind` mono, nome `--fs-xl`, descrição, "Aplicação:" `--c-text-2`, preço mono grande (`a partir de R$ X` ou **"Sob consulta"** quando null), "Disponibilidade: a confirmar" `--c-text-3`. CTA secundário "Tenho interesse" → WhatsApp.

**Orçamento `#orcamento`:** (a) tabela de preços no preto/grafite: grupos com título mono `FOTOGRAFIA`, itens como linhas `label ............ a partir de R$ 250` (pontilhado = `border-bottom: 1px dotted --c-border` num flex), preço mono tabular alinhado à direita, `desc` em `--c-text-3`. Disclaimer + nota abaixo em `--fs-sm` `--c-text-2`, sempre visíveis.
(b) formulário no tema `canvas`: labels visíveis acima (Archivo 500 `--fs-sm`), inputs fundo `--c-white`, borda `--c-line-strong`, `--r-xs`, altura ≥ 48px; foco: borda `--c-ink` + `outline` `--c-focus`. Checkboxes de serviço = "chips" (label clicável ≥44px, borda 1px; marcado: fundo `--c-ink`, texto `--c-canvas`, ✓ mono) em `fieldset`/`legend`. Erro: texto `--c-error` com "Erro:", borda `--c-error`. Status `aria-live` em bloco com filete esquerdo. Botões: "Enviar pelo WhatsApp" (primário) e "Enviar por e-mail" (secundário).

**Contato `#contato` (preto):** e-mail/WhatsApp/Instagram como links gigantes em display condensado `--fs-3xl` empilhados, com rótulo mono acima e seta "↗"; hover: sublinhado desenha + `--c-link-hover`. Local "Campinas e região — SP".

**WhatsApp flutuante `a[data-whatsapp-float]`:** `--wa-size` 56px, `position: fixed; right/bottom: max(var(--sp-4), env(safe-area-inset-*))`, `z-index: var(--z-float)`, `--r-pill`, fundo `--c-paper`, ícone `--c-black` (24px, SVG inline com `aria-hidden`), `aria-label="Falar no WhatsApp"`. Hover: expande rótulo mono "WHATSAPP" à esquerda. Some (`opacity`/`pointer-events`) com menu mobile aberto; sobe acima do footer se sobrepor.

**Footer:** preto, filete superior; marca gigante "CHAGAS CREATIVE" em Archivo expandido, `--fs-4xl`, `--c-text-3` (decorativo, `aria-hidden` se repetido); linha mono: `© 2019–<ano> · Campinas — SP · Voltar ao topo ↑`; links `--c-text-2` sublinhados.

**Lightbox:** `--c-scrim`, mídia centrada, barra inferior mono `03 / 12 · TÍTULO · 1920×1080`, botões 44×44 reta, foco preso, Esc fecha.

## 8. Imagens
Reais apenas; `object-fit: cover`; proporções `--ar-*`; sem cantos arredondados; sem filtros coloridos. Fotos podem receber `--c-veil` para legenda sobreposta. Placeholder sempre declara o que falta.

## 9. Índice de tokens v3
- **Novos:** `--c-black`, `--c-letterbox`, `--c-graphite(-2,-3)`, `--c-gray`, `--c-signal(-hi,-light,-tint)`, `--c-rec`, `--c-line-dark-strong`,
  `--c-link-hover`, `--c-veil-hero`, `--fstretch-wide`, `--fs-quote`, `--letterbox-h`, `--hero-min-h`, `--wa-size`, `--z-float`,
  `--dur-blink`, `--ease-cine`, `--grain-image`.
- **Mantidos com valor novo:** todos os v1/v2 (`--c-chrome*`, `--c-canvas*`, `--c-blue*`, `--c-navy`, `--c-select`, `--c-paper*`, `--c-ink*`, `--c-accent*`,
  semânticas, `--f-*`, `--fs-*`, `--sp-*`, `--r-*`, `--dur-*`, `--ease-*`, etc.). `--f-serif` voltou a ser serifa real; `--f-script` → serifa.
- **Obsoletos (definidos só por compat):** `--c-dot-*`, `--c-wave`, `--c-cream`, `--tilt-badge`, `--shadow-panel`, `data-theme="paper"`.
