# Publicar o MAILBOT AI

## Vercel

1. Importe o repositório na Vercel e defina **Root Directory = `mailbot-ai`** (framework: Next.js).
2. Em **Settings → Environment Variables**, cadastre todas as variáveis do `.env.example` com `APP_URL=https://SEU-DOMINIO`.
3. Deploy. O `vercel.json` agenda `/api/cron` a cada hora (plano Pro). No plano Hobby use o agendamento via `pg_cron` descrito em `docs/SUPABASE.md`.
4. Atualize no Google Cloud e no Supabase as URLs de redirecionamento com o domínio final.

## Verificação pós-deploy

- `GET /login` responde 200.
- Criar conta e entrar com e-mail e senha funciona e redireciona para `/`.
- Em Configurações → **Conectar Gmail** → autorizar → volta com "Gmail conectado!" e a sincronização inicial começa.
- `curl -H "Authorization: Bearer $CRON_SECRET" https://SEU-DOMINIO/api/cron` retorna `{"synced":…}`; sem o cabeçalho retorna 401.
- Supabase → Advisors → Security sem alertas de RLS.

## Limites

- Funções serverless têm tempo máximo: a sincronização processa até ~250 mensagens por rodada e continua de onde parou (o app repete automaticamente; o cron também retoma).
- O custo de IA por usuário é limitado por `ai_daily_budget_usd` (padrão US$ 0,50/dia).
