# TOKEN_BUDGET — JARVIS v2

Registro central de consumo de IA (desenvolvimento + produto). Atualizado pelo PROJECT MANAGER.

## 1. Limites reais verificados (2026-11-20)

| Fonte | O que foi possível ler | Limite |
|---|---|---|
| Assinatura Claude Code (desenvolvimento) | Nenhuma API de saldo/cota exposta nesta sessão | **Desconhecido** — não inventado |
| Vercel (conta `hh3356577-8257`) | Plano **hobby**, 1 build concorrente | Uso do AI Gateway exige key própria (não configurada) |
| Supabase | 1 projeto ativo (`paroquia360`, sa-east-1) — de outro produto | JARVIS deve usar projeto próprio |
| Anthropic / OpenAI / Gemini / DeepSeek (produto) | Nenhuma credencial configurada no repositório | Fallback só para provedores com key |

Como não há leitura de cota real da sessão, o orçamento de desenvolvimento abaixo é **operacional**
(contado em agentes e chamadas), não em dólares.

## 2. Orçamento operacional da sessão de desenvolvimento

| Recurso | Orçamento | Usado | % |
|---|---|---|---|
| Agentes de implementação simultâneos | 3 | 3 (pico) | — |
| Agentes totais na sessão | 6 | 6 | **100%** |
| Pesquisas web | 4 | 0 | 0% |
| Consultas de catálogo de modelos | 2 | 1 | 50% |

Gatilhos: **70%** → cortar tarefas auxiliares (pesquisa, docs extras) · **85%** → só tarefas do caminho
crítico (build/teste/integração) · **100%** → nenhuma chamada nova não essencial; commitar e reportar.

## 3. Modelos por papel (desenvolvimento)

| Agente | Modelo | Motivo |
|---|---|---|
| 01 Project Manager | sessão principal | arquitetura, integração, revisão |
| 02 iOS / 03 Backend / 04 AI | sonnet | implementação com contrato fechado |
| 05 Integrations / 06 QA-Security | sonnet | implementação/revisão |
| 07 Researcher | haiku | pesquisa e classificação (barato) |

## 4. Preços do catálogo Vercel AI Gateway (lidos em 2026-11-20, USD por 1M tokens)

| Modelo | Entrada | Saída | Cache read | Contexto |
|---|---|---|---|---|
| anthropic/claude-opus-5.5 | 4.00 | 20.00 | 0.20 | 1M |
| anthropic/claude-sonnet-5.5 | 2.00 | 10.00 | 0.10 | 1M |
| anthropic/claude-haiku-5.5 | 0.10 (≤100k) | 0.50 (≤100k) | 0.01 | 1M |

OpenAI, Gemini e DeepSeek: **não consultados** (economia). Preços ficam em `MODEL_PRICES_JSON`
(env) e devem ser preenchidos a partir do catálogo antes de habilitar o provedor; sem preço → custo
registrado como 0 e alerta no log.

## 5. Orçamento do produto (runtime)
- `AI_DAILY_BUDGET_USD` por usuário (padrão 1.00). Ledger em `usage_records`; `GET /v1/usage`.
- 70% → roteador força modelo econômico; 85% → só modo `fast`; 100% → 429 `budget_exceeded`.

## 6. Log de execução

| Hora (UTC) | Agente | Tarefa | Chamadas | Resultado |
|---|---|---|---|---|
| 11:10 | PM | Auditoria de ambiente + catálogo Claude | 7 MCP | ok |
| 11:12 | 03 Backend (sonnet) | T02 servidor/repos/migration | ~135k tokens | 34 testes ok |
| 11:12 | 04 AI (sonnet) | T03 provedores/roteador/orquestrador | ~135k tokens | 20 testes ok |
| 11:12 | 02 iOS (sonnet) | T04 app SwiftUI | em andamento | — |
| 11:16 | 05 Integrations (sonnet) | T05 Google | ~130k tokens | 17 testes ok |
| 11:16 | 06 QA (sonnet) | T07 e2e + revisão | ~169k tokens | 29 e2e + 9 achados |
| 11:21 | 03 Backend (sonnet) | T09 correções F-01..F-11 | em andamento | — |

**Alerta 85%/100%** (11:21): orçamento de agentes esgotado — nenhuma pesquisa ou agente auxiliar novo nesta sessão; restante feito pelo PM só no caminho crítico (integração, CI, testes).
Pesquisador (07) não acionado: catálogo de modelos obtido por ferramenta determinística (Vercel MCP).
