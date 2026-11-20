# JARVIS v2 — Revisão de segurança (T07)

Escopo: `backend/src/server/**`, `backend/src/ai/**`, `backend/src/main.ts`, `supabase/migrations/*.sql`.
Fora do escopo (revisar depois): `backend/src/integrations/**`, app iOS. Nenhum código de produção foi alterado.
Testes: `backend/test/e2e/*.test.ts` (`npx vitest run test/e2e`). Achados reais estão como `it.fails` (viram erro se forem corrigidos: trocar por `it`).

## Achados

| ID | Sev. | Onde | Problema | Correção sugerida | Teste |
|---|---|---|---|---|---|
| F-01 | média | `supabase/migrations/20261120000000_jarvis_init.sql:100-111` | Policies `for all` em conversations/messages/memories/tasks/devices: um usuário autenticado grava direto via PostgREST (burla rate limit, limite de corpo e orçamento de armazenamento) e pode inserir `messages.meta.pending` forjado, que `confirm=true` executa como ação confirmada (hoje auto-impacto; crítico quando existirem ferramentas externas). | O backend usa conexão de serviço: `revoke all` de anon/authenticated nas tabelas, ou policies só `for select`; `messages` somente leitura. Adicionar CHECK de tamanho em `content`/`title`. | `migrations` F-01 |
| F-02 | média | `src/ai/orchestrator.ts:127` | Orçamento é lido uma única vez (`costSince`) antes de gastar: requisições concorrentes (e até 5 iterações por pedido) passam todas. 10 chats paralelos gastaram 1,00 USD com limite de 0,15. | Reserva atômica (UPDATE ... RETURNING em contador diário) ou checagem a cada iteração + lock por usuário; limitar concorrência por usuário. | `providers` F-02 |
| F-03 | média | `src/ai/orchestrator.ts:144-153`, `src/server/app.ts:165-181` | Pendência é consumida só ao gravar a próxima mensagem do assistente: dois `confirm=true` simultâneos executam a ação 2x (ex.: e-mail duplicado). Também não há TTL nem vínculo com o texto do usuário (`confirm=true` com "cancelar" executa). | Pendência com id + expiração (ex. 10 min); consumo atômico (`UPDATE ... WHERE pending_id=$1 AND consumed=false`) antes de executar; cliente envia `pendingId`. | `chat` F-03 |
| F-04 | média | `src/ai/orchestrator.ts:184` | Sem teto de tool calls por iteração: uma resposta do modelo (ou injeção) dispara N escritas (30 tarefas criadas em 1 pedido), até 5×N no total; `remember`/`create_task`/`complete_task` não pedem confirmação. | Limitar a ~8 chamadas por iteração e ~20 por pedido; auditar e abortar acima disso. | `chat` F-04 |
| F-05 | média | `src/ai/pricing.ts:46-50` | Modelo sem preço (ex. `JARVIS_MODEL_*` ou `JARVIS_FALLBACK_CHAIN` com modelo fora da tabela) custa 0: o orçamento diário deixa de valer sem aviso ao usuário (fail-open). | Preço default conservador (maior da tabela) ou recusar modelo sem preço na inicialização do Router. | `providers` F-05 |
| F-06 | média | `src/server/config.ts:8,42`, `src/server/auth.ts:25` | `NODE_ENV` ausente vira `development`: um deploy sem a variável com `JARVIS_DEV_TOKEN` definido aceita o token de dev (usuário `dev-user`). Sem tamanho mínimo do token. | Habilitar dev token só com `NODE_ENV` explicitamente `development`/`test`, ou default `production`; exigir ≥32 chars; log de aviso. | `auth` F-06 |
| F-07 | baixa | `src/server/auth.ts:37` | `iss` não validado (só `aud`). Com JWKS o risco é menor (chaves do projeto), mas com segredo HS256 compartilhado qualquer emissor com o segredo passa. | `issuer: ${SUPABASE_URL}/auth/v1` quando `SUPABASE_URL` existir. | `auth` F-07 |
| F-08 | baixa | `src/server/app.ts:163` | Conversa é criada antes do orquestrador: 503/502/429 deixam conversas vazias (poluição/abuso de armazenamento). | Criar a conversa só após resposta bem-sucedida (ou apagar no erro). | `providers` F-08 |
| F-09 | baixa | `src/server/app.ts:174-178` | `meta.pending` (ferramenta + input) volta em `GET /v1/conversations/:id/messages`, contra o comentário "nunca enviado ao cliente". | Filtrar `meta.pending` na rota (ou guardar em coluna interna). | `chat` F-09 |
| F-10 | baixa | `src/server/repos/postgres.ts:38` | `ssl: { rejectUnauthorized: false }` desliga verificação do certificado do DB (MITM). Regex `localhost\|127.0.0.1` aplicada à URL inteira pode desligar TLS se a string aparecer em qualquer parte (ex.: parâmetro). | Verificar CA (`DATABASE_CA`/`sslmode=verify-full`); testar apenas o host parseado. | revisão |
| F-11 | baixa | `src/ai/orchestrator.ts:114-117,129` | Mensagem de erro de ferramenta (ex.: erro do pg para id não-UUID em `complete_task`) vai ao modelo e ao audit; id não é validado como UUID nas tools. | Validar UUID no zod das tools; mensagem genérica ao modelo, detalhe só no audit. | revisão |
| F-12 | baixa | `src/server/app.ts:112-128` | Rate limit só após autenticação e em memória por instância (serverless: não compartilhado); 401 em enxurrada não é limitado; `/health` público expõe provedores configurados e tipo de DB. | Rate limit por IP antes do auth (ou no edge/WAF); reduzir `/health` público a `{ok}`. | revisão |
| F-13 | baixa | `src/ai/orchestrator.ts:138-141,172-176` | Ferramenta falha após efeito (ex. 502 na 2a iteração): ação feita, mensagem não persistida; retry duplica a escrita. Memórias/títulos de tarefa são conteúdo não confiável reinjetado no prompt (injeção persistente) sem delimitação. | Persistir a mensagem do usuário antes; delimitar dados não confiáveis no prompt (`<dados>`); manter confirmação para qualquer ferramenta destrutiva. | revisão |
| F-14 | info | `src/main.ts:22-27`, logger | Produção sem `DATABASE_URL` roda em memória (só aviso); URL com query (`/v1/memories?q=`) é logada em texto claro; sem timeouts/`close` gracioso do Fastify. | Exigir `DATABASE_URL` em produção; mascarar query no log; `requestTimeout`. | revisão |

## Verificado e aprovado

- JWT: algoritmos fixados (HS256 só com segredo; ES256/RS256/EdDSA só via JWKS), `alg: none`, HS384, assinatura errada, payload adulterado, expirado, `aud` errada, sem `exp`, sem `sub` -> 401 (e2e). Sem confusão de algoritmo (HS256 nunca verificado com chave pública).
- Comparação do token de dev em tempo constante (hash SHA-256 + `timingSafeEqual`); dev token desativado com `NODE_ENV=production` (e produção exige `JARVIS_ENCRYPTION_KEY` e Supabase configurado).
- Isolamento (IDOR): conversas, mensagens, memórias, tarefas, auditoria, uso e dispositivos filtrados por `userId` em todas as rotas e repos; mensagens só após checar posse da conversa; ferramentas usam `ctx.userId` (B não conclui tarefa de A via modelo); IDs não-UUID -> 404 (e2e).
- SQL: todas as queries de `postgres.ts` parametrizadas; único SQL dinâmico (`tasks.update`) usa lista fixa de colunas; busca de memória sem LIKE/concatenação.
- Confirmação: ferramenta com `sideEffect` nunca executa sem `confirm=true` + pendência gravada pelo servidor na conversa do próprio usuário; `confirm=true` sem pendência, em outra conversa, de outro usuário ou após nova mensagem não executa nada; pendência não vem no corpo do `/v1/chat` (e2e).
- Loop de ferramentas limitado a 5 iterações; ferramenta desconhecida/entrada inválida viram erro auditado.
- Auditoria: toda chamada (ok, erro, pendente, desconhecida) gera `audit_events` com `userId`.
- Orçamento: 429 `budget_exceeded` antes de chamar o provedor; por usuário; degradação de tier a 70%/85%.
- Erros: formato do contrato; 500 genérico sem stack/mensagem; 502 sem detalhe do provedor (só em log); `authorization`/`cookie` redigidos no log; config não ecoa valores de segredos.
- Provedores: chaves em header (Gemini via `x-goog-api-key`, não na URL); timeout 60s; fallback; 401 não repete no mesmo provedor; 503 sem provedor, 502 se todos falham (e2e).
- HTTP: corpo ≤32KB, schemas `strict` com limites, rate limit por usuário com `Retry-After`, CORS por allowlist exata, headers (nosniff, DENY, no-referrer, no-store, HSTS, CSP).
- Migrations: RLS habilitado em todas as tabelas; `integration_tokens` sem policy (só serviço), tokens cifrados AES-256-GCM (IV aleatório, tag verificada); `usage`/`audit` só leitura para o cliente.

## Não verificado
RLS em banco real (teste estático apenas), `src/integrations/**` (OAuth/state/escopos), app iOS, infraestrutura (Vercel/Supabase), dependências (`npm audit`).
