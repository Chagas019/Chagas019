# Design system

Referência visual: painel em "cartão-moldura" com hero em foto/cena, barra superior com recorte central (notch), trilho de ícones à esquerda em vidro, cards brancos com cantos invertidos e card de vidro fosco à direita. Implementado em `prototipo/index.html`.

## Tokens
| Token | Valor | Uso |
|---|---|---|
| navy-950 / 900 / 800 | #0a1230 / #111b45 / #1b2760 | texto forte, botões primários, selo |
| gold-500 / 300 | #c9a45c / #e6cf9b | acento discreto (setas, CTA "Posso ajudar", foco) |
| sky-300 / 100 | #a9c3ea / #e6eefb | complementar, gráficos |
| surface / surface-2 | #fbfbfd / #f2f3f8 | cards |
| glass | rgba(244,246,252,.62) + blur 22px | sobreposições no hero |
| raios | 44 / 30 / 20 / pill | moldura / cards / blocos / botões |
| sombra | 0 20px 60px -24px rgba(17,27,69,.35) | |

Modo escuro: mesmos papéis, superfícies navy, acento dourado no lugar do navy.

## Tipografia
Outfit (300–700). Títulos 600 com tracking negativo; números grandes tabulares.

## Componentes
Pill, Notch de filtros, Rail (grupos), CardWhite (cantos invertidos), CardGlass, Seal, Tile/KPI, ListRow com data, Tag (ok/warn/bad), BtnGold, Toast.

## Regras
- Dourado só como acento (≤ 5% da tela). Sem gradientes chamativos fora da cena do hero.
- Ícones de traço 1.7px, mesmo set.
- Alvos de toque ≥ 44px; foco visível dourado; `prefers-reduced-motion` respeitado.
- Mobile: trilho vira barra inferior; cards empilham; notch some (filtros vão para uma folha).

## Tema "Vidro e céu" (18/11/2026, em produção)
Escolhido pelo responsável a partir de referências do Inspora (direção 3 + "vitral" da direção 2). Implementado em `app/src/app/theme.css`, carregado depois de `globals.css` e redefinindo os tokens:
- Fundo azul-marinho com 4 manchas de cor desfocadas e animadas (`.bgfx` no layout raiz); cartões, barra e pílulas em vidro fosco (`backdrop-filter`).
- Faixa de título com reflexo de luz periódico; botão principal branco; dourado nos ícones e nas ações de ajuda.
- Painel: aviso em pílula com a próxima celebração e quantas confirmações faltam (`.island`).
- Escalas: "vitral" (cada quadrado é uma vaga; cor = pastoral; cheio = confirmado, translúcido = aguardando, tracejado = aberta).
- `prefers-reduced-motion` desliga todas as animações. Prévia estática: `prototipo/vidro.html`.
