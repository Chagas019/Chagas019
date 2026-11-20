# Quadro de tarefas — JARVIS v2
Estados: PENDING · READY · IN_PROGRESS · BLOCKED · REVIEW · TESTING · COMPLETED
Regra: só COMPLETED com evidência (comando + resultado) revisada pelo PM.

| ID | Tarefa | Dono | Arquivos autorizados | Depende | Estado |
|---|---|---|---|---|---|
| T01 | Contrato API + tipos | PM | `jarvis/docs/CONTRACT.md`, `backend/src/core/**`, `backend/package.json` | — | COMPLETED |
| T02 | Servidor, auth, repos, migrations | 03 Backend | `backend/src/server/**`, `backend/src/main.ts`, `backend/test/server/**`, `jarvis/supabase/**` | T01 | COMPLETED (56 testes, migração ok em PG16) |
| T03 | Provedores, roteador, orquestrador, memória | 04 AI | `backend/src/ai/**`, `backend/test/ai/**` | T01 | COMPLETED (20 testes IA) |
| T04 | App iOS (SwiftUI/MVVM, voz, notificações, Intents, Widget) | 02 iOS | `jarvis/ios/**` | T01 | IN_PROGRESS |
| T05 | Google OAuth, Gmail, Calendar (tools) | 05 Integrations | `backend/src/integrations/**`, `backend/test/integrations/**` | T02,T03 | COMPLETED (17 testes; smoke serverless ok) |
| T06 | CI (backend Linux + iOS macOS) | PM | `.github/workflows/jarvis.yml` | T02,T04 | PENDING |
| T07 | Revisão de segurança + testes e2e | 06 QA | `backend/test/e2e/**`, `jarvis/docs/SECURITY_REVIEW.md` | T02–T05 | COMPLETED (29 e2e, 14 achados) |
| T08 | Deploy backend (Vercel) + Supabase próprio | PM | `jarvis/deploy/**` | T07 | BLOCKED (exige autorização/credenciais) |
| T09 | Correções de segurança F-01..F-11 | 03 Backend | server, ai, migrations, test | T07 | COMPLETED (122/122 com PG real) |
