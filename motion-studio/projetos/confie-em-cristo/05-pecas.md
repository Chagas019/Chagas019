# 05 — PEÇAS — confie-em-cristo

Biblioteca de cenários e grafismos, pronta antes da narração final. Todos os tempos entram por props (`avanco`, `luz`, `nascer`, `progresso`, `entradaEm`, `saidaEm`). Tudo é vetorial (SVG/CSS) e determinístico: `random('seed')` e `noise2D`, sem `Math.random`. As medidas são proporcionais a `width/height` (de `useVideoConfig` ou `largura/altura`). As cores vêm de `CoresCenario`, cujo padrão é `luzFe` do COR, e qualquer chave pode ser sobrescrita por props.

## Arquivos
- `src/pecas/cenario/comum.ts` — tipo `CoresCenario`, `coresCenarioPadrao` e helpers (`mix`, `smooth`, `modp`).
- `src/pecas/cenario/Estrada.tsx` — estrada em perspectiva, colinas em 4 camadas, névoa, marcos e pedras que fluem.
- `src/pecas/cenario/Horizonte.tsx` — céu, estrelas, luz nascente e nuvens estratiformes em 3 camadas.
- `src/pecas/cenario/Revelacao.tsx` — fenda/portal de luz que revela o novo cenário (cena 3).
- `src/pecas/Ornamentos.tsx` — `Fio`, `Marcador`, `Colchetes`, `Divisor` e `AssinaturaVersiculo`.
- `scripts/preview-pecas/` — entry de conferência temporário (fora do Root): `node scripts/preview-pecas/render.mjs <pasta> [frame]`. Pode ser apagado.

## Como empilhar (cena 2 → 3 → 4)
```
<Horizonte luz={L} nascer={N} deriva={d} />        // fundo
<Estrada luz={L} avanco={frame*0.05} deriva={d} /> // transparente acima das colinas
{personagem}                                       // PERSONAGENS por cima; use geometriaEstrada() p/ pé/escala
```
- Na cena 2, use `luz` de 0 a 0.1 e `nascer` 0. Na cena 3, `Revelacao` com `progresso` de 0 a 1 e a paisagem `luz≈1, nascer≈1` como `children`. Nas cenas 4 e 5, `luz` 1.
- Mantenha `horizonte` (0.6) e `fugaX`/`solX` iguais entre `Horizonte` e `Estrada`.
- `avanco` está em unidades de mundo: um ciclo de faixa vale 2.4. Para caminhada contemplativa, de 0.04 a 0.06 por frame.
- `deriva` (px, base 1080) gera parallax: colinas e nuvens distantes se movem menos.

## Decisões visuais
- Perspectiva aérea: as colinas distantes são mais claras, puxadas para a cor da névoa, e as próximas mais escuras. Há véu de névoa entre as camadas e no chão junto ao horizonte.
- A estrada some num vale entre as colinas. O destino não fica visível, como pede o texto da cena 2.
- Ao amanhecer a contraluz âmbar marca as cristas e o asfalto reflete no centro. À noite há luar frio.
- Os tracejados, marcos laterais com refletor e pedras vivem no espaço 3D (z = 1/t). Escala e espaçamento seguem a perspectiva quando `avanco` muda.
- As nuvens são feixes de estrias com blur anisotrópico, e não elipses únicas. Ficam com o lado de baixo iluminado perto do sol.
- `Revelacao` tem duas fases. Até 0.3, um fio de luz cresce na vertical. Depois a fenda rompe com aceleração. Há bloom em três camadas, feixe de luz no chão a partir da base e poeira de luz. Com `progresso >= 1` mostra só o `children`.
- Ornamentos: fios afinados nas pontas, losangos pequenos e espaçamento largo que se fecha na entrada. É uma linguagem editorial, sem ícones genéricos.

## Validação
- `npx tsc --noEmit` passou e `npm run qa` também ("nenhum erro").
- Stills de conferência em escala 0.5 (frames 120 e 200): Noite, Meio, Amanhecer (vertical), AmanhecerH (1920×1080), Revelação em 0.15, 0.45 e 0.75, e Ornamentos. Foram verificados visualmente e ajustados: corrigi a faixa dura de névoa no horizonte, adensei os tracejados, redistribuí as pedras, transformei as nuvens em estrias e corrigi o encolhimento flex dos fios.
- Pasta: `/tmp/claude-0/-home-user-Chagas019/e2d5a36e-c70f-5e54-b89c-1c06c7dd25d4/scratchpad/v5/`

## Pedidos a outros agentes
- TEXTO: registrar em `src/texto/fontes.ts` as fontes `Cormorant Garamond` 600 e 500 itálico (os arquivos já estão em `public/fontes/`). Hoje a `AssinaturaVersiculo` usa essa família, com Georgia como fallback. No preview eu as carreguei localmente.
- CÓDIGO: dirigir `Revelacao.progresso` com `msParaFrame` a partir de "Mas escute" / "Deus não perdeu o controle" (voz.ts). Não usar `Revelacao` dentro de transição que já faça fade do fundo.
- COR: se quiser outro grading, basta passar `cores={{...}}` (tipo `CoresCenario`). Luz volumétrica e raios continuam com o COR e podem ir por cima da `Revelacao`.

## ENTREGA — peças — confie-em-cristo
Status: concluído
Arquivos alterados: src/pecas/cenario/comum.ts, src/pecas/cenario/Estrada.tsx, src/pecas/cenario/Horizonte.tsx, src/pecas/cenario/Revelacao.tsx, src/pecas/Ornamentos.tsx, scripts/preview-pecas/index.tsx, scripts/preview-pecas/render.mjs (temporário), projetos/confie-em-cristo/05-pecas.md. Celular/Notificacao/CardMetrica não foram tocados.
Contrato exportado:
- `CoresCenario`, `coresCenarioPadrao`, `mix` (cenario/comum.ts)
- `Estrada({avanco?=0, luz?=0, horizonte?=0.6, fugaX?=0.5, curva?=0 (-1..1), larguraBase?=0.44, deriva?=0, nevoa?=1, marcos?=true, cores?, seed?, largura?, altura?})`
- `geometriaEstrada(W, H, horizonte?, fugaX?, larguraBase?) → {horizonteY, fugaX, y(t), escala(t), meiaLargura(t)}`
- `Horizonte({luz?=0, nascer?=0, horizonte?=0.6, solX?=0.5, estrelas?=140, deriva?=0, ventoNuvens?=0.12, nuvens?=1, cores?, seed?, largura?, altura?})`
- `Revelacao({progresso, forma?='fenda'|'arco', centroX?=0.5, centroY?=0.5, alturaFio?=0.46, feixeChao?=true, poeira?=46, corEscuridao?, opacidadeEscuridao?=1, cores?, seed?, largura?, altura?, children?})`
- `Fio({comprimento, cor, entradaEm, duracao?=40, espessura?, orientacao?, origem?='centro'|'inicio'|'fim', pontasSuaves?=true, saidaEm?, style?})`
- `Marcador({tamanho, cor, entradaEm, tipo?='losango'|'ponto'|'cruzeta', preenchido?=true, brilho?=0, saidaEm?, style?})`
- `Colchetes({largura, altura, cor, entradaEm, canto?=0.14, espessura?, duracao?=36, estilo?='cantos'|'laterais'|'moldura', aproximacao?, saidaEm?, children?, style?})`
- `Divisor({largura, cor, entradaEm, corCentro?, duracao?=44, saidaEm?, style?})`
- `AssinaturaVersiculo({largura, entradaEm, referencia?='JOÃO 14,6', citacao?, corTexto, corFio, corCitacao?, fonteReferencia?, fonteCitacao?, saidaEm?, style?})` — interno proporcional a largura/720
Validação feita: `npx tsc --noEmit` passou; `npm run qa` sem erros; stills em vertical e horizontal conferidos.
Pedidos a outros agentes: TEXTO: carregar Cormorant Garamond em fontes.ts | CÓDIGO: mapear progresso da Revelacao pela voz
Riscos/pendências: as estrelas cintilam por noise (sutil; confirmar no vídeo se não "fervem" com o grão). Os filtros de blur das nuvens têm custo de render moderado. O chão noturno é deliberadamente quase liso (escuro). `scripts/preview-pecas/` é temporário.

---

# Rodada 2 — correções da revisão 1 (itens 8 e 12)

## Item 8 — `Revelacao` orgânica (f716–784)
- Reescrevi o miolo de `src/pecas/cenario/Revelacao.tsx`. Os contornos traçados (vesica com bloom de 3 strokes) e o trapézio do `feixeChao` saíram.
- A abertura agora é uma máscara CSS (`mask-image`) formada por 13 fatias elípticas radiais sobrepostas. Largura e desvio lateral de cada fatia vêm de `noise2D`, então o rasgo tem borda irregular e respira devagar.
- O feather é ≥ 12% da largura da tela a partir do momento em que a fenda começa a abrir. O núcleo é opaco e a queda é longa.
- A luz é uma camada em `screen`, toda feita de gradientes radiais: véu por fatia muito sobreposto e fraco, núcleo contínuo ao longo da fenda e halo amplo. Nenhuma aresta.
- `feixeChao` virou uma poça de luz: duas elipses radiais alongadas na direção do espectador, sem borda reta. A poeira é feita de pontos radiais macios.
- A API foi mantida: `progresso`, `forma`, `centroX/Y`, `alturaFio`, `feixeChao`, `poeira`, `corEscuridao`, `opacidadeEscuridao`, `cores`, `seed`, `largura`, `altura`, `children`. A única prop nova é `irregularidade` (0..1, padrão 0.6). Não precisa mexer em `Cena3Mensagem`.

## Item 12 — faixa central sob o caminhante
- Os tracejados da `Estrada` agora somem no primeiro plano. A opacidade é multiplicada por `1 − (1 − faixaPerto)·smooth(0.1, 0.42, t)`, com `faixaPerto` padrão 0.12. No fundo a faixa continua mostrando a direção. A opacidade geral caiu para `faixaOpacidade` = 0.6.
- Prop opcional nova: `oclusor={{x, y, raio?}}` abre um vão na faixa em volta dos pés do caminhante.
- A correção vale com os valores padrão, sem integração. Em f750 e f784 já não existe "bengala" sob a figura.
- A miniatura (f0) não depende de mim: a sugestão da revisão é usar o still de capa f2740 no post.

## Validação
- `npx tsc --noEmit` passou. `npm run qa` (64 arquivos) sem erros.
- `REVIEW_SUB=r2-pecas npm run review -- ConfieEmCristo-Vertical 700-800`, com f716, 735, 750, 765 e 784 re-renderizados depois do ajuste final, em `render/revisao/ConfieEmCristo-Vertical/r2-pecas/`.
- f716: fio de luz macio, levemente ondulado. f750: véu contínuo sem contorno nem trapézio. f784: cenário revelado e faixa ausente sob a figura.

## ENTREGA — peças — confie-em-cristo (rodada 2)
Status: concluído
Arquivos alterados: src/pecas/cenario/Revelacao.tsx, src/pecas/cenario/Estrada.tsx, projetos/confie-em-cristo/05-pecas.md
Contrato exportado: `Revelacao` (mesma API + `irregularidade?=0.6`) · `Estrada` (+ `faixaPerto?=0.12`, `faixaOpacidade?=0.6`, `oclusor?: {x, y, raio?}`)
Validação feita: tsc OK · qa OK · review r2-pecas 700–800 inspecionado (f716/750/784)
Pedidos a outros agentes: CÓDIGO (opcional): passar `oclusor={{x: pos.x, y: pos.y}}` na Estrada das cenas 2 e 3 para um vão preciso sob os pés | nenhum obrigatório
Riscos/pendências: os raios volumétricos (LuzVolumetrica, do COR) continuam por cima e são os únicos traços lineares da cena. A miniatura f0 fica com a capa f2740 (fora do vídeo).
