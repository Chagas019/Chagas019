# MAILBOT AI — Personal Email Assistant

> Sua caixa de entrada, sob controle da inteligência artificial.

Assistente pessoal que conecta ao Gmail (somente leitura), classifica cada mensagem, gera resumos diários/semanais e responde perguntas sobre os e-mails reais da conta — com referências às mensagens usadas.

**Stack:** Next.js 16 (App Router) · Supabase exclusivo (Postgres + Auth + RLS) · Gmail API (OAuth 2.0 + PKCE, `gmail.readonly`) · Claude via Vercel AI Gateway (OIDC) ou API da Anthropic · Vercel · Vitest.

**Produção:** https://mailbot-ai-chagas7.vercel.app · status: `/api/health` · relatório de testes: [`docs/TESTES.md`](docs/TESTES.md)

## Funcionalidades

| Tela | O que faz |
|---|---|
| **Início** | Saudação, personagem animado, status do Gmail, última sincronização, contadores (analisadas, importantes, hoje, aguardam resposta), resumo inteligente do dia, pendências, botão para o chat |
| **Importantes** | Abas Urgentes · Precisam de resposta · Trabalho · Financeiro · Pessoais · Compromissos · Informativos. Cada mensagem: remetente, assunto, data, resumo da IA, prioridade, motivo, ação recomendada |
| **Chat AI** | Perguntas em linguagem natural sobre os e-mails reais, com referências `[n]` clicáveis. Não inventa quando não encontra |
| **Mensagens** | Todas as mensagens sincronizadas, busca textual (português), filtros, paginação, conteúdo original e link para o Gmail |
| **Relatórios** | Resumo diário e semanal: recebidas, importantes, pendências, respostas aguardadas, prazos, compromissos, cobranças, por categoria + consumo de IA por agente |
| **Configurações** | Conectar/desconectar Gmail, preferências de classificação (VIP, domínios de trabalho, ignorados), frequência de sincronização, horário do resumo diário, limite de custo de IA, segurança, exclusão de dados |

## Arquitetura multiagente (exatamente 3 agentes)

```
pergunta/evento ─► ORQUESTRADOR (regras, custo zero) ─┬─► AGENTE 01 · MAIL TRIAGE   (classifica → email_summaries)
                                                       ├─► AGENTE 02 · MAIL SUMMARY  (relatórios ← resultados do Triage)
                                                       └─► AGENTE 03 · MAIL CHAT     (consulta e-mails, classificações e relatórios)
```

- **Orquestrador** (`src/lib/agents/orchestrator.ts`): roteamento determinístico por intenção; cada intenção pertence a um único agente; nenhum agente roda sem necessidade.
- **MAIL TRIAGE** (`triage.ts` + `rules.ts`): regras determinísticas primeiro (enviados, ignorados, promoções em massa) → cache por conteúdo → IA em lotes de 8 com modelo econômico. Considera remetente, cabeçalhos, rótulos do Gmail e histórico com o remetente — nunca só o assunto.
- **MAIL SUMMARY** (`summary.ts`): agrega por SQL os resultados do Triage; a IA só escreve uma narrativa curta sobre itens estruturados; o semanal reaproveita as narrativas diárias; relatórios são reutilizados enquanto não chegar e-mail novo.
- **MAIL CHAT** (`chat.ts`): perguntas cobertas por SQL (importantes hoje, cobranças, aguardando resposta, compromissos, trabalho, ignoráveis) são respondidas **sem IA**; buscas usam full-text search; perguntas abertas enviam no máximo 6 e-mails truncados ao modelo, e só citações válidas viram referências.

### Otimização de tokens
Model routing por complexidade (`AI_MODEL_FAST` para triagem/perguntas simples, `AI_MODEL_SMART` para análise e resumo semanal) · contexto reduzido (corpo truncado) · cache de resultados (`ai_cache`) · deduplicação por hash de conteúdo · processamento incremental (só `triage_status = pending`) · reutilização de resumos · `max_tokens` por operação · prompt caching do system prompt · registro de consumo por agente (`ai_usage`) · orçamento diário por usuário (`ai_daily_budget_usd`).

### Segurança
OAuth com `state` + PKCE · escopo mínimo `gmail.readonly` · conexão só é marcada como concluída depois que a Gmail API devolve o perfil real · tokens criptografados com AES-256-GCM (`gmail_tokens` sem acesso via API pública) · RLS em todas as tabelas · escritas apenas pelo servidor com validação (zod) · rate limiting no Postgres · logs sem conteúdo sensível · proteção contra prompt injection (conteúdo delimitado e neutralizado, saída validada por schema) · revogação do token ao desconectar · exclusão completa de dados · cabeçalhos de segurança (HSTS, X-Frame-Options…). O app **não envia, apaga nem altera** e-mails.

## Executar localmente

```bash
cd mailbot-ai
npm install
cp .env.example .env.local   # preencha (ver docs/)
npm run dev                  # http://localhost:3000
```

1. Configure o Supabase → [`docs/SUPABASE.md`](docs/SUPABASE.md)
2. Configure o Google Cloud → [`docs/GOOGLE_CLOUD.md`](docs/GOOGLE_CLOUD.md)
3. Gere os segredos: `openssl rand -base64 32` (TOKEN_ENCRYPTION_KEY) e `openssl rand -hex 32` (CRON_SECRET)
4. IA: na Vercel é automática (AI Gateway via OIDC). Localmente, defina `AI_GATEWAY_API_KEY` ou `ANTHROPIC_API_KEY`.

Dados de demonstração (somente desenvolvimento, recusa produção):
```bash
NODE_ENV=development SEED_USER_EMAIL=voce@exemplo.com npm run seed:dev
```

## Testes

```bash
npm test          # 58 testes: OAuth, cliente Gmail (retry/refresh/429), sincronização inicial/incremental/expirada,
                  # 3 agentes, orquestrador, prompt injection, cache, orçamento, custo, criptografia
npm run test:rls  # sobe um Postgres temporário, aplica a migration e testa isolamento entre usuários (RLS)
npm run typecheck
npm run build
```

## Publicar (Vercel)

Ver [`docs/DEPLOY.md`](docs/DEPLOY.md).

## Estrutura

```
src/app/(app)/        telas autenticadas (início, importantes, chat, mensagens, relatórios, configurações)
src/app/api/          gmail/connect|callback|disconnect, sync, chat, reports, preferences, account, cron
src/lib/gmail/        OAuth, cliente Gmail API, parser, sincronização
src/lib/agents/       orquestrador, triage, summary, chat, dispatch
src/lib/ai/           LLM (custo/orçamento/cache), model routing, proteção contra prompt injection
src/lib/data/         interface Repo + implementação Supabase
supabase/migrations/  schema + RLS
tests/                testes (Vitest) + testes SQL de RLS
```
