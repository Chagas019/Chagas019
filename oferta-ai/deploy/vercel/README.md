# Deploy em produção (Vercel + Supabase)

Ambiente publicado:

| Peça | Onde | Detalhe |
|---|---|---|
| Painel | Vercel · projeto `oferta-ai` | https://oferta-ai-chagas7.vercel.app · região `gru1` (São Paulo) |
| API + agentes | Vercel · projeto `oferta-ai-api` | https://oferta-ai-api.vercel.app · função serverless `gru1`, até 300 s |
| Banco | Supabase · projeto `paroquia360` | schema isolado `oferta_ai`, usuário `oferta_app` (sem acesso às tabelas do paroquia360) |
| Agendador | Supabase `pg_cron` + `pg_net` | job `oferta-ai-ciclo`, a cada 5 min → `POST /api/cron/run` |

Como a conta Vercel não está ligada ao GitHub, cada projeto recebe só os arquivos desta pasta; no build, a Vercel baixa
o código do commit fixado em `vercel.json` (`codeload.github.com/.../tar.gz/<sha>`) e compila.

**Para publicar uma nova versão:** troque o SHA nos dois `vercel.json` pelo commit novo e crie um deploy com estes arquivos
(Vercel MCP `create_deployment` ou `vercel deploy --prod` dentro de cada pasta). Novas migrações do Prisma precisam ser
aplicadas no schema `oferta_ai` antes do deploy.

Segredos (`DATABASE_URL`, `JWT_SECRET`, `ENCRYPTION_KEY`, `CRON_SECRET`, `ADMIN_PASSWORD`) ficam só nas variáveis de
ambiente da Vercel e no job do `pg_cron`; não estão no repositório.

Pausar os agentes: botão **STOP ALL** no painel, ou no Supabase: `SELECT cron.unschedule('oferta-ai-ciclo');`
