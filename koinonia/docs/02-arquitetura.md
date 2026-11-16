# Arquitetura

## Stack
- **Next.js 16 (App Router, Turbopack) + React 19 + TypeScript estrito** — Server Components por padrão; Server Actions para mutações (proteção CSRF nativa por verificação de Origin).
- **Tailwind CSS v4** com tokens em `@theme` (Design System próprio, componentes no estilo shadcn/ui escritos no projeto).
- **Supabase** (PostgreSQL 16, Auth, Storage) via `@supabase/ssr` com cookies httpOnly.
- **Zod 4** para validação compartilhada; **Vitest** + Testing Library; **Playwright** + axe-core; **GitHub Actions**; deploy alvo **Vercel**.

## Princípios
1. **Autorização no banco.** O app usa somente a chave `anon` + JWT do usuário. Toda regra de acesso está em RLS e triggers (`supabase/migrations`). A UI apenas reflete permissões; nunca é a última barreira.
2. **Regras de estado no banco.** Transições (candidatura, verificação, empréstimo, denúncia) são validadas por triggers — impossível burlar chamando a API diretamente.
3. **Sem segredos no cliente.** Nenhuma `service_role` no app. Variáveis `NEXT_PUBLIC_*` contêm apenas URL e chave anon (públicas por design).
4. **Estados explícitos.** Toda página trata carregando, vazio, erro, sucesso, sem permissão e backend não configurado (`StatePanel`).
5. **i18n desde o início.** Todo texto de interface vem de `src/i18n/messages`; pt-BR completo, en/es com fallback automático.

## Fluxo de uma requisição
```
Navegador ──► src/proxy.ts (renova sessão; redireciona rotas protegidas)
          ──► Server Component (lê dados com RLS do usuário)
          ──► Server Action (Zod → Supabase → RLS/trigger → revalidatePath)
```

## Estrutura de diretórios
```
koinonia/
├─ docs/                       auditoria, arquitetura, banco, segurança, design system, roadmap, deploy
├─ src/
│  ├─ app/                     rotas (pt-BR): /oportunidades, /talentos, /comunidades, /match, /painel, /perfil, /admin…
│  ├─ components/ui/           Design System (Button, Field, Card, Badge, Alert, StatePanel…)
│  ├─ components/layout/       Header, menu mobile, footer, PageHeader, LegalPage, Logo
│  ├─ components/features/     cards de oportunidade/comunidade, paginação, estado de backend
│  ├─ design-system/           tokens TS e cálculo de contraste WCAG
│  ├─ features/<domínio>/      actions.ts (Server Actions) + components/ por domínio
│  ├─ services/                consultas tipadas (oportunidades, comunidades, catálogo, paginação)
│  ├─ schemas/                 Zod (auth, perfil, comunidade, oportunidade, denúncia)
│  ├─ i18n/                    dicionários, detecção de idioma, ação de troca
│  ├─ lib/                     env, supabase (server/proxy), erros, utilitários, geo (Intl)
│  ├─ types/                   tipos do banco
│  └─ proxy.ts                 middleware (Next 16)
├─ supabase/migrations/        7 migrations (tipos, tabelas, triggers, RLS, RPCs, storage)
├─ supabase/seed/              catálogo de talentos (real) + demo (somente local)
├─ supabase/tests/             testes SQL de RLS e regras (Postgres real)
├─ tests/unit|e2e/             Vitest e Playwright
└─ scripts/test-db.sh          sobe Postgres temporário e roda os testes SQL
```

## Decisões registradas (ADR resumido)
| Decisão | Alternativa | Motivo |
|---|---|---|
| Next.js App Router | Vite SPA | Renderização no servidor, Server Actions com CSRF, SEO de oportunidades públicas, deploy direto na Vercel |
| Next 16 / Zod 4 | Next 15 / Zod 3 | Versões anteriores tinham avisos de segurança (`npm audit`) em dependências de produção |
| Regras no Postgres (RLS + triggers) | Regras só no app | Defesa em profundidade; API do Supabase é pública |
| Match em SQL + espelho em TS | Só TS | SQL escala (filtra/ordena no banco); TS gera explicações e é testado contra o mesmo caso do SQL |
| Rate limit no banco | Só na borda | Funciona mesmo chamando a API REST diretamente |
| Países/idiomas via `Intl.DisplayNames` | Listas traduzidas à mão | Zero manutenção, qualquer idioma |
