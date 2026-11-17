# 04 — TEXTO — confie-em-cristo

## Decisões tipográficas
- **Impacto: Oswald 600/700** (OFL, variável wght 200–700; um único woff2 latin). Escolhida em vez da Anton porque tem dois pesos (600 em frases longas, 700 em hero/"CONFIE."), desenho de cartaz de cinema, acentos pt-BR bem desenhados (Ê, Ã, Ó) e ocupa menos largura que a Anton em palavras como RESPOSTAS.
- **Editorial: Cormorant Garamond 500 itálico + 600 normal** (OFL). O itálico é contemplativo e de contraste alto. O 600 normal em caixa alta com tracking de 0.32em faz o papel de versalete em "JOÃO 14,6" (o subset do Google Fonts não traz small caps reais).
- **Profundidade:** extrusão curta em marrom quente (`luzFe.sombraQuente`), seguida de sombra de contato e sombra ambiente. O brilho âmbar fica só no destaque e no momento em que a palavra assenta.
- **Destaque:** dourado em gradiente numa camada sobreposta, porque text-shadow junto com background-clip estragaria o gradiente. Uma palavra por frase: RESPOSTAS, CANSADO, CONTROLE, direção/força, AMANHÃ, CRISTO, caminho.

## Larguras (medidas no Chromium com os woff2 locais, em em, Oswald 700)
RESPOSTAS. 4.93 · CAMINHANDO 5.57 · IMPOSSÍVEL 4.89 · CONTROLE 4.22 · HISTÓRIA. 4.14 · ESPERAR. 3.97 · CONFIE. 3.14.
A largura útil no vertical é 1080 − 2·86 = 908px. Com isso, uma palavra sozinha cabe até: RESPOSTAS. ≈ 184px, CAMINHANDO ≈ 163px, CONTROLE ≈ 215px. "CONFIE." enche a largura com ≈ 270px (sem as batidas).
A tabela de avanço por caractere fica em `src/texto/metricasFe.ts` (gerada). Os componentes **reduzem o tamanho sozinhos** até cada palavra e cada linha caberem, já contando o tracking mais aberto da animação. Assim nenhuma palavra estoura nos dois formatos.

## Validação visual
Fiz stills em vertical E horizontal com uma composição temporária no scratchpad. Ela não está registrada no Root e não alterei o Root. A área segura aparece tracejada.
- Frames conferidos: entrada por máscara, cenas 1/2/3, CONFIE. no pouso (desfocado), na 1ª batida, no pico da 2ª batida (que passa a dourado), e a assinatura completa.
- Bug corrigido 1: `saidaEm` indefinido passava `[Infinity, Infinity]` ao `interpolate` e quebrava o render.
- Bug corrigido 2: o brilho e a sombra de palavras ainda escondidas vazavam pela máscara como uma linha âmbar. Agora a palavra só é desenhada a partir do frame de entrada.
- Resultado: tudo dentro da área segura nos dois formatos e nada nos 20% inferiores do vertical. Tamanhos efetivos no vertical: títulos de impacto ≈ 115–165px, editorial 64–88px, referência 38px.

## Pedidos a outros agentes
- CÓDIGO: dentro de `<Sequence from={inicioCena}>`, use `relativo(bloco, inicioCena)` de `src/projetos/confie-em-cristo/texto.ts`. Passe `maxLargura = width - 2*areaSegura().x` e multiplique o `tamanho` por `unidade()`.
- CENAS/MOVIMENTO: o storyboard pede o "CONFIE." entrando com spring de 1.25 para 1.0. O componente usa `escalaEntrada = 1.1` (16 frames, desfocado) para não invadir a margem. Se quiserem 1.25, passem a prop, sabendo que a palavra passa da área segura por cerca de 10 frames.
- PERSONAGENS: `src/personagens/Caminhante.tsx(255)` teve TS7006 de forma transitória durante o trabalho. No fim, o tsc passou sem erro.

## ENTREGA — texto — confie-em-cristo
Status: concluído
Arquivos alterados (todos novos):
- public/fontes/Oswald-var-latin.woff2, CormorantGaramond-500i-latin.woff2, CormorantGaramond-600-latin.woff2
- src/texto/fontesEditoriais.ts, metricasFe.ts, profundidade.ts, TextoImpacto.tsx, TextoEditorial.tsx, PalavraGigante.tsx
- src/projetos/confie-em-cristo/texto.ts
- projetos/confie-em-cristo/04-texto.md
Contrato exportado:
- `fontesFe = {impacto, editorial}`, `escalaFe` (gigante 280, impactoHero 168, impacto 132, impactoMenor 96, editorialHero 88, editorial 64, editorialMenor 48, referencia 38), `larguraEm/larguraPx/tamanhoQueCabe/tamanhoQueCabeLinhas/quebrarLinhas`.
- `<TextoImpacto palavras entradas tamanho maxLargura quebras? destaques? cor? peso?=700 alinhamento? duracaoEntrada?=20 trackingInicial?=0.06 trackingFinal?=-0.005 duracaoTracking?=70 profundidade?=0.8 saidaEm? duracaoSaida?=18 tipoSaida?='mascara'|'desfoque' autoAjuste?=true entrelinha?=1.02 />`
- `<TextoEditorial palavras entradas tamanho maxLargura variante?='frase'|'referencia' quebras? destaques? cor? corDestaque? alinhamento? duracaoEntrada?=36 desfoqueInicial?=0.12 subida?=0.28 fios?=true saidaEm? duracaoSaida?=30 autoAjuste?=true />`
- `<PalavraGigante texto batidas maxLargura preenchimento?=0.96 tamanhoMax? peso? cor? dourada? douradoNaBatida? escalasBatidas? escalaEntrada?=1.1 forcaBatida?=0.06 duracaoVarredura?=42 tremor?=0 profundidade?=1 trackingEm?=-0.01 saidaEm? duracaoSaida?=24 semente? />`
- texto.ts: `BlocoTexto`, `relativo()`, `textoCena1`, `textoCena2`, `textoCena3Impacto`, `textoCena3Editorial`, `textoCena3Apoio`, `textoCena4a/b`, `confieCena4`, `textoCena5a`, `textoCena5Jesus`, `textoCena5b/c`, `textoCena6Titulo`, `textoCena6Versiculo`, `textoCena6Referencia`, `ancoraDouradoCena1`. Todos os frames são absolutos e derivados de `vozConfie` com `msParaFrame`.
Validação feita: `npx tsc --noEmit` passou (exit 0). `npm run qa` passou ("nenhum erro", 51 arquivos). Stills vertical e horizontal renderizados e inspecionados.
Pedidos a outros agentes: CÓDIGO deve usar `relativo()`, `maxLargura` e `unidade()`. Escala de entrada do CONFIE.: ver acima.
Riscos/pendências: a voz ainda é estimada (sem áudio). Quando houver transcrição real, os blocos se recalculam sozinhos. Se alguma âncora mudar de grafia, o `texto.ts` falha com mensagem clara. A cena 1 mostra um texto que não é transcrição da fala ("VOCÊ NÃO PRECISA…"): as entradas são ancoradas em "entenda o que está", e depois do fim de "agora" seguem uma cadência de 6 frames.

---

# Correções — Revisão 1 (itens 1, 7, 10)

## #1 BLOQUEANTE: saídas que atravessavam eventos (`texto.ts`)
- O novo helper `saidaAntes(limite, duracao, nPalavras, escalonado, margem=6)` calcula `saidaEm` para que a saída TERMINE pelo menos 6 frames antes do limite. Ele considera o escalonamento de 2 frames por palavra do TextoImpacto.
- Os limites saem de `efeitosTransicaoConfie` (cenas.ts) e da voz. Nenhum frame foi copiado à mão.
- Todo bloco agora exporta `duracaoSaida`, com o mesmo valor que o CÓDIGO já passava (22, 24 e 30).

| Bloco | Saída começa → tela limpa em | Limite |
|---|---|---|
| textoCena1 | f395 → f429 | T1 começa em f435 |
| textoCena2 | f610 → f644 | T2 começa em f650 |
| textoCena3Impacto / Editorial | f942 / f950 → f980 | "Confiar" em f986 |
| textoCena3Apoio | f1437 → f1467 | T3 começa em f1473 |
| textoCena4a | f1641 → f1671 | 2º "Quando" em f1677 |
| textoCena5a | f1990 → f2020 | JESUS em f2026 |
| textoCena5Jesus / 5b | f2148 / f2142 → f2172 | "Não tenha" em f2178 |

Conferido nos stills (texto-r1b): f428 e f646 sem texto; em f2020 "Quando tudo parecer impossível," já sumiu antes do JESUS.

## #7: bloco novo `textoCena3Confiar`
- Texto: "Confiar em Cristo / não significa entender / todos os caminhos." É fiel à fala, palavra a palavra; usei "significa" no lugar do "é" sugerido para cada palavra na tela ser a palavra dita. "Cristo" fica em dourado.
- Entra de f986 a f1134 com `duracaoEntrada: 24`. A saída começa em f1160 e dura 16 frames. A tela fica limpa em f1176, 20 frames antes de "Significa" (f1196).
- Validado no vertical e no horizontal (preview isolado): 3 linhas centralizadas, dentro da área segura.

## #10: artefatos da máscara (`TextoImpacto`, `TextoEditorial`)
- **Acento órfão:** a máscara virou uma cortina de baixo para cima. Quando a borda passa cerca de 70% da altura das capitulares, o glifo inteiro, acento incluído, aparece no mesmo frame. Na saída por máscara, o acento só some junto com o topo das letras. Conferido em f98 (VOCÊ), f802 (NÃO), f2180 (NÃO) e f2234 (AMANHÃ).
- **Linha âmbar:** sombra e brilho ficam zerados enquanto a máscara corre e aparecem só depois que a palavra assenta (10 frames).
- **Gap no tracking ("VOCÊESTEJA"):** a largura de cada palavra acompanha o tracking atual, e o espaço da palavra abre 8 frames ANTES da entrada. O gap de 0.24em nunca é invadido (f506 ok).
- **Linhas parciais descentralizadas:** a nova prop `centrarVisiveis` (padrão true) faz a linha centralizar só as palavras já reveladas, nos dois componentes. Corrige o "a" sozinho à esquerda no versículo.
- **Corte inferior:** a máscara passou a cortar 0.3em abaixo, porque antes a cedilha de "Ç" era cortada.

## ENTREGA — texto — confie-em-cristo (revisão 1)
Status: concluído
Arquivos alterados: src/texto/TextoImpacto.tsx, src/texto/TextoEditorial.tsx, src/projetos/confie-em-cristo/texto.ts, projetos/confie-em-cristo/04-texto.md
Contrato exportado: `BlocoTexto` ganhou `duracaoSaida?` e `duracaoEntrada?`; bloco novo `textoCena3Confiar`; prop nova `centrarVisiveis?: boolean` (padrão true) em TextoImpacto e TextoEditorial.
Validação feita: `npx tsc --noEmit` passou (exit 0); `npm run qa` passou (nenhum erro); `REVIEW_SUB=texto-r1b` e `texto-r1c` (f96–102, 428, 504–510, 646, 800–806, 2010, 2020, 2178–2182, 2232–2236, 2548, 2580); preview isolado de textoCena3Confiar no vertical e no horizontal.
Pedidos a outros agentes:
- CÓDIGO (Cena3Mensagem.tsx):
  - importar `textoCena3Confiar` de `'../texto'`;
  - `const confiar = relativo(textoCena3Confiar, INICIO);`
  - dentro do mesmo `<PlanoDeFoco profundidade={1} semDesfoque>` dos outros textos, adicionar:
    `<Ancora y={0.3}><TextoEditorial palavras={confiar.palavras} entradas={confiar.entradas} quebras={confiar.quebras} destaques={confiar.destaques} duracaoEntrada={confiar.duracaoEntrada} saidaEm={confiar.saidaEm} duracaoSaida={confiar.duracaoSaida} tamanho={escalaFe.editorialHero * u} maxLargura={maxLargura} /></Ancora>`
  - Não há conflito com outros textos: o impacto e o "da sua história." somem em f980, e o apoio "continuar caminhando" entra em f1225.
- CÓDIGO (todas as cenas): passar `duracaoSaida={bloco.duracaoSaida}` em vez dos números fixos. Hoje os valores coincidem, mas assim o cálculo continua valendo se algum mudar.
Riscos/pendências: um render de revisão (texto-r1b) mostrou um gap antigo em f506 que não se reproduziu com bundle novo nem na rodada texto-r1c. Provavelmente era cache do webpack; a REVISÃO deve conferir na rodada 2. A voz ainda é estimada.
