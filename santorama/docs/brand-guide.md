# SANTORAMA — Guia de identidade

**Conceito:** uma série de animação cinematográfica com a vida dos santos: conversões, lutas, milagres e testemunhos de fé.
**Slogan:** *Histórias que inspiram. Vidas que apontam para Cristo.*
**Público:** jovens católicos, adolescentes e curiosos pela história da Igreja.
**Tom de voz:** reverente sem ser distante, emocionante sem sensacionalismo, sempre fiel aos fatos.

## Logotipo
O emblema é um **arco ogival** (janela de igreja e, ao mesmo tempo, moldura de cinema) com uma **cruz que irradia luz** e um halo. O wordmark **SANTORAMA** usa Cinzel 700 com espaçamento largo.
Arquivos: `brand/santorama-logo.png`, `brand/santorama-perfil-1080.png` (foto de perfil), `brand/santorama-identidade.png` (board). Fonte vetorial: `studio/src/brand/Logo.tsx`.

## Paleta (`studio/src/brand/tokens.ts`)
| Nome | Hex | Uso |
|---|---|---|
| Carvão | #0E0B08 | fundo principal |
| Sépia | #3B2A1E | fundos quentes |
| Terra | #7A4E2D | sombras quentes |
| Ocre | #B07A3A | detalhes |
| Ouro | #D4A24C | destaque, marca |
| Ouro claro | #F1D08A | palavras-chave das legendas |
| Pergaminho | #EFE3C8 | texto |
| Martírio | #8E2A20 | uso pontual (sangue, martírio, rota) |

## Tipografia
- **Cinzel** (títulos, marca, cartelas de data)
- **Cormorant Garamond itálico** (citações, subtítulos)
- **Inter ExtraBold** (legendas do vídeo, por legibilidade no celular)

Todas têm licença SIL OFL e são livres para uso comercial.

## Linguagem visual
Ilustração 2D com textura de pintura digital, luz dramática (chiaroscuro) e granulação de película. Parallax em 4 a 7 camadas, com partículas (poeira, cinzas, brasas) e raios volumétricos. O arco ogival aparece como moldura recorrente.
**Regras:** nada de violência gráfica, nada de símbolos de ódio e nada de visual genérico de IA. Personagem sempre via componente oficial.

## Legendas
Até 24 caracteres por bloco, palavra a palavra, sincronizadas com a voz. Entrada com leve subida e desfoque. Palavras-chave em ouro claro com brilho. Posição em y=1360 px, acima da interface do Instagram (ver `templates/reels-zonas-seguras.png`).

## Templates
`templates/reels-zonas-seguras.png` · `templates/story-template.png` · capa do episódio (`Cover` em `studio/src/brand/Stills.tsx`, aceita `ep`, `title` e `saint`).
