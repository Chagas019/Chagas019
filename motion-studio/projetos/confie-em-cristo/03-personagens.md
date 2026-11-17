# 03 — PERSONAGENS — confie-em-cristo

Biblioteca preparada **sem tempos fixos**: toda entrada/saída/parada vem por props (frames LOCAIS da cena),
para o CÓDIGO ligar aos marcadores de `voz.ts`/`cenas.ts` via `msParaFrame()`.
Não toquei em `Mascote.tsx` nem `movimentos.ts`.

## 1. `src/personagens/Caminhante.tsx` — silhueta caminhando (cenas 2 e 3)

Jovem de moletom (capuz caído), visto de costas / 3/4 de costas. Esqueleto 3D simples (quadril, joelho, tornozelo,
ponta do pé, ombro, cotovelo, mão, pescoço, cabeça) projetado com guinada (`vista`) e leve elevação de câmera.
- **Ciclo determinístico**: fase = soma da velocidade quadro a quadro; joelho dobra na fase de balanço, calcanhar sobe,
  quadril sobe/desce sozinho (o pé mais baixo sempre toca o chão), balanço lateral do peso, torção ombro×quadril,
  braços em oposição com follow-through do antebraço, micro-irregularidade com `noise2D(semente)` (sem `Math.random`).
- **Cansaço** (`cansaco` 0..1): passo mais curto, tronco inclinado, cabeça baixa, ombros caídos, braços pesados.
- **Parar / retomar**: `paraEm` desacelera até parar (pernas voltam ao neutro); `retomaEm` volta a andar (cena 3, "caminhando").
- **Luz de recorte**: a silhueta é desenhada sobre uma camada da cor da luz; o corpo escuro, levemente erodido
  e deslocado para longe da luz, deixa uma borda fina no lado iluminado + bloom suave. `luz` 0..1 anima o "acender".
- **Sombra longa**: projeção da própria silhueta no chão (matriz de cisalhamento), nítida no pé e desfocada/esmaecida ao longe,
  mais oclusão de contato sob os pés.
- **Perspectiva**: helper `naEstrada({progresso, pertoX, pertoY, alturaPerto, fugaX, fugaY, profundidade})` → `{x, y, altura, desfoque, nevoa}`
  (escala ∝ 1/(1+k·p): a figura diminui rápido no começo e devagar perto do horizonte, como na realidade).

Conferido nos stills: de costas e 3/4 se leem bem (figura humana, não boneco de palito); a 90° (perfil) a leitura cai, então use `vista` entre 0 e 30.

## 2. `src/personagens/Cruz3D.tsx` — cruz 3D (cena 5)

`ExtrudeGeometry` com chanfro (as arestas pegam o recorte). Proporções clássicas: braço = 2/3 da altura; braço superior = braços laterais.
Materiais `pedra` | `madeira` | `ouro` (fosco). Pedra/madeira têm textura procedural determinística (cor + relevo via `noise2D`, sem emendas).
Luz: recortes âmbar atrás-esquerda/atrás-direita + contraluz alto + rasante âmbar do alto (gradiente na face) + preenchimento quente fraco + rebatimento azul de baixo.
Movimento: oscilação lenta em Y, inclinação mínima em X, deriva vertical, tudo em função do frame (sem `useFrame`). Entrada: sobe da escuridão e se aproxima.

## 3. `src/personagens/Cruz2D.tsx` — alternativa vetorial

Cruz latina com gradiente branco quente → dourado → âmbar, bloom, núcleo, halo radial com respiração e 14 raios finos
(variação com `random('raio-…')`). `modo="silhueta"`: cruz escura recortada contra o halo (contraluz).
`aberturaRaios` anima os raios "se abrindo" (cena 5, em "Jesus").

## 4. Verificação 3D no headless (IMPORTANTE)

- `npm run review -- Teste-3D 0,120` **FALHA** neste container: `THREE.WebGLRenderer: Error creating WebGL context` com `gl: 'angle'`
  (o mesmo acontece com `swiftshader` e `egl`).
- **`gl: 'swangle'` FUNCIONA**: a Cruz3D renderizou de verdade (geometria, chanfro, textura, luzes) nos stills.
- O mesmo vale para o render final: `remotion.config.ts` usa `setChromiumOpenGlRenderer('angle')`, que vai falhar em qualquer cena 3D aqui.

## 5. Preview próprio (mantido e documentado em `scripts/`)

`scripts/preview-personagens/` (`index.ts`, `Root.tsx`, `render.mjs`), separado do `Root.tsx` principal:
```
node scripts/preview-personagens/render.mjs <Id> <f1,f2,...> [gl=swangle]   # ESCALA=1 para tamanho cheio
```
Ids: `Prev-Caminhante` (estrada, entra na cena), `Prev-Caminhante-Vistas` (vistas 0/30/60/90°, para em 20, retoma em 70),
`Prev-Cruz3D`, `Prev-Cruz2D` (modo silhueta após o frame 200). Saída em `render/revisao/<Id>/` (ignorado pelo git).

## Uso sugerido por cena (frames locais; ligar aos marcadores de `cenas.ts`)

- **Cena 2**: `<Caminhante {...naEstrada({progresso: interpolate(frame,[0,dur],[0.05,0.35]), ...})} cansaco={0.75} ciclo={72} vista={12} anguloLuz={0} sombraInclinacao={0} sombraComprimento={1.2} luz={0.5} entradaEm={0} />`
  com altura de perto ≈ 18% da altura do quadro, conforme o enquadramento de `cenas.ts`.
- **Cena 3**: `paraEm` ≈ frame de "escute"; `retomaEm` = `g.caminhando`; `luz` anima 0.5→1.2 durante a revelação; `cansaco` 0.75→0.3 (andar mais firme em direção à luz).
- **Cena 5**: `Cruz3D material="madeira"` (ou `pedra`) com `luz` 0→1.2 na entrada e `emissivo` ~0.15 em "Jesus";
  camada 2D por trás: `Cruz2D modo="silhueta" raios aberturaRaios` 0→1 em `g.jesus` (ou só a Cruz2D, se o 3D for vetado).

## ENTREGA — personagens — confie-em-cristo
Status: concluído
Arquivos alterados:
- `motion-studio/src/personagens/Caminhante.tsx` (novo)
- `motion-studio/src/personagens/Cruz3D.tsx` (novo)
- `motion-studio/src/personagens/Cruz2D.tsx` (novo)
- `motion-studio/scripts/preview-personagens/{index.ts,Root.tsx,render.mjs}` (novos, preview próprio)
- `motion-studio/projetos/confie-em-cristo/03-personagens.md`

Contrato exportado:
- `Caminhante` (props `CaminhanteProps`): **obrigatórias** `x, y` (pés, px), `altura` (px).
  Opcionais: `entradaEm=0, duracaoEntrada=40, saidaEm?, duracaoSaida=30, ciclo=66` (frames/ciclo; 60 = 1 s),
  `cansaco=0.5, paraEm?, duracaoParada=45, retomaEm?, duracaoRetomada=40, vista=22` (graus; 0 = costas),
  `corCorpo='#0A0E16', corLuz='#FFB24A', luz=1` (0..1.5), `anguloLuz=35` (0 = de cima/trás, 90 = da direita),
  `sombraComprimento=1.3, sombraInclinacao=-0.25, sombraOpacidade=0.6, desfoque=0` (px), `nevoa=0, corNevoa='#16263F', semente, faseFrames=0`.
- `naEstrada({progresso, pertoX, pertoY, alturaPerto, fugaX, fugaY, profundidade=2.5})` → `{x, y, altura, desfoque, nevoa}` (dá para espalhar direto nas props).
- `misturar(hexA, hexB, t)` (utilitário de cor).
- `Cruz3D` (props `Cruz3DProps`): **obrigatórias** `largura, altura` (px do canvas).
  Opcionais: `material='pedra'|'madeira'|'ouro', cor?, corLuz='#FFB24A', luz=1` (0..1.5, "acender"), `preenchimento=0.12, emissivo=0,
  rotacaoY=-14, oscilacao=6, periodo=9` (s), `deriva=0.05, escala=0.8, entradaEm=0, duracaoEntrada=90`. Fundo transparente.
- `Cruz2D` (props `Cruz2DProps`): **obrigatória** `altura` (px). Opcionais: `x?, y?` (centro; padrão = centro do quadro),
  `modo='luz'|'silhueta', corNucleo, corOuro, corLuz, corSilhueta, luz=1, espessura=0.1, raios=true, aberturaRaios=1,
  entradaEm=0, duracaoEntrada=75, saidaEm?, duracaoSaida=40, respiracao=0.06`.
- Frames de entrada/saída usados: nenhum fixo; tudo por prop (frames locais da `<Sequence>`).

Validação feita: `npx tsc --noEmit` → OK · `npm run qa` → "✓ nenhum erro" · stills via `scripts/preview-personagens/render.mjs`
(Caminhante perto/longe, ciclo, parar/retomar; Cruz3D frames 0/150/239; Cruz2D luz e silhueta) conferidos visualmente.
`npm run review -- Teste-3D 0,120` → **falha** (WebGL indisponível com `angle`).

3D funcionou de verdade? **Sim, com `gl: 'swangle'`**. Com `angle` (configuração atual do estúdio), `swiftshader` ou `egl`: **não** (sem contexto WebGL).

Pedidos a outros agentes:
- CÓDIGO: trocar `Config.setChromiumOpenGlRenderer('angle')` por `'swangle'` em `remotion.config.ts` (pelo menos quando o Chromium headless do container é usado); sem isso nenhuma cena 3D (Cruz3D, Teste-3D) renderiza aqui.
- REVISÃO: em `scripts/review-frames.mjs`, `chromiumOptions: {gl: 'swangle'}` (hoje `'angle'`, o que derruba o `Teste-3D`).
- CÓDIGO: integrar por cena conforme "Uso sugerido"; passar frames locais derivados de `cenas.ts`/`voz.ts` com `msParaFrame()`.
- COR/MOVIMENTO: com `anguloLuz`/`sombraInclinacao` dá para alinhar ao `luzPrincipal` de `estilo.ts`. Na estrada a fonte fica no horizonte, então o padrão sugerido é `anguloLuz=0, sombraInclinacao=0` (sombra vindo para a câmera).

Riscos/pendências:
- `swangle` é renderização por software: frames 3D ficam mais lentos no render final. A Cruz2D é o plano B pronto.
- A textura procedural da Cruz3D é gerada uma vez por montagem (512², ~0,3 s), com `useMemo`.
- Vista de perfil (90°) do Caminhante é fraca; o personagem foi feito para 0–30°.
