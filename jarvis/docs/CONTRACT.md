# JARVIS — Contrato de API v1

Base: `JARVIS_API_URL` (ex.: `https://jarvis-api.vercel.app`). JSON UTF-8.
Auth: `Authorization: Bearer <token>` — access token do Supabase Auth (JWT, verificado no servidor).
Dev/local: `JARVIS_DEV_TOKEN` (só se definido e `NODE_ENV != production`) → usuário `dev-user`.

Erros: `{ "error": { "code": string, "message": string } }` com status 400/401/403/404/429/500/502/503.
`code` ∈ `bad_request | unauthorized | forbidden | not_found | rate_limited | budget_exceeded | provider_unavailable | internal`.

| Método | Rota | Corpo / Query | Resposta |
|---|---|---|---|
| GET | `/health` | — | `{ ok: true, version, providers: string[], db: "memory"\|"postgres" }` (sem auth) |
| GET | `/v1/me` | — | `{ userId, email? }` |
| POST | `/v1/chat` | `ChatRequest` | `ChatResponse` |
| GET | `/v1/conversations` | `?limit` | `{ items: Conversation[] }` |
| GET | `/v1/conversations/:id/messages` | `?limit` | `{ items: Message[] }` |
| GET | `/v1/memories` | `?q&limit` | `{ items: Memory[] }` |
| POST | `/v1/memories` | `{ kind, content }` | `Memory` |
| DELETE | `/v1/memories/:id` | — | `{ ok: true }` |
| GET | `/v1/tasks` | `?status` | `{ items: JarvisTask[] }` |
| POST | `/v1/tasks` | `{ title, notes?, dueAt? }` | `JarvisTask` |
| PATCH | `/v1/tasks/:id` | `{ title?, notes?, dueAt?, status? }` | `JarvisTask` |
| GET | `/v1/usage` | `?days=1` | `{ limitUsd, spentUsd, items: [...] }` |
| GET | `/v1/audit` | `?limit` | `{ items: AuditEvent[] }` |
| POST | `/v1/devices` | `{ apnsToken }` | `{ ok: true }` |
| GET | `/v1/integrations` | — | `{ google: { configured: bool, connected: bool, scopes: string[] } }` |
| GET | `/v1/integrations/google/start` | — | `{ url }` (OAuth consent) |
| GET | `/v1/integrations/google/callback` | `?code&state` | redireciona para `jarvis://oauth/done?ok=1` |
| DELETE | `/v1/integrations/google` | — | `{ ok: true }` |

Tipos: ver `backend/src/core/types.ts` (fonte única). Datas em ISO-8601 UTC.

## Regras
- Ferramentas com efeito externo (enviar e-mail, criar/alterar evento) retornam `pendingConfirmation`;
  o app mostra a ação e reenvia `POST /v1/chat { conversationId, message: "confirmo", confirm: true }`.
- Toda chamada de ferramenta gera `AuditEvent`.
- Orçamento diário por usuário: `AI_DAILY_BUDGET_USD` (padrão 1.00). Excedeu → 429 `budget_exceeded`.
- Sem provedor configurado: `/v1/chat` responde 503 `provider_unavailable` (nunca resposta falsa).
