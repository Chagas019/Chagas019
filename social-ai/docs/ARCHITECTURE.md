# Arquitetura do SOCIAL AI

## Visão geral

Um único processo Node.js contém três componentes que compartilham o banco SQLite:

1. **API + painel** (`src/api`) — Fastify, autenticação por sessão, papéis `admin` / `editor` / `viewer`.
2. **Worker** (`src/orchestrator/worker.ts`) — consome a fila `jobs`. Concorrência global 3, mas **uma tarefa por lane (agente) por vez**, evitando execuções conflitantes (ex.: duas publicações simultâneas).
3. **Scheduler / Orquestrador** (`src/orchestrator/scheduler.ts`) — a cada 30 s:
   - enfileira as etapas da rotina do dia no horário configurado, **somente se a etapa anterior terminou** (`done`/`dead`);
   - mantém o calendário com ≥ 7 dias de folga (gera mais 30 dias);
   - agenda automaticamente projetos aprovados quando a aprovação humana está desligada;
   - despacha publicações vencidas dentro da janela, respeitando a pausa de emergência;
   - recupera tarefas presas e dispara o backup diário.

## Fluxo de dados

```
trends ─► daily_reports(trends) ─► editorial_calendar ─► content_ideas ─► content_projects
                                                                         ├─ captions (versões)
                                                                         └─ media_assets (sha256 + QA)
content_projects(approved) ─► publications (content_hash único) ─► Graph API ─► publication_metrics
publication_metrics ─► daily_reports(daily/weekly) ─► agents.memory(strategist.analyst_recommendations)
```

## Agentes

Todos passam por `runAgent()` (`src/agents/base.ts`), que:
- cria um registro em `agent_executions` (entrada, saída, erro, duração, tokens);
- atualiza `agents.status` (`running` / `idle` / `error`) e `last_error`;
- grava logs em `agent_logs` (com remoção automática de segredos);
- expõe memória operacional persistente (`agents.memory`).

Identidade, instruções e ferramentas autorizadas ficam em `src/agents/definitions.ts` (instruções editáveis pelo admin).

| Agente | Arquivo | Entradas | Saídas |
|---|---|---|---|
| Trend Scout | `trendScout.ts` | Graph API (hashtags, contas de referência, mídia própria) + web search | `trends`, relatório, ranking de oportunidades |
| Strategist | `strategist.ts`, `calendar.ts` | tendências, recomendações do Analyst, histórico de temas | `editorial_calendar` (30 dias), `content_ideas` |
| Copywriter | `copywriter.ts` | pauta + identidade da marca | `content_projects` (roteiro/slides/stories), `captions` |
| Creative Studio | `creativeStudio.ts`, `creative/templates.ts` | projeto + marca | `media_assets` (JPEG/MP4) + relatório de QA |
| Publisher | `publisher.ts` | projeto aprovado | `publications`, mídia publicada |
| Analyst | `analyst.ts` | Insights API | `publication_metrics`, `account_snapshots`, relatórios, recomendações |

### Anti-repetição
`allocateCalendar()` distribui pilares por peso, garantindo que nenhum pilar se repita no mesmo slot em dias consecutivos nem entre os slots do dia anterior. Depois dos temas gerados pelo Claude, `findConsecutiveRepeats()` mede similaridade (Jaccard) entre dias vizinhos e pede correção.

### Revisão automática de qualidade
- **Visual** (`quality/visual.ts`): formato (JPEG/H.264/AAC), proporção, resolução, tamanho, fps, duração, imagem vazia (entropia/desvio), nitidez (Laplaciano), contraste WCAG das cores da marca, estouro de texto nos templates.
- **Copy** (`quality/copy.ts`): legenda vazia, limite de 2.200 caracteres, ≤ 30 hashtags (padrão 15), duplicadas, genéricas, termos proibidos, clichês de texto artificial, excesso de emojis, CTA.
- Nota 0–100; qualquer item crítico reprova. Nota mínima configurável (padrão 80).

### Publicação idempotente
1. `publishGates()` — todas as travas (ver README).
2. Consulta `content_publishing_limit`.
3. Cria container(s) e guarda `container_id` **antes** de publicar.
4. Aguarda `status_code = FINISHED`, chama `media_publish`.
5. Em retentativa reaproveita o container; se o container já estiver `PUBLISHED` (resposta perdida), localiza a mídia em vez de publicar de novo.
6. Índice único parcial em `publications(content_hash)` impede duplicidade no nível do banco.

### Analyst e causalidade
Relatórios trazem `n` por grupo, desvio-padrão e nível de confiança (`insuficiente` < 5, `baixa` < 10, `moderada` ≥ 10). As recomendações são registradas como **hipóteses testáveis** e só influenciam o ranking de oportunidades quando há amostra mínima (n ≥ 3 por formato).

## Banco de dados

Modelos pedidos → tabelas: Users `users` · InstagramAccounts `instagram_accounts` · Agents `agents` · AgentExecutions `agent_executions` · Trends `trends` · ContentIdeas `content_ideas` · EditorialCalendar `editorial_calendar` · ContentProjects `content_projects` · MediaAssets `media_assets` · Captions `captions` · Publications `publications` · PublicationMetrics `publication_metrics` · DailyReports `daily_reports` · BrandSettings `brand_settings` · Integrations `integrations`.
Auxiliares: `sessions`, `jobs`, `agent_logs`, `settings`, `audit_logs`, `account_snapshots`, `hashtag_queries`, `schema_migrations`.

## Segurança

- Segredos apenas em variáveis de ambiente; tokens OAuth criptografados (AES-256-GCM).
- Senhas com scrypt; sessões com token aleatório armazenado como hash; cookie `HttpOnly` + `SameSite=Strict` (+ `Secure` em produção).
- Verificação de origem em mutações (CSRF), rate limit no login, cabeçalhos de segurança/CSP.
- Controle de acesso por papel; trilha de auditoria (`audit_logs`) para ações sensíveis.
- `state` do OAuth assinado com HMAC e conferido com cookie.
- Logs com remoção de tokens/senhas.
- Backup diário (`VACUUM INTO`) com retenção de 14 cópias.
- Botão de emergência + travas de produção em camadas.
