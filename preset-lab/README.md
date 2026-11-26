# PRESET LAB

> *Your creative space for photo editing.*

Marketplace de presets fotográficos (Lightroom): presets gratuitos e pagos, biblioteca pessoal, Premium Club por assinatura e Admin Studio. Português do Brasil, preços em reais.

**Stack:** Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · componentes no estilo shadcn/ui (Radix Slot + CVA) · Motion · Lucide · Supabase (Postgres + Auth + Storage + RLS) · Mercado Pago (Checkout Pro) · Vitest · Playwright.

## Rodar localmente (sem nenhuma credencial)

```bash
cd preset-lab
npm ci
npm run dev            # http://localhost:3000
```

Sem variáveis de ambiente o app sobe em **modo demonstração local**, identificado por uma faixa no topo:

- dados em `.data/db.json` (criado na primeira requisição com o catálogo de demonstração: 12 presets, 4 grátis e 8 premium);
- autenticação local com o mesmo fluxo do Supabase (cadastro → e-mail de confirmação → login). Os e-mails aparecem em **/dev/emails**;
- pagamentos **simulados** em `/checkout/simulado/:id` — nenhuma cobrança real; os pedidos ficam marcados como “simulados” e não entram na receita do dashboard;
- arquivos de preset entregues por links assinados que expiram em 60 s.

Para virar administrador: cadastre-se, confirme o e-mail e rode `npm run admin:promote -- voce@exemplo.com`.

Esse modo é **bloqueado em produção** (`NODE_ENV=production`) — lá o app exige Supabase e Mercado Pago (veja abaixo).

## Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | servidor de desenvolvimento |
| `npm run build` / `npm start` | build e servidor de produção |
| `npm run typecheck` | TypeScript |
| `npm test` | Vitest (regras de acesso, filtros, webhook, tokens, checkout, downloads) |
| `npm run test:sql` | aplica migrations + seed num PostgreSQL local descartável e roda os testes de RLS |
| `npm run test:e2e` | Playwright (build de produção em modo demo, desktop + mobile) |
| `npm run test:all` | tudo acima |
| `npm run assets:generate` | regenera imagens e presets de demonstração |
| `npm run db:seed-sql` | regenera `supabase/seed.sql` a partir do catálogo |
| `npm run admin:promote -- email` | promove um usuário existente a admin |

## Documentação

- [docs/ARQUITETURA.md](docs/ARQUITETURA.md) — arquitetura, estrutura de pastas, decisões
- [docs/SUPABASE.md](docs/SUPABASE.md) — banco, migrations, RLS, storage, e-mails de auth, admin inicial
- [docs/DEPLOY.md](docs/DEPLOY.md) — Vercel, variáveis de ambiente, Mercado Pago, checklist de produção
- [docs/TESTES.md](docs/TESTES.md) — relatório de testes
- [.env.example](.env.example) — todas as variáveis

## Sobre o conteúdo de demonstração

Produtos, coleções e inspirações de demonstração são marcados com `is_demo = true` e exibem o selo “Produto de demonstração”. As imagens são **geradas pelo próprio projeto** (`scripts/generate-assets.mjs`, cenas em SVG + grão) e os arquivos são **presets XMP reais** do Lightroom, criados para a demonstração. Não há depoimentos, vendas ou números inventados.
