# Arquitetura

## Visão geral

```
Navegador ──► Next.js (Vercel)
               ├─ Server Components (páginas)      ─┐
               ├─ Server Actions (formulários)      ├─► src/lib/services (regras de negócio)
               ├─ Route Handlers (/api/*)          ─┘          │
               └─ middleware (renova sessão Supabase)          ▼
                                                     src/lib/repo  (interface Repository)
                                                      ├─ SupabaseRepository ─► Postgres + RLS / Storage
                                                      └─ LocalRepository    ─► .data/db.json (modo demo)
Mercado Pago ──webhook──► /api/webhooks/mercadopago ─► services/checkout ─► fulfill_purchase (idempotente)
```

Princípios:

1. **Toda decisão de acesso acontece no servidor.** `decideAccess()` (`src/lib/services/access.ts`) é a fonte única; o banco tem o espelho `public.can_access_product()` e as políticas RLS como defesa em profundidade.
2. **Preço nunca vem do cliente.** O checkout recebe só o ID do produto/coleção/plano; o valor é lido do banco.
3. **Pagamento só é liberado por confirmação do servidor**: webhook com assinatura válida → consulta do pagamento na API do Mercado Pago → conferência de referência, valor e moeda → `fulfill_purchase` atômico e idempotente (`payment_events` com chave única por evento).
4. **Arquivos de preset ficam em bucket privado.** O download é um `POST /api/download/:fileId` que verifica acesso, aplica limite de taxa, registra o download e redireciona (303) para uma URL assinada de 60 s. Não existe link público permanente.
5. **Service role só no servidor** (`import "server-only"`), usada apenas depois das verificações: criar pedidos, confirmar pagamentos, registrar downloads e assinar URLs. O resto usa o cliente com a sessão do usuário, sujeito a RLS.
6. **Dois backends, uma interface.** `Repository`, `AuthBackend` e `FileStorage` têm implementação Supabase (produção) e local (demonstração/testes). As regras de negócio só conhecem as interfaces — os testes exercitam exatamente o mesmo código de produção.

## Estrutura de pastas

```
preset-lab/
├─ src/
│  ├─ app/
│  │  ├─ page.tsx                     Home editorial
│  │  ├─ presets/ [slug]/             Marketplace e página do preset
│  │  ├─ colecoes/ [slug]/            Coleções (pacotes e exclusivas do Club)
│  │  ├─ estilos/  inspiracao/  premium/  ajuda/
│  │  ├─ (auth)/ entrar, cadastro, cadastro/confirme, recuperar-senha, redefinir-senha
│  │  ├─ auth/confirm/route.ts        Links de confirmação/recuperação (Supabase e local)
│  │  ├─ lab/                         My Lab: biblioteca, favoritos, downloads, compras, assinatura, perfil
│  │  ├─ checkout/ simulado/[id], retorno
│  │  ├─ admin/                       Admin Studio (dashboard, produtos, categorias, usuários, vendas, conteúdo)
│  │  ├─ actions/                     Server Actions (auth, library, admin)
│  │  ├─ api/download/[fileId]        Download autorizado → URL assinada
│  │  ├─ api/files/[token]            (modo local) entrega por token HMAC
│  │  ├─ api/media/[...path]          (modo local) imagens enviadas
│  │  ├─ api/admin/upload             (modo local) upload do Admin Studio
│  │  ├─ api/webhooks/mercadopago     Webhook de pagamentos
│  │  └─ dev/emails                   (modo local) caixa de e-mails
│  ├─ components/ ui · site · product · marketplace · explorer · inspiration · auth · lab · admin · forms
│  ├─ content/                        Catálogo de demonstração (compartilhado com seed SQL e gerador de assets)
│  ├─ lib/
│  │  ├─ config.ts                    Backend/pagamentos e travas de produção
│  │  ├─ types.ts  catalog.ts  utils.ts  request.ts
│  │  ├─ repo/      interface + seleção do backend
│  │  ├─ supabase/  clientes (sessão e service role) + SupabaseRepository
│  │  ├─ local/     store JSON, seed e LocalRepository
│  │  ├─ auth/      AuthBackend (Supabase e local), hash de senha
│  │  ├─ storage/   FileStorage (Supabase Storage e disco), URLs assinadas
│  │  ├─ payments/  Mercado Pago (preferência, consulta, assinatura do webhook) e planos
│  │  ├─ services/  access, entitlements, checkout, downloads
│  │  └─ validation/ schemas zod
│  └─ middleware.ts
├─ supabase/ migrations/ · seed.sql · tests/ (shim + testes de RLS)
├─ private-files/demo/                Presets XMP/ZIP de demonstração (nunca servidos diretamente)
├─ public/demo/                       Imagens de demonstração geradas pelo projeto
├─ scripts/                           gerar assets, seed, promover admin, testar migrations
└─ tests/ unit (Vitest) · e2e (Playwright)
```

## Modelo de acesso

| `product_type` | `access_mode` | Libera com |
|---|---|---|
| free | free | conta (login) |
| premium | purchase_or_subscription | compra avulsa **ou** assinatura ativa |
| premium | purchase_only | só compra avulsa (ex.: pacote de casamento) |
| premium | subscription_only | só assinatura (exclusivos do Club) |

Compra de **coleção** libera todos os presets dela. Admin acessa tudo. Rascunhos/arquivados só para admin. Reembolso (`refunded`) remove o acesso do item.

## Premium Club

Pré-pago por período (mensal/anual) via Checkout Pro — funciona com PIX. Renovar soma o novo período ao fim do vigente. Não há cobrança recorrente automática (próximo passo possível: Preapproval do Mercado Pago).

## Design system

Tokens em `src/app/globals.css` (`@theme`): preto `ink`, grafites, `bone`, cinzas `smoke/ash` e laranja `signal`. Tipografia: Anton (display), Instrument Serif itálico (acento editorial), Inter Tight (texto), JetBrains Mono (rótulos técnicos `lab-label`). Componentes base em `src/components/ui` no padrão shadcn (CVA + Slot). Layouts assimétricos, cantos 18–32 px, sem sombras pesadas; animações com Motion respeitando `prefers-reduced-motion`.

## Decisões e limitações conhecidas

- **Busca/ordenação** são feitas em memória sobre os produtos publicados (sem acento, multi-termo). Adequado para milhares de itens; para catálogos muito maiores, trocar por `tsvector`/`unaccent` no Postgres.
- **Limite de taxa** usa a tabela `rate_limits` (janela fixa) via `rate_limit_hit()` — funciona entre instâncias serverless.
- **Modo local** é single-process (fila de escrita em memória + gravação atômica). Serve para desenvolvimento e testes, não para produção.
- **DNG**: o formato está suportado (upload, download, instruções), mas os presets de demonstração são XMP/ZIP.
- **LUTs**: `product_files.format` já aceita `cube` e `3dl`.
