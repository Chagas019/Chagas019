# Chagas — Design System

> Fonte de verdade visual. Tokens implementados em `portfolio/assets/css/tokens.css`.
> Nomes de tokens são **contrato estável** com o dev: não renomear sem atualizar os dois arquivos.

## 1. Conceito — "Sala escura"

O site é uma **sala de projeção**: escuro, silencioso, com uma única fonte de luz quente (tungstênio)
que aponta para o trabalho. A interface recua; a imagem lidera. Linguagem de **revista editorial impressa
+ claquete de cinema**: tipografia condensada enorme, índices numerados, timecodes, filetes finos, legendas
técnicas em mono, um toque de serifa itálica autoral.

Três pilares:
1. **Imagem primeiro** — nada compete com a foto/vídeo. Sem cards com sombra, sem gradientes decorativos.
2. **Ritmo editorial** — assimetria intencional, respiro generoso, escala tipográfica extrema (12rem vs 0.75rem).
3. **Detalhe de película** — grão sutil, perfurações de filme, contagem `01 / 06`, timecode `00:00:12:04`.

Coerência com o trabalho existente (aberturas "Comunica+Fé"): preto quente, laranja de luz, display condensado
em caixa-alta. O portfólio refina isso: menos objetos 3D, mais tipografia e fotografia.

### Referências de estilo (descritas, não copiadas)
- Revistas de moda/cinema independentes: grandes títulos condensados sangrando a margem, legendas mínimas.
- Sites de produtoras e diretores de fotografia: índice de projetos em **lista**, preview de imagem no hover.
- Fichas técnicas de festival: metadados em mono (câmera, lente, ano, cliente).
- Folhas de contato e tiras de negativo: grids de miniaturas com perfuração e numeração.

**Evitar:** glassmorphism, neon, gradientes roxos, grids de cards iguais, ícones genéricos, parallax exagerado,
cursores "bolha" elásticos, textos que digitam sozinhos, emojis.

## 2. Paleta

| Token | Hex | Uso |
|---|---|---|
| `--c-ink` | `#0C0B0A` | Fundo principal |
| `--c-ink-2` | `#151412` | Superfície (preços, form) |
| `--c-ink-3` | `#1E1C19` | Hover de superfície, inputs |
| `--c-line` | `#2E2B27` | Filetes 1px decorativos |
| `--c-line-strong` | `#6E675D` | Borda de input (componente de UI) |
| `--c-paper` | `#EDE6DA` | Texto principal; fundo de seção invertida |
| `--c-paper-dim` | `#A8A095` | Texto secundário |
| `--c-paper-mute` | `#878075` | Metadados, legendas |
| `--c-accent` | `#E8692E` | Tungstênio — acento único |
| `--c-accent-hi` | `#F07A3E` | Hover do acento |
| `--c-accent-deep` | `#9A3E16` | Acento sobre fundo claro |
| `--c-error` / `--c-success` | `#D9564A` / `#6FA37A` | Validação de formulário |

### Contraste (WCAG 2.1, calculado pela fórmula de luminância relativa)

| Texto / elemento | Fundo | Razão | Resultado |
|---|---|---|---|
| paper `#EDE6DA` | ink | **15.86:1** | AAA |
| paper | ink-3 | 13.71:1 | AAA |
| paper-dim `#A8A095` | ink | 7.61:1 | AAA |
| paper-dim | ink-3 | 6.58:1 | AA |
| paper-mute `#878075` | ink | 5.03:1 | AA |
| paper-mute | ink-2 | 4.71:1 | AA |
| paper-mute | ink-3 | 4.35:1 | **só texto ≥ 24px / 19px bold** |
| accent `#E8692E` | ink | 6.08:1 | AA |
| accent | ink-3 | 5.25:1 | AA |
| ink sobre accent (botão) | accent | 6.08:1 | AA |
| ink sobre accent-hi (hover) | accent-hi | 7.08:1 | AAA |
| paper sobre accent | accent | 2.61:1 | **PROIBIDO** |
| ink | paper | 15.86:1 | AAA |
| `#5A544C` (inv-text-2) | paper | 6.03:1 | AA |
| accent-deep `#9A3E16` | paper | 5.51:1 | AA |
| accent (`#E8692E`) | paper | 2.61:1 | **PROIBIDO como texto** |
| line-strong (borda input) | ink / ink-2 | 3.52 / 3.30:1 | AA não-texto (1.4.11) |
| error `#D9564A` / success `#6FA37A` | ink | 5.04 / 6.74:1 | AA |

Regras: o acento ocupa **< 5% da tela** (um ponto, um sublinhado, um botão, o `+`). Nunca dois acentos.
Erro nunca só por cor: sempre com texto. Seções claras usam `data-theme="paper"` (tokens semânticos se reescrevem).

## 3. Tipografia

Google Fonts (no `<head>`, não usar `@import`):
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,100..900&family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;500&display=swap">
```

| Papel | Família | Config |
|---|---|---|
| Display | **Archivo** (variável) | `font-stretch: var(--fstretch-display)` (72%), peso 800, UPPERCASE, `--lh-tight`, `--ls-display` |
| Corpo / UI | **Archivo** | stretch 100%, 400/500, `--lh-relaxed`, máx. `--measure` |
| Acento autoral | **Instrument Serif** *itálico* | 1–3 palavras dentro de títulos ("histórias *que ficam*"); nunca parágrafos |
| Técnico | **JetBrains Mono** 400/500 | `--fs-mono`, UPPERCASE, `--ls-caps`: índices, timecode, metadados, rótulos |

Escala fluida (360 → 1600px): `--fs-mono` 11–12 · `--fs-xs` 12–13 · `--fs-sm` 14–15 · `--fs-base` 16–18 ·
`--fs-lg` 18–22 · `--fs-xl` 22–32 · `--fs-2xl` 28–48 · `--fs-3xl` 36–72 · `--fs-4xl` 48–112 · `--fs-hero` 56–192.
Hierarquia: H1 hero `--fs-hero`; H2 seção `--fs-4xl`; H3 projeto `--fs-2xl`; lead `--fs-lg`; corpo `--fs-base`.
Use `text-wrap: balance` em títulos e `font-variant-numeric: tabular-nums` em números/preços.

## 4. Espaçamento e grid

Base 4px: `--sp-1` 4 · `--sp-2` 8 · `--sp-3` 12 · `--sp-4` 16 · `--sp-5` 24 · `--sp-6` 32 · `--sp-7` 48 ·
`--sp-8` 64 · `--sp-9` 96 · `--sp-10` 128 · `--sp-11` 192. Fluidos: `--sp-section` (80–176px entre seções),
`--sp-section-sm`, `--sp-gutter` (margem lateral 16–40px).

Grid: 12 colunas, `--grid-gap`, largura máx. `--grid-max` (1600px), texto em `--grid-narrow` (960px).
Breakpoints: 600 / 900 / 1200 / 1600px (mobile-first). Mobile: 4 colunas efetivas (spans viram 1/1).

Padrões assimétricos (desktop):
- **Offset editorial**: título `1 / 8`, texto `8 / 12` deslocado para baixo `--sp-9`.
- **Sangria**: imagem `1 / -1` full-bleed seguida de legenda mono em `9 / 13`.
- **Escada**: imagens alternando `2 / 7` e `7 / 12` com `margin-top` desiguais (`--sp-8`, `--sp-10`).
- **Coluna de nota**: rótulo mono em `1 / 3`, conteúdo `4 / 12` (seções de serviço/preço).
Regra: nunca duas seções seguidas com o mesmo padrão.

## 5. Componentes

**Header / nav** — fixo, altura `--header-h`, fundo transparente → `--c-ink` com filete `--c-line` após 80px de scroll.
Esquerda: logotipo "CHAGAS" display condensado. Direita: links mono UPPERCASE (Trabalhos, Serviços, Sobre, Contato)
com índice `01–04`. Ativo: ponto acento à esquerda. Mobile: botão "MENU" (texto, não hambúrguer) abre overlay
tela cheia `--z-menu` com links em `--fs-3xl`, entrada em cortina `--ease-in-out`. Esconde ao rolar para baixo,
reaparece ao rolar para cima.

**Hero** — 100svh. Vídeo/reel em loop mudo (poster obrigatório) com `--c-veil` embaixo e `--c-glow` sutil.
Título `--fs-hero` sangrando em 2 linhas com uma palavra em serifa itálica. Rodapé do hero: linha mono com
`FOTOGRAFIA · AUDIOVISUAL · MOTION`, local e `↓ ROLE`. Sem botões grandes no hero; um link textual "Ver trabalhos".

**Índice de projetos (lista)** — substitui grid de cards. Cada linha: `nº` mono · título `--fs-2xl` display ·
categoria · ano, separadas por `--c-line`. Hover (pointer fine): título desloca 12px, número vira acento, e um
preview flutuante (4:5, 320px) segue o cursor com atraso (`--dur-base`). Toque: preview inline abaixo da linha.
Filtros como chips mono pílula (`--r-pill`), ativo com fundo paper / texto ink.

**Galerias** (cantos retos `--r-0`, sempre com `aspect-ratio` dos tokens `--ar-*`):
- *Mosaico*: grid 12 col com spans 7+5, 4+8, 12 (cine); ritmo irregular, nunca linhas iguais.
- *Destaque (featured)*: uma imagem `--ar-cine` sangrando + 2 menores em escada + texto em coluna de nota.
- *Film-strip*: faixa horizontal com scroll-snap, perfurações (pseudo-elementos) em cima/baixo, contador
  `03 / 12` e timecode mono; navegável por teclado (setas) e arrastar; Reels em `--ar-reel`.
- *Antes/depois* (4K): slider com handle 2px paper + rótulos "ANTES"/"DEPOIS" mono; `input[type=range]` acessível.

**Detalhe de projeto** — capa full-bleed; ficha técnica em lista de definição mono (Cliente, Ano, Função, Equipamento,
Entrega); texto curto (≤ 120 palavras); galeria; navegação "Próximo projeto →" com título gigante no rodapé.

**Lightbox** — `--z-lightbox`, fundo `--c-scrim`. Abre com máscara "obturador" (clip-path inset de 50% → 0) em
`--dur-page` `--ease-shutter`. Controles mono: `FECHAR (ESC)`, `← →`, contador. Foco preso no modal, retorno do
foco ao gatilho, `aria-modal="true"`, swipe no mobile. Vídeos nunca autoplay com som.

**Planos / preços** — 3 colunas assimétricas (não cards idênticos): coluna de nota à esquerda com nome do plano em
display; preço `--fs-3xl` tabular; lista de itens com filete. Plano recomendado: marcador mono "RECOMENDADO"
em acento + borda superior 2px acento (não badge colorido). Contratos mensais em linha própria com toggle mensal/projeto.

**Formulário de contato** — campos com só borda inferior `--c-line-strong` (≥3:1), label mono acima (sempre visível,
nunca só placeholder), foco: borda vira `--c-accent` + outline. Tipos de serviço como chips selecionáveis.
Erro: texto `--c-error` + ícone + `aria-describedby`. Envio: botão primário; sucesso com mensagem textual.

**Footer** — e-mail/WhatsApp em `--fs-4xl` como CTA final ("Vamos filmar?"), linha mono com redes, cidade,
© ano e "voltar ao topo". Grão + glow quente sutil na base.

**Botões** — *Primário*: fundo `--c-accent`, texto `--c-on-accent`, pílula, padding `--sp-3 --sp-5`, mono UPPERCASE;
hover `--c-accent-hi`. *Secundário*: borda 1px paper, transparente; hover inverte (paper/ink). *Texto*: link mono
com seta `→` que avança 4px no hover. Alvo mínimo 44×44px. Foco: `outline: var(--bw-focus) solid var(--c-focus);
outline-offset: 3px` em tudo que é focável (nunca remover).

**Links no texto** — paper com sublinhado 1px `--c-paper-mute` (`text-underline-offset: .2em`); hover: sublinhado acento.

## 6. Movimento

Princípio: **movimento de câmera, não de aplicativo** — entradas lentas e decididas, sem quique, sem elástico.

| Token | Valor | Uso |
|---|---|---|
| `--dur-fast` | 180ms | cor, opacidade de hover |
| `--dur-base` | 320ms | menus, preview do índice |
| `--dur-slow` | 640ms | reveal de texto/imagem |
| `--dur-slower` | 960ms | hero, máscaras grandes |
| `--dur-page` | 720ms | página / lightbox |
| `--stagger` | 70ms | sequência entre itens |
| `--ease-out` | `cubic-bezier(.22,1,.36,1)` | padrão de entrada |
| `--ease-in` | `cubic-bezier(.55,0,.78,0)` | saídas |
| `--ease-in-out` | `cubic-bezier(.76,0,.24,1)` | cortinas, menu |
| `--ease-shutter` | `cubic-bezier(.83,0,.17,1)` | lightbox, wipes |

Padrões:
- **Reveal de título**: linhas sobem `100%` dentro de máscara (`overflow:hidden`), `--dur-slow`, stagger por linha.
- **Reveal de imagem**: `clip-path: inset(100% 0 0 0)` → `inset(0)` + escala 1.08 → 1, `--dur-slower`.
- **Texto corrido**: só fade + `--reveal-distance` (24px). Disparo via IntersectionObserver (threshold .15), uma vez.
- **Hover de imagem**: escala `--hover-scale` (1.03) em `--dur-slow`; nunca rotação/tilt 3D.
- **Página**: cortina ink cobre e revela (`--ease-in-out`, `--dur-page`); opcional View Transitions API com fallback.
- **Film-strip / marquee**: linear, pausa no hover e com `:focus-within`.
- Animar apenas `transform`, `opacity`, `clip-path`. Nada de animar `width/top/left`.

**prefers-reduced-motion: reduce** — tokens de duração vão a 0, `--reveal-distance` 0, `--hover-scale` 1 (já em
`tokens.css`). Além disso o dev deve: pausar vídeos de fundo (mostrar poster + botão play), parar marquees,
desligar cursor/preview que segue o mouse, trocar transição de página por corte seco. Conteúdo nunca depende de
animação para aparecer (estado inicial visível sem JS).

## 7. Imagem e vídeo

- Tratamento: preto profundo, realces quentes, pele natural; nada de filtros saturados ou HDR exagerado.
- Grão global: SVG noise em overlay `--z-grain`, opacidade `--grain-opacity` (.06), `pointer-events:none`, estático.
- Formatos: AVIF/WebP com fallback JPG; `srcset` + `sizes`; `loading="lazy"` exceto hero; `width/height` sempre.
- Vídeo: `muted playsinline loop`, `preload="metadata"`, poster; versão leve (≤ 6 MB) para hero; legendas quando houver fala.
- `alt` descritivo e factual ("Noivos sob chuva de arroz na saída da igreja"), nunca "imagem1".
- Proporções permitidas: `--ar-cine`, `--ar-wide`, `--ar-photo`, `--ar-port`, `--ar-reel`, `--ar-square`.
- **Não usar fotos de banco como se fossem do Chagas.** Projetos sem mídia real ficam como placeholder neutro
  (fundo `--c-ink-2`, rótulo mono "EM BREVE") até haver material próprio.
- Trabalhos reais disponíveis: realce 4K (gameplay + comparativo antes/depois), motion "moto-personagem",
  aberturas Comunica+Fé (desktop/mobile), ilustração Carlo Acutis.

## 8. Voz e tom (copy)

- **Quem fala**: um autor, primeira pessoa do singular, pt-BR. Confiante, preciso, caloroso — nunca vendedor.
- Frases curtas. Verbos concretos (filmar, enquadrar, montar, entregar). Um adjetivo por frase, no máximo.
- Títulos: 2–5 palavras, com uma palavra em serifa itálica para a emoção ("Momentos *que não se repetem*").
- Evitar: "soluções", "qualidade incomparável", "profissionais altamente qualificados", superlativos vazios,
  CAIXA ALTA em frases longas, exclamações.
- Metadados sempre técnicos e honestos: ano, cliente, função, equipamento. Não inventar clientes ou prêmios.
- CTAs específicos: "Reservar data", "Pedir orçamento de casamento", "Falar no WhatsApp" — nunca "Clique aqui".
- Preço: transparente quando possível ("a partir de"), sem asteriscos escondidos.

## 9. Índice de tokens (resumo)

- Cores: `--c-ink, -2, -3`, `--c-line(-strong)`, `--c-paper(-dim, -mute)`, `--c-accent(-hi, -deep)`, `--c-on-accent`,
  `--c-error`, `--c-success`; semânticas `--c-bg, --c-surface(-2), --c-text(-2, -3), --c-border, --c-focus,
  --c-selection, --c-scrim, --c-veil, --c-glow, --c-inv-*`. Tema claro: `[data-theme="paper"]`.
- Fontes: `--f-display, --f-body, --f-serif, --f-mono`, `--fstretch-display/-body`, `--fw-light…--fw-display`.
- Tipo: `--fs-mono, -xs, -sm, -base, -lg, -xl, -2xl, -3xl, -4xl, -hero`; `--lh-*`; `--ls-*`; `--measure(-sm)`.
- Espaço: `--sp-0…--sp-11`, `--sp-section(-sm)`, `--sp-gutter`.
- Grid: `--grid-cols, --grid-gap, --grid-max, --grid-narrow, --header-h`.
- Forma: `--r-0, --r-xs, --r-pill`, `--bw-hair, --bw-focus`, `--shadow-lift`, `--ar-*`.
- Camadas: `--z-below…--z-grain`.
- Movimento: `--dur-instant…--dur-page`, `--stagger`, `--ease-out, -in, -in-out, -shutter, -linear`,
  `--reveal-distance`, `--hover-scale`, `--grain-opacity`.
