# Execução local e deploy

## Requisitos
Node ≥ 20.18 (recomendado 22), npm. Para backend completo: conta Supabase **ou** Supabase CLI + Docker.

## Rodar localmente
```bash
cd koinonia
npm install
cp .env.example .env.local      # preencha URL e chave anon do Supabase
npm run dev                     # http://localhost:3000
```
Sem `.env.local` o site funciona em modo "serviço em configuração": páginas públicas e formulários renderizam, e as áreas que dependem do banco mostram um estado explicativo.

## Banco
- Supabase na nuvem: `npx supabase link --project-ref <ref>` e `npx supabase db push` (aplica `supabase/migrations`). Depois rode `supabase/seed/01_catalog.sql` no SQL Editor.
- Local com Docker: `npx supabase start` (aplica migrations e o catálogo). Para dados de demonstração: `psql ... -f supabase/seed/02_demo.sql`.
- Primeiro administrador: `insert into public.user_roles (user_id, role) values ('<uuid>', 'admin');` no SQL Editor.
- Auth → URL Configuration: Site URL = domínio do site; Redirect URL = `https://<domínio>/auth/confirm`.
- Templates de e-mail: use `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/onboarding` (confirmação) e `...&type=recovery&next=/redefinir-senha` (recuperação).

## Verificações
```bash
npm run lint && npm run typecheck && npm test && npm run test:db && npm run build && npm run test:e2e
```

## Vercel (não executado — requer autorização)
Root Directory: `koinonia`. Variáveis: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`. Nunca cadastre a `service_role` como `NEXT_PUBLIC_*`.

## Estado atual na Vercel (16/11/2026)
- Projeto: `koinonia` (time chagas). Produção: https://koinonia-gamma.vercel.app (commit c0e7c30).
- Preview do redesign premium: https://koinonia-pgwbc5xto-chagas7.vercel.app (commit fb4dca7) — aguardando validação para promover.
- Proteção de deploy (Vercel Authentication) desativada: o site é público.

### Variáveis (Vercel → Project koinonia → Settings → Environment Variables)
| Variável | Status | Onde obter |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | ✅ `https://koinonia-gamma.vercel.app` | — |
| `NEXT_PUBLIC_SUPABASE_URL` | ❌ falta | Supabase → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ❌ falta | Supabase → Project Settings → API → anon public key |

Sem as duas variáveis do Supabase, as áreas com dados exibem o estado "Serviço em configuração" (comportamento intencional — nenhum dado fictício é exibido).
Depois de configurar: aplicar `supabase/migrations` (10 arquivos) e `supabase/seed/01_catalog.sql`, e publicar novamente.
