# Configurar o Supabase

1. Crie um projeto em https://supabase.com/dashboard (região próxima dos usuários, ex.: São Paulo `sa-east-1`).
2. **SQL Editor** → cole e execute `supabase/migrations/20261119000000_mailbot_init.sql`
   (ou, com a CLI: `supabase link --project-ref <ref> && supabase db push`).
3. **Project Settings → API**: copie
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` / publishable key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` / secret key → `SUPABASE_SERVICE_ROLE_KEY` (**somente servidor**)
4. **Authentication → URL Configuration**:
   - Site URL: `https://SEU-DOMINIO` (ou `http://localhost:3000` em dev)
   - Redirect URLs: `http://localhost:3000/auth/callback`, `https://SEU-DOMINIO/auth/callback`
5. **Authentication → Providers**:
   - **Email** (e-mail + senha) já vem ativo. Por padrão o Supabase exige confirmar o e-mail no cadastro; para dispensar, desative **Confirm email**. Se mantiver a confirmação, configure um SMTP próprio em produção (o SMTP padrão tem limite baixo de envios).
   - **Google** (opcional, para "Entrar com Google"): use o mesmo Client ID/Secret do Google Cloud e adicione `https://SEU-PROJETO.supabase.co/auth/v1/callback` nos redirecionamentos do cliente OAuth.
6. Depois de aplicar a migration, rode **Advisors → Security** para conferir que nenhuma tabela ficou sem RLS.

## O que a migration cria

| Tabela | Conteúdo | Acesso do cliente (RLS) |
|---|---|---|
| `profiles` (Users) | nome de exibição | lê/edita o próprio |
| `user_preferences` | fuso, sincronização, horário do resumo, VIP/trabalho/ignorados, orçamento de IA | lê o próprio (escrita via API) |
| `gmail_accounts` | caixa conectada, status, cursor de sincronização | lê a própria |
| `gmail_tokens` | refresh/access token **criptografados** | nenhum (só servidor) |
| `emails` | mensagens sincronizadas + índice de busca (português) | lê as próprias |
| `email_categories` | categorias | leitura |
| `email_summaries` | resultado do MAIL TRIAGE | lê os próprios |
| `ai_conversations` / `ai_conversation_messages` | chat | lê/apaga as próprias |
| `daily_reports` | resumos diários/semanais | lê os próprios |
| `sync_history` | histórico de sincronizações | lê o próprio |
| `ai_usage` | tokens e custo por agente | lê o próprio |
| `ai_cache`, `rate_limits` | cache de IA e limitação de taxa | nenhum (só servidor) |

Todas as tabelas têm `on delete cascade` a partir de `auth.users`: excluir o usuário apaga todos os dados dele.

## Agendamento sem Vercel Pro (opcional)

O plano Hobby da Vercel só executa cron uma vez por dia. Para sincronizar de hora em hora, use o `pg_cron` + `pg_net` do Supabase:

```sql
create extension if not exists pg_cron;
create extension if not exists pg_net;
select cron.schedule('mailbot-hourly', '0 * * * *', $$
  select net.http_get(
    url := 'https://SEU-DOMINIO/api/cron',
    headers := jsonb_build_object('Authorization', 'Bearer SEU_CRON_SECRET')
  );
$$);
```
