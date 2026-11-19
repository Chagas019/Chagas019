# Publicar o MAILBOT AI

## Vercel (projeto `mailbot-ai`, time `chagas7`)

Produção: https://mailbot-ai-chagas7.vercel.app — verificação: `GET /api/health` (mostra o que está configurado, nunca valores).

### Como o deploy é feito
O repositório é público. O projeto na Vercel usa como *install command*:

```
git clone --depth 1 -b <branch> https://github.com/Chagas019/Chagas019.git /tmp/mbsrc && cp -r /tmp/mbsrc/mailbot-ai/. . && npm ci
```

Assim o deploy funciona mesmo sem a integração GitHub ↔ Vercel. Quando a integração for instalada, conecte o repositório ao projeto com **Root Directory = `mailbot-ai`** e remova o install command personalizado: cada push passa a publicar sozinho.

### Variáveis
| Variável | Origem |
|---|---|
| `TOKEN_ENCRYPTION_KEY`, `CRON_SECRET` | geradas automaticamente no provisionamento (sensíveis) |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | integração Supabase + Vercel (Storage → Supabase) |
| IA | **Vercel AI Gateway via OIDC** — automático em deploys da Vercel, sem chave. Opcional: `AI_GATEWAY_API_KEY` ou `ANTHROPIC_API_KEY` |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | cliente OAuth do Google Cloud (ver `GOOGLE_CLOUD.md`) |
| `APP_URL` | opcional; padrão = domínio de produção da Vercel |

### Agendamento
`vercel.json` agenda `/api/cron` 1x/dia (aceito em qualquer plano). Para respeitar a frequência de sincronização configurada (até 15 min), agende também pelo `pg_cron` do Supabase (ver `SUPABASE.md`).

## Verificação pós-deploy
- `GET /api/health` → `ok: true` e lista `missing` vazia.
- `GET /login` → 200 (formulário, ou aviso de instalação se o banco ainda não estiver conectado).
- `GET /api/cron` sem cabeçalho → 401; com `Authorization: Bearer $CRON_SECRET` → `{"synced":…}`.
- Criar conta → Configurações → **Conectar Gmail** → volta com “Gmail conectado!” e a sincronização começa.

## Limites
- Funções serverless têm tempo máximo: a sincronização processa até ~250 mensagens por rodada e continua de onde parou.
- O custo de IA por usuário é limitado por `ai_daily_budget_usd` (padrão US$ 0,50/dia).
