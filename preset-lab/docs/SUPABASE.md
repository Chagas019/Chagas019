# Configurar o Supabase

## 1. Criar o projeto
1. Em [supabase.com](https://supabase.com) crie um projeto (região sugerida: São Paulo, `sa-east-1`).
2. Em **Settings → API**, copie: Project URL, `anon` key e `service_role` key.

## 2. Aplicar as migrations
Opção A — Supabase CLI:
```bash
npx supabase link --project-ref <ref>
npx supabase db push            # aplica supabase/migrations/*
```
Opção B — SQL Editor: rode, na ordem, `supabase/migrations/20261126000100_schema.sql` e `20261126000200_rls_functions.sql`.

As migrations criam: 15 tabelas (profiles, categories, products, product_files, collections, collection_products, favorites, purchases, purchase_items, subscriptions, downloads, inspiration_posts, banners, payment_events, rate_limits), índices, restrições de integridade, gatilhos (perfil automático, `published_at`, contador de downloads, proteção do papel de admin), funções (`can_access_product`, `fulfill_purchase`, `rate_limit_hit`, `admin_dashboard_stats`), **RLS em todas as tabelas** e os buckets `preset-files` (privado) e `media` (público).

Antes de aplicar no projeto real, dá para validar tudo localmente: `npm run test:sql` (PostgreSQL 14+ instalado).

## 3. Catálogo de demonstração (opcional)
```bash
# linhas do catálogo
psql "$DATABASE_URL" -f supabase/seed.sql        # ou cole no SQL Editor
# arquivos de preset para o bucket privado
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run seed:supabase-files
```
Tudo fica marcado com `is_demo = true`. Para remover depois: `delete from products where is_demo; delete from collections where is_demo; delete from inspiration_posts where is_demo;`.

## 4. Auth
**Authentication → URL Configuration**
- Site URL: `https://seu-dominio.com.br`
- Redirect URLs: `https://seu-dominio.com.br/auth/confirm`

**Authentication → Providers → Email:** “Confirm email” ligado.

**Authentication → Email Templates** (fluxo com `token_hash`, recomendado para SSR):
- *Confirm signup*: `<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/lab">Confirmar e-mail</a>`
- *Reset password*: `<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/redefinir-senha">Redefinir senha</a>`

(O app também aceita o fluxo PKCE com `?code=`.) Para produção, configure um SMTP próprio em **Settings → Auth → SMTP** — o SMTP padrão do Supabase tem limite baixo de envios.

## 5. Administrador inicial (sem senha padrão)
1. Cadastre-se normalmente no site e confirme o e-mail.
2. Promova a conta — no SQL Editor:
   ```sql
   update public.profiles set role = 'admin' where email = 'voce@exemplo.com';
   ```
   ou `SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run admin:promote -- voce@exemplo.com`.

Depois disso, novos admins são promovidos pelo Admin Studio (Usuários). Um admin não consegue remover o próprio acesso, e usuários comuns não conseguem alterar `role` (gatilho `profiles_guard_role`).

## Segurança — resumo
- `anon`: lê catálogo publicado, categorias, coleções, inspirações e banners ativos.
- `authenticated`: lê o próprio perfil, compras, assinaturas e downloads; gerencia os próprios favoritos; edita nome/bio.
- Compras, assinaturas, downloads e eventos de pagamento **não** podem ser escritos pelo cliente — só pelo servidor (service role) depois das verificações.
- `product_files` e o bucket `preset-files` não têm política para `anon`/`authenticated`: o arquivo só sai por URL assinada gerada no servidor.
- Admin (`is_admin()`) gerencia catálogo, conteúdo e papéis via RLS.
