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

## Linguagem visual (v2, alinhada à referência)
Ilustração **flat 2D com contorno grosso #2B1B14**, personagens **chibi** e textura de papel suave. A câmera passeia e dá zoom por um mundo ilustrado, com parallax em camadas. Recursos recorrentes: **etiqueta de local e data** no canto superior direito ("AUSCHWITZ · 1941"), **brilhos de 4 pontas** no que é sagrado, fundo **sunburst** nos momentos de glória e faixas vermelhas com contorno para nomes e títulos.
**Regras:** nada de violência gráfica, nada de símbolos de ódio e nada de visual genérico de IA. Personagem sempre via componente oficial.

## Legendas
Karaokê no alto da tela (y=330 px, abaixo da interface do Instagram). Até 26 caracteres por bloco, sobre uma pílula escura translúcida. As palavras já ditas ficam em bege-claro, a palavra atual em branco bold, e as palavras-chave ganham uma **caixa de seleção dourada com alças**.

## Templates
`templates/reels-zonas-seguras.png` · `templates/story-template.png` · capa do episódio (`Cover` em `studio/src/brand/Stills.tsx`, aceita `ep`, `title` e `saint`).
