# Identidade visual — JESUS Remix

## Conceito: "Oração em movimento"
O artista em gesto de oração (contemplação) encontra a energia da pista (remix).
Tensão central: **quietude × pulso**. O tabuleiro amarelo/azul ondulado é o "chão de pista"
que se dobra como uma onda sonora; o título JESUS é monumental e estável (âncora),
o "remix" é manuscrito, vivo, quase um gesto de mão — a assinatura do remix sobre o sagrado.

## Paleta (amostrada da referência)
| Token | Hex | Uso |
|---|---|---|
| `--azul` | `#037AF4` | fundo dominante (≥60% da área) |
| `--azul-profundo` | `#0A4F96` | extrusão do título, sombras, vinhetas |
| `--amarelo` | `#EAC11A` | tabuleiro lateral, acentos de ritmo |
| `--magenta` | `#F833F8` | título JESUS (único elemento magenta grande) |
| `--branco` | `#F9F9F9` | "remix", logotipo, data, UI |
| `--tinta` | `#0B0B14` | apenas contornos/legibilidade, nunca fundo |
Regra 60/25/10/5: azul / amarelo / magenta / branco.

## Tipografia
- **JESUS** — EM APROVAÇÃO: (A) Dela Gothic One comprimida 0.8×1.16 (estáticos) ou (B) Bungee esticada 1.32× vertical (motion). Uma só será adotada em todas as peças, extrusão sólida azul-profundo 6–8% da altura da letra, deslocada para baixo-direita.
- **remix** — Yellowtail (script contínuo), branco, rotação −6°, sobrepondo a base do título.
- **ANDRÉ × CASTRO / datas / UI** — Roboto Mono 300/400, caixa alta, tracking +6%.
- Números do countdown — Dela Gothic One.

## Elementos
- Tabuleiro ondulado (SVG gerado por função seno → animável), sempre nas bordas, nunca atrás do rosto.
- Marca ✕ + globo (topo), mantida pequena.
- Grão de papel 3–5% de opacidade sobre tudo + leve "speckle" branco.
- Recorte do artista com corte inferior escondido pelo título.

## Linguagem de movimento
- Curvas: entrada `expo.out`, saída `power3.in`; nada linear exceto o loop do tabuleiro.
- Tabuleiro ondula em loop contínuo (fase = tempo × BPM/60 quando houver áudio).
- Impactos: escala 1.00→1.04 + flash de 2 quadros + shake ≤ 6 px. Nunca glitch genérico.
- Profundidade: 3 camadas (tabuleiro → artista → título) com parallax 1 : 1.6 : 2.2.
