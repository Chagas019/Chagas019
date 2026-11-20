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

## Produção atual
- **App (iPhone, sem Apple):** https://jarvis-api-chagas7.vercel.app — no Safari: Compartilhar → "Adicionar à Tela de Início".
  Entre com o token do dono (Vercel → jarvis-api → Settings → Environment Variables → `JARVIS_OWNER_TOKEN`).
- **API:** mesmo domínio (`/v1/*`, `/health` mostra `dbOk` e provedores). Região gru1.
- **IA:** ponte no Floot (`https://jarvis-ai-bridge.floot.app/_api/v1/messages`, projeto "Jarvis AI Bridge"),
  compatível com a Messages API da Anthropic; Claude Sonnet/Opus 5.5 pelos créditos do Floot. Protegida por chave
  (só o hash fica no código do Floot; a chave está em `ANTHROPIC_API_KEY` na Vercel, com `ANTHROPIC_BASE_URL`).
- **Banco:** schema `jarvis` no Supabase existente, usuário `jarvis_app` restrito a esse schema; TLS com a CA do Supabase.
- **Deploy:** a Vercel baixa o código do GitHub fixado num commit (o repositório ainda não está ligado à Vercel).
- **App nativo (`ios/`):** compila na CI; instalar exige Apple ID no Xcode (opcional, o app web cobre o uso).
