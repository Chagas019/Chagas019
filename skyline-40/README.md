# SKYLINE 40 — maquete digital 3D

Site de apresentação de um **edifício residencial conceitual de 40 pavimentos**, com uma cena 3D em tempo real
explorável no navegador: giro de 360°, seleção de andares, corte, vista explodida, apartamento decorado navegável,
cobertura com piscina, garagem subterrânea em dois níveis, dia/pôr do sol/noite e apresentação guiada.

> Todos os dados construtivos (alturas, áreas, vagas, profundidade, pés-direitos) são **conceituais e editáveis**.
> Precisam ser definidos e validados por profissionais habilitados antes de qualquer uso comercial.

## Executar

Requisitos: Node.js 18+.

```bash
cd skyline-40
npm install
npm run dev          # http://localhost:5173
npm test             # testes unitários (Vitest)
npm run typecheck    # TypeScript
npm run build        # build de produção em dist/
npm run preview      # serve o build em http://localhost:4173
```

Testes de ponta a ponta num Chromium real (WebGL por software), com o `preview` rodando:

```bash
npx vite preview --port 4173 &
CHROMIUM_PATH=/caminho/do/chromium npm run e2e     # SCREENS=1 salva capturas em tests/screens/
```

Para regenerar as imagens da galeria (capturas da própria cena 3D): `CHROMIUM_PATH=... npm run gallery`.

### Parâmetros de URL úteis

| Parâmetro | Efeito |
|---|---|
| `?explore` | abre direto na área de exploração |
| `?quality=low\|medium\|high` | força um perfil gráfico (desliga o ajuste automático) |
| `?reduced` | simula "reduzir movimento" (transições instantâneas) |
| `?no3d` | mostra a experiência alternativa sem WebGL |
| `?nohelp` | não abre a ajuda automática da primeira visita |

## O que dá para fazer

- **Navegação 360°**: arrastar gira, roda/pinça aproxima, botão direito/dois dedos deslocam. Limites por modo impedem
  perder o edifício de vista e a câmera nunca entra no solo (exceto na garagem).
- **Vistas**: visão geral, superior, inferior, frontal, lateral, explodida, modo noturno, tela cheia, reiniciar câmera —
  todas com transições suaves (easing) e respeitando "reduzir movimento".
- **Pavimentos**: menu lateral 40→01 + cobertura + G1/G2, setas, teclado (↑/↓) e clique direto no modelo. O andar
  escolhido fica em destaque e os pavimentos acima "decolam" (corte) para revelar a planta. Segundo clique numa unidade
  a seleciona e aproxima a câmera.
- **Vista explodida**: os 40 pavimentos se separam mantendo o alinhamento, com numeração lateral, régua de referência,
  identificação das áreas comuns, seleção individual e controle de distância (1–14 m).
- **Apartamento decorado** (qualquer unidade residencial): perspectiva em corte, planta superior (3D e SVG com paredes,
  portas e mobiliário) e interior navegável na altura dos olhos, com percurso por ambientes.
- **Cobertura**: piscina com borda infinita (água com ondulação, reflexos e transparência), deck, espreguiçadeiras,
  ombrelones, lounge com lareira, espaço gourmet sob pérgola, jardim, mirante, guarda-corpos de vidro, coroamento com LED
  e iluminação noturna; pontos de vista e **apresentação cinematográfica** em percurso de câmera.
- **Garagem** G1/G2: vagas demarcadas, carros instanciados, rampas (interna e de acesso), circulação em sentido único,
  pilares com faixa na cor do nível, sinalização horizontal e vertical, núcleo de elevadores, escada de emergência e
  áreas técnicas. Vistas superior, perspectiva e nível do piso. O solo fica translúcido, a torre se afasta e o terreno
  continua projetando sombra no subsolo.
- **Dia / pôr do sol / noite** com transição gradual (luzes das unidades acendem de baixo para cima).
- **Camadas**: fachada, modo técnico (estrutura, núcleo e elevadores em movimento), paisagismo, iluminação, entorno e
  qualidade gráfica.
- **Apresentação guiada** em 9 etapas com legendas sincronizadas, pausar/continuar/avançar/voltar/sair.
- **Página inicial** com cena 3D ao fundo e seções: conceito, fachadas, pavimentos, apartamentos, cobertura, garagem,
  áreas comuns, galeria (capturas reais da cena), ficha técnica conceitual e créditos.

## Arquitetura

```
src/
  data/            dados conceituais e geradores paramétricos (edifício, apartamento, garagem, roteiro)
  state/store.ts   estado central (zustand) e ações: vistas, seleção, modos, camadas, apresentação
  config/          perfis de qualidade, detecção de WebGL
  three/
    Scene.tsx      Canvas, carregamento sob demanda, monitor de desempenho, ganchos de teste
    building/      módulos de pavimento (geometria mesclada + instanciamento), animador de pavimentos
    rooftop/       cobertura e piscina
    garage/        garagem paramétrica (carregada só quando aberta)
    apartment/     mobiliário do apartamento decorado
    environment/   céu, sol/lua, neblina, mapa de ambiente, terreno, paisagismo, cidade, orla
    camera/        vistas, limites de órbita e rig de câmera (transições, percursos, enquadramento)
  ui/              página inicial, seções, painéis de exploração, plantas SVG, experiência sem 3D
```

### Desempenho

- Cada tipo de pavimento (térreo, pódio, tipo, superior, cobertura) é um **módulo** dividido por material, com as
  geometrias **mescladas** e **instanciadas** nos andares: os 40 pavimentos custam ~45 draw calls. A animação (explodida,
  corte, revelação) só recalcula matrizes quando algo muda.
- Árvores, carros, vagas, pilares, luminárias e a cidade são `InstancedMesh`.
- **LOD**: montantes, guarda-corpos e paredes internas somem de longe; interiores só aparecem quando visíveis.
- **Carregamento progressivo**: a página e o texto chegam primeiro (≈120 kB gzip); o motor 3D (three.js + cena) é
  baixado em seguida; garagem e pós-processamento são pedaços separados, sob demanda.
- **Qualidade adaptativa**: perfil inicial pela capacidade do aparelho; `PerformanceMonitor` reduz resolução, sombras e
  pós-processamento se o FPS cair. Resolução de renderização limitada por perfil (DPR).
- Renderização **suspensa** com a aba oculta e quando o início é rolado para as seções.
- Geometrias, materiais e texturas são liberados ao desmontar (`dispose`); texturas são procedurais (sem downloads).
- Sem WebGL (ou se o contexto gráfico falhar) entra a **experiência alternativa**: corte clicável dos 40 pavimentos,
  planta do apartamento, planta da garagem e galeria.

Metas de referência: 60 fps em desktop com GPU dedicada (perfil Máxima), 45–60 fps em notebooks integrados (Equilibrada),
30+ fps em celulares recentes (Leve). Medidas reais dependem do aparelho.

### Acessibilidade

Navegação por teclado com atalhos (veja a ajuda), foco visível, rótulos ARIA, `prefers-reduced-motion` respeitado
(transições viram cortes, sem órbita automática), contraste alto nos painéis e alvos de toque ≥ 40 px.

## Publicação

O build é estático (`dist/`) com caminhos relativos — funciona na raiz de um domínio ou numa subpasta.

- **Vercel**: importe o repositório e defina *Root Directory* = `skyline-40`. O `vercel.json` já define build, saída e
  cache dos assets.
- **Netlify**: *Base directory* = `skyline-40` (o `netlify.toml` define o resto).
- **Qualquer hospedagem estática** (S3/CloudFront, GitHub Pages, Cloudflare Pages): publique o conteúdo de `dist/`.

O workflow `.github/workflows/skyline-40.yml` verifica tipos, roda os testes unitários e gera o build a cada mudança na pasta.

## Limitações conhecidas

- Não há modelos GLB externos nem texturas fotográficas: toda a geometria e as texturas são geradas no navegador, o que
  mantém o carregamento leve e sem dependência de terceiros. Para substituir por modelos de projeto (BIM/GLB), use
  `useGLTF` do Drei no lugar dos módulos de `three/building`.
- Os dados de áreas, alturas e vagas são exemplos — não há ficha técnica aprovada.
