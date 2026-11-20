# JARVIS

Assistente pessoal para iPhone. Um produto, módulos independentes:

| Módulo | Pasta | Verificação |
|---|---|---|
| App iOS (SwiftUI/MVVM, voz, notificações, App Intents, Widget) | `ios/` | CI macOS: `swift test` + `xcodebuild` |
| API (Fastify, auth Supabase, Postgres) | `backend/src/server` | `npm test` |
| IA (multi-provedor, roteamento, orçamento, ferramentas, memória) | `backend/src/ai` | `npm test` |
| Integrações Google (OAuth, Gmail, Calendar) | `backend/src/integrations` | `npm test` |
| Banco | `supabase/migrations` | CI aplica no Postgres 16 |

Contrato: `docs/CONTRACT.md` · Quadro: `docs/BOARD.md` · Orçamento: `../.claude/TOKEN_BUDGET.md`

## Backend local
```bash
cd backend && cp .env.example .env   # preencha ao menos JARVIS_DEV_TOKEN e uma key de IA
npm ci && npm run dev                 # http://localhost:8787/health
npm test
```

## Deploy (Vercel + Supabase)
1. Crie um projeto Supabase próprio do JARVIS e aplique `supabase/migrations/*.sql`.
2. Na Vercel, importe o repositório com **Root Directory** `jarvis/backend` (usa `vercel.json`).
3. Variáveis de produção: `DATABASE_URL` (pooler do Supabase), `SUPABASE_URL`, `JARVIS_ENCRYPTION_KEY`,
   uma key de IA, e `GOOGLE_*` se for usar Gmail/Calendar. Nunca defina `JARVIS_DEV_TOKEN` em produção.
4. Coloque a URL publicada em `ios/Config/*.xcconfig` (`JARVIS_API_URL`).

Observação: o rate limit é em memória por instância; o orçamento de IA é garantido pelo banco.
