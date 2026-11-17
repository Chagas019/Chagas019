# Arquitetura

## Diagnóstico do repositório (17/11/2026)
O repositório `Chagas019` é uma coleção de sites estáticos (Comunica+Fé, brabo-club em Vercel Functions, etc.). Não havia código do Paróquia360. O projeto nasce isolado em `paroquia360/` para não interferir no site publicado.

## Stack
| Camada | Escolha | Motivo |
|---|---|---|
| Front | Next.js 15.5 (App Router) + TypeScript + CSS do design system (`globals.css`) | SSR, rotas por paróquia; o CSS do protótipo já é o design system, Tailwind/shadcn não foram necessários |
| Back | Supabase: Postgres, Auth, RLS, Storage, Edge Functions | RLS resolve isolamento por paróquia no próprio banco; Supabase já está conectado nesta conta |
| Hospedagem | Vercel | Conector disponível; previews por PR |
| Validação | Zod (front e server actions) | Um esquema só |
| Testes | Vitest (unidade), Playwright (e2e), pgTAP/SQL (RLS) | |

## Ambiente
- Supabase: projeto `paroquia360` (ref `gyhnmnzaxrlamvptczek`, região sa-east-1, plano gratuito). URL: https://gyhnmnzaxrlamvptczek.supabase.co
- Migrações aplicadas: `init`, `harden`. Sem dados (o `seed.sql` é só para desenvolvimento local).

## Multi-tenant
- Banco único, coluna `parish_id` em toda tabela de domínio.
- Tabela `memberships(user_id, parish_id, role)` é a fonte da verdade de acesso.
- **RLS em todas as tabelas**: `parish_id in (select parish_id from memberships where user_id = auth.uid())` + checagem de papel para escrita.
- Paróquia ativa na URL: `/p/[slug]/...`; o servidor nunca confia no slug sem checar membership.
- Admin geral não tem bypass implícito: suporte usa acesso temporário auditado.

## Estrutura alvo
```
paroquia360/app/            Next.js (implementado)
  src/app/(auth)/           login, convite
  src/app/p/[slug]/         painel, agenda, escalas, pastorais, voluntarios
  src/components/ui/        design system (tokens do DESIGN_SYSTEM.md)
  src/lib/supabase/         clients server/browser
  supabase/migrations/      SQL versionado (schema + RLS)
```

## Papel do Floot
Floot é uma plataforma full-stack própria (React + endpoints + banco próprio). Para não construir o produto duas vezes:
- **Usar para:** protótipos rápidos de fluxos novos (ex.: wizard de escala, formulário de inscrição) e testes de usabilidade com usuários reais antes de codar no app principal.
- **Não usar para:** dados reais, autenticação ou qualquer parte do produto em produção.
- Cada protótipo Floot é registrado em `DECISIONS.md` com link e o que foi aprendido.
