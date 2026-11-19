# MAILBOT AI no Floot (versão principal)

Projeto Floot: `92a17f09-27cb-4fe9-88c9-f9409ff82bf9` (app "MAILBOT AI").

Por que Floot: entrega **banco exclusivo** (Postgres gerenciado), **conexão Gmail intermediada** (sem cliente OAuth próprio no Google Cloud) e **IA cobrada em créditos Floot** (sem cartão/chave) — eliminando as três pendências de conta da versão Vercel/Supabase deste repositório.

## Arquitetura
- **Banco exclusivo** (tabelas: users, user_preferences, gmail_accounts, emails, email_categories, email_summaries, ai_conversations, ai_conversation_messages, daily_reports, sync_history, ai_usage, ai_cache, rate_limits). Guarda **apenas referências e classificação estruturada** (IDs, datas, rótulos, hash do remetente, categoria/prioridade/prazo/ação/motivo) — política de dados do Google/Floot: conteúdo de e-mails nunca é gravado; é lido do Gmail na hora e descartado.
- **3 agentes + orquestrador** (helpers `mailOrchestrator`, `mailTriage`, `mailSummary`, `mailChat`, `mailDispatch`), portados da versão testada deste repositório.
- **IA**: `@floot/ai` — `gpt-6-luna` (triagem, resumos, chat simples) e `gpt-6-sol` (perguntas analíticas e resumo semanal), orçamento diário por usuário e registro de consumo por agente.
- **Gmail**: `@floot/google-integrations`, cliente só de leitura (`helpers/gmailApi`), sincronização inicial paginada e incremental via `history.list`.
- **Endpoints** `endpoints/mailbot/*` atrás de `_middleware` de login; rate limit no Postgres.

## Observações
- O pacote Gmail do Floot pede escopo de leitura **e envio** (é o único oferecido); o MAILBOT nunca chama envio, arquivamento ou exclusão — o cliente só implementa leitura.
- Tarefas agendadas do Floot exigem plano pago; por isso a sincronização roda ao abrir o app (na frequência configurada) e pelo botão Sincronizar, e o resumo do dia é gerado ao abrir o app após o horário escolhido.
- Login: e-mail e senha. A conta do dono já existe sem senha: em Entrar → "Forgot password?" com o e-mail do dono.

## Código no repositório
`mailbot-ai/floot/` guarda uma cópia do código do Floot para versionamento e testes locais:
- `floot/helpers/`: a lógica de backend (3 agentes, orquestrador, regras, parser, proteção contra prompt injection, cliente Gmail, chamada de IA). `db.tsx` e `mailQueries.tsx` são simplificados aqui; a implementação completa está no Floot.
- `floot/sql/001_mailbot_floot.sql`: o schema aplicado no banco do Floot.
- `floot/tests/`: 31 testes (`npm run test:floot`), com banco, Gmail e IA simulados.

A fonte de verdade é o projeto no Floot; endpoints e telas ainda não estão espelhados aqui.

## Estado (19/11/2026)
Backend, banco, 3 agentes e todas as telas escritos; typecheck limpo no Floot; 31 testes da lógica passando localmente. Pendentes (limite diário de ações do plano Floot gratuito, retomada automática às 22:05 UTC): screenshots, specs, teste real da IA, testes de integração e publicação.
