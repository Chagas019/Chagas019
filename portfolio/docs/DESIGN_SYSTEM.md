# DESIGN SYSTEM — CHAGAS CREATIVE (v4 "Sala escura / Produto")

Dono: Agente 4 Design System. Valores: `assets/css/tokens.css` (única fonte). Briefings: `docs/BRIEFING.md` (conteúdo/contrato) + `docs/BRIEFING_V4.md`.
v4 evolui a v3: **mesma paleta e mesmos nomes de token/`data-theme`**; o visual "flat e cru" vira **superfícies em camadas** com acabamento de produto.

## 1. Princípios
1. **Sala escura, um acento.** Preto/grafite/papel + tally REC (`--c-signal*`) ≤ 5% da tela: CTA primário, foco, seleção, ponto REC, hover de link.
2. **Camadas, não caixas.** Card = `--surface-1` + hairline + `--highlight-top` + `--elev-1`. Hover sobe 1 nível (`--surface-2`, `--elev-2`, `--lift-y`). Nunca sombra pesada nem gradiente chamativo.
3. **Raio concêntrico.** Interno = externo − padding (card 20 com mídia recuada 8 → mídia `--r-tile` 12). Botões/chips/badges = pílula.
4. **Ritmo de 8px.** Tudo em `--sp-*` (4 e 12 só como meio-passo em UI densa). Padding de card generoso (`--card-pad` 24–32).
5. **Hierarquia por papel**, não por tamanho solto: `display / h1 / h2 / h3 / body / small / caption / mono`.
6. **Estados explícitos** em todo interativo: default · hover · focus-visible · active · selected · disabled. Nada depende só de cor.
7. **Mobile primeiro.** Alvos ≥ 44px, texto ≥ 12px, nada espremido; assinatura de estúdio (caixa de seleção W×H, timecode, grão) continua.

## 2. Tokens
| Grupo | Tokens | Valor (preto · grafite `blue` · profundo `navy` · papel `canvas`) |
|---|---|---|
| Superfícies | `--surface-0` fundo · `-1` card · `-2` card elevado/hover · `-3` input/chip | `#0A0A0A/141414/1C1C1C/242424` · `#1F1F1F/272727/2E2E2E/353535` · `#161616/1E1E1E/252525/2C2C2C` · `#ECEBE8/F7F6F3/FFFFFF/E2E1DD` |
| Bordas | `--border-hairline` (decorativa) · `--border-strong` (hover/divisor) · `--c-border-strong` (UI ≥3:1) | branco 8%/16% (grafite 9/18%) · papel: preto 8%/16% · UI: `#808080` escuro, `#7A7A7A` papel |
| Brilho | `--highlight-top` | `inset 0 1px 0` branco 6% (grafite 7%; papel 85%) |
| Elevação | `--elev-1` repouso · `--elev-2` hover/menu · `--elev-3` lightbox/modal | escuro: pretos 45–80%; papel: `rgba(20,18,12,.06–.24)` |
| Foco | `--ring-focus` | `0 0 0 2px surface-0, 0 0 0 4px --c-focus` (`#FF7A45` escuro, `#9A3412` papel) |
| Raios | `--r-xs 6` · `--r-sm 10` · `--r-tile 12` · `--r-md 16` · `--r-card 20` · `--r-panel`/`--r-lg 28` · `--r-pill 999` | `--r-0` = 0 (letterbox, filetes) |
| Espaço | `--sp-1..11` = 4·8·12·16·24·32·48·64·96·128·192 | `--sp-section`, `--sp-gutter` (16 no mobile), `--card-pad`, `--card-gap 16`, `--card-inset 8` |
| Botão | `--btn-h-sm/md/lg` 44/48/56 · `--btn-px-*` 16/24/32 · `--btn-fs-*` xs/sm/base · `--btn-r` pílula · `--btn-icon` 44 · `--btn-gap` 8 | |
| Chip/badge | `--chip-h` 44 · `--chip-px` 16 · `--chip-bg(-hover,-active)` · `--chip-fg-active` · `--chip-border` · `--badge-h` 24 · `--badge-px` 12 | ativo = `--c-text` / `--c-bg` (invertido) |
| Input | `--input-h` 48 · `--input-h-lg` 56 · `--input-px` 16 · `--input-r` 10 · `--input-bg` · `--input-border(-hover,-focus)` · `--textarea-min-h` 128 | escuro: bg surface-3, borda `#808080`; papel: bg branco, borda `#7A7A7A` |
| Card | `--card-bg(-hover)` · `--card-border(-hover)` · `--card-shadow(-hover)` | compostos: resolvem por tema |
| Nav | `--nav-bg` (preto 72% / papel 80%) · `--nav-blur 16px` · `--nav-item-h 44` | |
| Movimento | `--dur-*`, `--ease-out/cine/snap` + `--ease-spring` (press, chip) · `--ease-std` (superfície) · `--press-scale .98` · `--lift-y -2px` · `--o-disabled .42` | reduced-motion zera durações, press 1, lift 0 |

**Regra de herança:** tokens compostos (`--card-*`, `--chip-*-active`, `--ring-focus`, `--input-border-focus`) são declarados em `:root, [data-theme]` para resolver com as cores do tema local. Em CSS de componente use sempre `var(--token, fallback)`.
**Valores alterados na v4:** `--r-xs/sm/tile/card/panel` (de 0–4 → 6–28), `--c-paper-mute` #8C8C8C→#999999, `--c-line-dark-strong` #6E6E6E→#808080, `--fs-mono` 11–12→12–13, `--lh-snug` 1.1→1.12.

## 3. Tipografia
Fontes inalteradas: Archivo (variável, `wdth` 62–125), Instrument Serif itálico (1–3 palavras de acento, citações), JetBrains Mono (timecode, W×H, preços, rótulos; `tabular-nums`).
| Papel | Token | px (360→1600) | Peso / largura | lh | ls |
|---|---|---|---|---|---|
| display | `--fs-display` | 52–176 | 800, condensado 72%, caixa-alta | `--lh-display` .88 | `--ls-display` −.01em |
| h1 (seção) | `--fs-h1` | 40–88 | 800, condensado | `--lh-heading` 1.05 | `--ls-display` |
| h2 | `--fs-h2` | 28–48 | 700, condensado | 1.05 | `--ls-heading` −.015em |
| h3 (card) | `--fs-h3` | 22–32 | 600, 100% | `--lh-title` 1.2 | `--ls-heading` |
| body | `--fs-body` | 16–18 | 400 | `--lh-body` 1.6 | 0 · ≤ `--measure` |
| small / UI | `--fs-small` | 14–15 | 500 | `--lh-ui` 1.25 | `--ls-ui` .02em |
| caption | `--fs-caption` | 12–13 | 400, `--c-text-3` | 1.45 | 0 |
| mono | `--fs-mono` | 12–13 | 500, caixa-alta | 1.25 | `--ls-mono` .08em (rótulo curto: `--ls-caps` .12em) |
`text-wrap: balance` em títulos; `pretty` em parágrafos; `font-synthesis: none`. Máx. 2 tamanhos de texto por card + 1 mono.

## 4. Contraste WCAG 2.x (calculado; mín. sobre surface-0…3 do tema)
| Texto / UI | Preto | Grafite `blue` | Profundo `navy` | Uso |
|---|---|---|---|---|
| `--c-paper` #F2F1EE | 13.74 | 10.86 | 12.36 | texto principal |
| `--c-paper-dim` #ADADAD | 6.92 | 5.47 | 6.22 | `--c-text-2` (preto) / `--c-text-3` (blue, navy) |
| `--c-blue-tint` #BDBDBD | 8.26 | 6.53 | 7.43 | `--c-text-2` em blue/navy |
| `--c-paper-mute` #999999 | 5.45 | **4.77 (s0–2); 4.31 em s3 ✗** | 4.90 | `--c-text-3` no preto; em grafite usar `--c-text-3` |
| `--c-signal-light` #FF7A45 | 6.00 | 4.74 | 5.40 | texto-acento, foco, alças |
| `--c-error-dark` #FF8F87 | 7.05 | 5.57 | 6.34 | erro no escuro |
| `--c-line-dark-strong` #808080 | 3.93 | 3.11 | 3.54 | borda de input/chip (UI ≥3) |

| Papel `canvas` (s0 #ECEBE8 · s1 #F7F6F3 · s2 #FFF · s3 #E2E1DD) | mín. | Uso |
|---|---|---|
| `--c-ink` / `--c-ink-2` / `--c-ink-3` | 15.13 / 7.33 / 5.11 | texto 1/2/3 |
| `--c-signal-hi` #9A3412 | 5.58 | texto-acento, link hover, foco |
| `--c-error` #B42318 / `--c-success` #176F3D | 5.02 / 4.75 | mensagens (sempre com texto "Erro:") |
| `--c-line-strong` #7A7A7A | 3.28 | borda de input (UI) |
| branco sobre `--c-signal` / `--c-signal-hi` | 5.18 / 7.31 | botão primário / hover |
| `--c-ink` sobre `--c-select` #F7DDCF | 15.27 | linha selecionada |
**Proibido:** `--c-signal` como texto (preto 3.82, papel 4.34); `--c-signal-light` no papel (2.17); `--border-hairline`/`--c-line*` como texto ou única borda de controle; `--c-paper-mute` direto em `--surface-3` grafite.

## 5. Temas (`data-theme`)
*(sem tema)* preto — hero, portfólio, contato, footer · `blue` grafite — serviços, produtos · `navy` grafite profundo — ferramentas, projetos · `canvas` (`paper` compat) papel — sobre, formulário. Nunca dois temas iguais adjacentes (exceto preto↔preto com filete). Superfícies sempre relativas ao tema: card no papel = `--surface-1` #F7F6F3 com `--elev-1` quente.

## 6. Componentes (estados: D default · H hover · F focus-visible · A active · S selected · X disabled)
Foco universal: `outline: var(--bw-focus) solid transparent` (forced-colors) + `box-shadow: var(--ring-focus)`; em elementos já com sombra, concatenar: `var(--ring-focus), var(--card-shadow)`.
Transições: cor/borda `--dur-fast --ease-std`; elevação/transform `--dur-base --ease-out`; press `--dur-instant --ease-spring`. Disabled: `opacity: var(--o-disabled)`, `cursor: not-allowed`, sem hover, `aria-disabled`.

**Card (base):** `--card-bg`, `1px solid --card-border`, `--r-card`, `--card-shadow`, padding `--card-pad`, gap `--card-gap`, `overflow: clip`.
H: `--card-bg-hover`, `--card-border-hover`, `--card-shadow-hover`, `translateY(var(--lift-y))`. F: ring. A: `scale(.995)`. Mídia full-bleed no topo herda o raio pelo `overflow`; mídia recuada usa `--card-inset` + `--r-tile`.

**Botão:** pílula `--btn-r`, `inline-flex` centrado, gap `--btn-gap`, Archivo 600 caixa-alta `--ls-caps` (sm/md) · tamanhos sm/md/lg = `--btn-h-*`/`--btn-px-*`/`--btn-fs-*` (md padrão; lg no hero e CTA final; sm em toolbars).
Primário: `--c-accent` + `--c-on-accent` + `--highlight-top`; H `--c-accent-hi` + `--elev-1`; A `scale(var(--press-scale))`. Secundário: transparente, `1px --c-border-strong`, texto `--c-text`; H fundo `--surface-2`, borda `--c-text`. Ghost: sem borda, H `--surface-2`. Só-ícone: `--btn-icon` circular, `aria-label`. Link-texto: sublinhado 1px offset .25em, H `--c-link-hover`.

**Chip (interativo: filtros, checkboxes de serviço):** altura `--chip-h`, `--chip-px`, `--chip-r`, `--chip-bg`, `1px --chip-border`, mono `--fs-mono` `--ls-mono`.
H `--chip-bg-hover`; S (`aria-pressed="true"`/`:checked`): `--chip-bg-active` + `--chip-fg-active` + prefixo "✓" (não só cor); A press-scale com `--ease-spring`; F ring.
**Badge (não interativo):** `--badge-h`, `--badge-px`, `--badge-r`, mono `--fs-mono`. `REALIZADO` sólido `--c-text`/`--c-bg` · `PESSOAL` contorno 1px `currentColor` · `CONCEITUAL` contorno tracejado + "◇" · status: texto `--c-signal-light` + ponto REC 6px.

**Input / textarea / select:** label visível acima (Archivo 500 `--fs-small`, gap `--sp-2`); `--input-h`, `--input-px`, `--input-r`, `--input-bg`, `1px --input-border`, texto `--c-text` `--fs-body` (16px evita zoom iOS); placeholder `--c-text-3`.
H `--input-border-hover`. F borda `--input-border-focus` + ring. Erro: borda `--c-error` (`--c-error-dark` no escuro), `aria-invalid`, mensagem "Erro: …" `--fs-small` abaixo. X: bg `--surface-2`, opacity. Textarea `min-height: --textarea-min-h`.

**Nav:** header fixo `--header-h`, `--nav-bg` + `backdrop-filter: blur(var(--nav-blur)) saturate(140%)`, filete inferior `--border-hairline`.
Itens: altura `--nav-item-h`, padding `0 var(--sp-3)`, `--r-pill`, `--fs-small` `--c-text-2`. H `--c-text` + fundo `--surface-2`. Atual (`aria-current`): `--c-text` + ponto `●` `--c-signal-light`. Menu mobile: painel `--surface-0` tela cheia, itens `--fs-h2` condensados numerados mono, stagger, foco preso, Esc fecha.

**Project card (`#projetos`, portfólio):** card base; mídia topo `--ar-photo`/`--ar-wide` full-bleed; corpo: badge(s) → título `--fs-h3` → `role` mono `--c-text-3` → `summary` `--c-text-2` (3 linhas, `line-clamp`).
H: card H + imagem `--hover-scale` + **assinatura**: caixa de seleção 1px `--c-signal-light` desenhada em `--dur-draw` dentro da mídia (inset `--sp-2`), 4 alças `--handle` (`--r-0`), rótulo `W×H` mono em pílula `--c-signal`/branco. Mesmo estado em F. Sem capa: quadro `--surface-2` com título condensado + marcas de corte.

**Pricing row (`#orcamento`):** grupo = card base com título mono `FOTOGRAFIA` + hairline; linha: flex `label ··· preço`, min-height 48, padding-block `--sp-3`, divisor `--border-hairline`; preço mono `tabular-nums` à direita `--c-text`; `desc` `--fs-caption` `--c-text-3`.
H (se clicável): fundo `--surface-2`, `--r-sm`, margem negativa `--sp-3` para o realce não encostar. Disclaimer sempre visível `--fs-small` `--c-text-2`.

**Product card (`#produtos`):** card base, mídia `--ar-port` recuada (`--card-inset`, `--r-tile`); sem imagem → `--surface-3` + marcas de corte + mono "PRÉVIA EM PRODUÇÃO".
Corpo: `kind` badge → nome `--fs-h3` → descrição body `--c-text-2` → "Aplicação:" → rodapé com hairline superior: preço mono `--fs-lg` (`a partir de R$ X` / "Sob consulta") + "Disponibilidade: a confirmar" `--c-text-3` + botão secundário **sm** "Tenho interesse". H/F card base.

**Lightbox:** `--c-scrim` + mídia centrada `--r-md`, `--elev-3`, máx. 92vw/82svh; entrada `opacity` + `scale(.98→1)` em `--dur-page --ease-out`.
Barra inferior: pílula `--surface-1` 90% + `--nav-blur`, mono `03 / 12 · TÍTULO · 1920×1080`. Botões só-ícone `--btn-icon` circulares `--surface-2`, H `--surface-3`, F ring. Foco preso, Esc fecha, ←/→ navega, devolve foco.

**WhatsApp flutuante:** `--wa-size`, `--r-pill`, fundo `--c-paper`, ícone `--c-black`, `--elev-2`; H `--elev-3` + rótulo mono; `z-index: --z-float`.

## 7. Imagens e cinema
Reais apenas, `object-fit: cover`, `--ar-*`. **v4:** mídia dentro de card/lightbox é arredondada (herda raio); hero, letterbox e mídia full-bleed de seção continuam retos (`--r-0`). Grão, timecode, ponto REC e marcas de corte como na v3 (decorativos `aria-hidden`).
Reduced motion: durações 0, `--press-scale 1`, `--lift-y 0`, `--ease-spring` → `--ease-out`; nada depende de animação.

## 8. Índice v4
- **Novos:** `--surface-0..3`, `--border-hairline/-strong`, `--c-border-strong`, `--highlight-top`, `--elev-1..3`, `--ring-focus`, `--r-md`, `--r-lg`, `--fs-display/h1/h2/h3/body/small/caption`, `--lh-display/heading/title/body/ui`, `--ls-heading/ui/mono`, `--btn-*`, `--chip-*`, `--badge-*`, `--input-*`, `--textarea-min-h`, `--card-*`, `--nav-bg/-blur/-item-h`, `--o-disabled`, `--press-scale`, `--lift-y`, `--ease-spring`, `--ease-std`.
- **Valor novo:** `--r-xs/sm/tile/card/panel`, `--c-paper-mute`, `--c-line-dark-strong`, `--fs-mono`, `--lh-snug`. Todos os demais nomes v1–v3 mantidos.
- **Obsoletos (compat):** `--c-dot-*`, `--c-wave`, `--c-cream`, `--tilt-badge`, `--shadow-panel` (use `--elev-*`), `data-theme="paper"`.
