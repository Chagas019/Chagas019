# NEXORA Real Estate

Plataforma imobiliária com planta baixa interativa, modelo 3D, visita 360°, filtros, favoritos, comparação e painel administrativo.
React 19 + TypeScript + Vite, Tailwind CSS, Framer Motion, Three.js / React Three Fiber / Drei, Supabase (Postgres, Auth, Storage, RLS).

> **Tudo o que está publicado aqui é demonstração.** Os 8 imóveis (7 publicados, 1 rascunho) são fictícios, com cidades e bairros inventados.
> As imagens são **renders** gerados a partir das plantas ilustrativas, e não fotografias. O modelo 3D e os panoramas também são demonstrativos e aparecem identificados assim no site.

## Como rodar

```bash
cd nexora
npm install
npm run dev          # http://localhost:5173
npm run build        # gera dist/ com SEO pré-renderizado
npm test             # testes unitários (Vitest)
npm run build && node e2e/smoke.mjs   # teste de ponta a ponta no Chromium (Playwright)
```

Sem variáveis de ambiente, o site roda em **modo demonstração**:
- os dados vêm de `src/data/properties.ts`;
- os favoritos, a comparação e o histórico ficam no navegador;
- os formulários gravam no navegador e as mensagens aparecem no painel;
- o painel abre por `/entrar` → "Abrir painel (demonstração)", e as edições valem só naquele navegador.

## Conectar o Supabase (dados reais, login e controle de acesso)

1. Crie um projeto no Supabase e copie `.env.example` para `.env.local` com `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (use apenas a chave **anon**).
2. Aplique o esquema: `supabase db push` (ou cole `supabase/migrations/0001_nexora_schema.sql` no SQL Editor). Ele cria as tabelas, os papéis (`cliente`, `corretor`, `admin`), as políticas de **Row Level Security** e o bucket `property-media` no Storage.
3. Opcional: importe os imóveis de demonstração com `node scripts/export-seed.mjs > supabase/seed-imoveis.sql` e rode o SQL gerado.
4. Crie sua conta em `/entrar` e promova-se a administrador pelo SQL que está em `supabase/seed.sql`.
5. Publique a função de servidor que muda papéis de usuários: `supabase functions deploy admin-users`. A `service_role` fica só no servidor, nunca no frontend.

Com o Supabase ativo, o atalho de demonstração do painel deixa de existir. Quem protege os dados é o banco:
- visitantes leem só imóveis **publicados**;
- visitantes podem **enviar** contatos, mas nunca lê-los;
- documentos técnicos só aparecem se `documents_authorized` estiver marcado;
- depoimentos só aparecem quando há autorização registrada do autor;
- favoritos são privados de cada usuário;
- uploads exigem papel de equipe.

## Arquitetura

```
src/
  pages/            rotas (carregadas sob demanda) + admin/
  components/
    ui/             design system: Modal, Tabs, Tooltip, Toaster, States (skeleton/vazio/erro), Picture, Field, TLink
    layout/         Header, Footer, CookieConsent (LGPD), CompareBar, Logo
    motion/         Reveal, WordReveal, MaskReveal, Parallax, CountUp
    home/           Hero cinematográfico
    property/       PropertyCard, SearchPanel, Gallery/Lightbox, LeadForm, LocationMap, Specs…
    floorplan/      FloorPlanViewer, PlanSvg (desenho técnico), PanZoom (zoom/pinça/teclado)
    viewer3d/       PropertyViewer3D, PropertyModel, CameraControls, RoomHotspots, LightingControls,
                    ViewerToolbar, ViewerFallback, ScreenProjector, Viewer3DLauncher
    tour/           VirtualTour (panoramas 360°)
  services/         properties, leads, content (Supabase ou modo demonstração) + cache de consultas
  hooks/            useAuth, useCollections (favoritos/comparação/histórico), useSeo, useMotionPref, useToast
  lib/              filters, plan (geometria), plan3d (câmeras), seo, validation (zod), format, supabase
  three/            gerador de modelo 3D a partir da planta (usado só pela ferramenta de render)
  data/             imóveis, plantas e conteúdo padrão (demonstração)
supabase/           migrations (esquema + RLS), seed, functions/admin-users
render/ + scripts/render-assets.mjs   ferramenta interna que gera renders, panoramas e .glb
```

### Uma fonte de verdade para planta, 3D e fotos
Cada planta guarda apenas os ambientes (polígonos em metros) — veja `docs/planta.md`. A partir dela, `src/lib/plan.ts` deriva paredes, portas, vidros e mobiliário. O mesmo dado gera:
- a planta 2D em SVG, com áreas calculadas;
- o modelo `.glb` e as câmeras por ambiente (`cameraPresetsFromPlan`);
- os renders e os panoramas.

Os ids dos ambientes são os mesmos em todos esses lugares. Por isso, escolher "Cozinha" na planta leva a câmera do 3D até a cozinha, e o contrário também funciona.

### Trocar a demonstração por modelos reais
No painel, em **Imóveis → editar → Modelo 3D e ambientes**, envie um `.glb` (de preferência comprimido com meshopt e com texturas de até 2048 px). Depois marque se o modelo é demonstrativo e ajuste as posições de câmera dos hotspots. O botão "Gerar câmeras a partir da planta" preenche essas posições automaticamente.

Convenções opcionais do modelo:
- grupos `level_<id>` e `roof_<id>` ativam o corte por pavimento;
- materiais `nx_lamp` acendem no modo noturno.

Sem modelo, a aba Tour 3D mostra a galeria ou o fallback, e nada é simulado. Plantas enviadas como imagem ganham zoom e marcadores, mas não mostram medidas calculadas.

### Escolhas técnicas
- **Movimento**: Framer Motion (entrada do hero, revelações por máscara e por palavra, parallax, contadores) e a **View Transitions API** para as transições entre páginas. A imagem do card se expande até a capa da página de detalhes como elemento compartilhado, nos navegadores que suportam a API. GSAP e Lenis não foram incluídos porque as sequências pedidas são cobertas pelo Framer Motion, e a rolagem nativa preserva a acessibilidade e evita duas bibliotecas a mais.
- **Movimento reduzido**: o site respeita `prefers-reduced-motion` e tem a opção "Reduzir animações e efeitos" no rodapé, que também desliga o parallax e a rotação automática do 3D.
- **Desempenho**: as rotas são carregadas sob demanda. O Three.js (cerca de 245 kB gzip) só é baixado quando a pessoa abre o 3D ou a visita 360°, e o `.glb` só depois do clique em "Abrir modelo 3D" (o tamanho aparece antes). As imagens usam WebP com `srcset`, dimensões fixas e `loading="lazy"`. As fontes são servidas pelo próprio site (sem Google Fonts, o que também ajuda na LGPD).
- **Marcadores 3D**: são botões HTML comuns, focáveis pelo teclado e posicionados a cada quadro pelo `ScreenProjector`. Eles substituem o `<Html>` do Drei, que conflita com o React 19.
- **Shadcn/ui**: os componentes acessíveis foram escritos no próprio design system, com tokens em `tailwind.config.js` e `src/styles/index.css`, para manter a identidade visual sem depender de um gerador.

### SEO
- `useSeo` define título, descrição, canonical, Open Graph e JSON-LD (`RealEstateListing`, sem endereço exato nem avaliações) em cada página.
- No build, o plugin `nexora-seo` (em `vite.config.ts`) gera `sitemap.xml`, `robots.txt` e um HTML por imóvel com as meta tags já no código-fonte.
- Defina `VITE_SITE_URL` para que canonical e sitemap usem URLs absolutas.

### Privacidade (LGPD)
- O aviso de armazenamento explica que o site não usa cookies de publicidade ou análise e deixa o histórico de visualização opcional.
- Os formulários exigem consentimento.
- O mapa do OpenStreetMap só carrega depois do clique e mostra uma região aproximada, nunca o endereço.
- A política de privacidade e os termos são modelos e devem ser revisados por um advogado. Dados legais da imobiliária, como CRECI, CNPJ e telefone, ficam vazios até serem preenchidos no painel, e o site não inventa esses valores.

## Publicação (Vercel)
Crie um projeto na Vercel com **Root Directory = `nexora`**. O `vercel.json` já define o build, os rewrites da SPA, os headers de segurança (incluindo CSP) e o cache. Configure as variáveis `VITE_*` no painel da Vercel.

## Gerar novamente as imagens e os modelos
```bash
npm run renders                     # tudo (alguns minutos, Chromium headless)
npm run renders -- horizonte/sala   # só um item
```
A lista fica em `render/jobs.ts`. Se o Chromium não estiver em `/opt/pw-browsers`, defina `CHROMIUM_PATH`.
