# Relatório de testes — MAILBOT AI

Data: 19/11/2026 · Branch: `claude/eager-archimedes-dedprd` · Produção: https://mailbot-ai-chagas7.vercel.app

## 1. Testes automatizados (`npm test`) — 58/58 passaram

| Suíte | O que cobre | Resultado |
|---|---|---|
| `crypto.test.ts` | AES-256-GCM dos tokens (cifra/decifra, IV aleatório, adulteração, chave errada/curta), PKCE S256 (vetor da RFC 7636), comparação em tempo constante | 5/5 |
| `gmail.test.ts` | OAuth só com `gmail.readonly` + offline + PKCE; erro `invalid_grant`; parser (remetente, texto, HTML sem script/estilo, `List-Unsubscribe`); cliente Gmail: renovação em 401, reautorização, 429 com `Retry-After`, 5xx esgotando tentativas, mensagem apagada no meio | 11/11 |
| `sync.test.ts` | Sincronização inicial paginada e retomável (230 msgs em 3 rodadas); incremental (novas, apagadas, rótulos, lixeira) sem duplicar; `historyId` expirado → ressincronização completa; autorização revogada → `reauth_required`; conteúdo alterado volta para a triagem | 5/5 |
| `agents.test.ts` | Orquestrador (11 perguntas → agente certo); **Triagem**: regras sem IA, enviados ignorados, lote para a IA, isolamento entre usuários, processamento incremental, cache por conteúdo, prompt injection neutralizado, refs inventados descartados, orçamento diário, sem IA não simula; **Resumo**: agregação a partir da triagem, reaproveitamento enquanto não chega e-mail novo, semanal reaproveita os diários; **Chat**: respostas por SQL sem IA com referências, "aguardando resposta" exclui conversas respondidas, sem resultado não chama IA, pergunta aberta com contexto reduzido e citações validadas, filtros de remetente/data | 30/30 |
| `llm.test.ts` | Provedor de IA: Vercel AI Gateway (ID `anthropic/claude-haiku-5.5`) e API direta; registro de tokens/custo; JSON inválido, recusa e truncamento tratados; orçamento esgotado não chama a IA; IA não configurada | 7/7 |

## 1b. Versão Floot (`npm run test:floot`): 31/31 passaram
Mesma lógica publicada no Floot, com banco, Gmail e IA simulados:
- **Orquestrador**: 11 perguntas encaminhadas ao agente certo.
- **Regras de triagem**: mensagens enviadas são puladas; remetentes ignorados e promoções em massa resolvidos sem IA; VIP nunca descartado; sinais do Gmail usados.
- **Parser**: conteúdo processado só em memória; o hash do remetente não revela o endereço; HTML sem scripts.
- **Proteção contra prompt injection**: os delimitadores do prompt não podem ser fechados nem imitados pelo texto do e-mail.
- **MAIL TRIAGE**: regras, depois IA em lote; grava só campos estruturados, sem nenhum texto do e-mail; refs inventados pela IA são descartados; cache funciona; mensagens já em memória não são buscadas de novo; com o orçamento esgotado os e-mails continuam pendentes; com a conta desconectada nada é feito.
- **MAIL CHAT**: perguntas estruturadas respondidas sem IA, com referências; sem resultado não chama a IA; perguntas abertas com contexto reduzido e só citações válidas; busca por remetente e período convertida em consulta do Gmail.

## 1c. Integração no Floot (API real do app): 17/17 passaram
Script `floot/tests/integration.vm.mjs`, executado no ambiente do Floot contra a API do app (banco real do Floot):
- 401 sem login em `status`, `usage`, `chat`, `sync`, `emails` e na sonda de IA.
- Cadastro de 2 usuários com e-mail e senha; e-mail repetido (maiúsculas) recusado com 409.
- Isolamento: cada usuário vê só o próprio nome e contadores; o usuário B recebe 404 ao tentar usar a conversa do usuário A.
- Chat determinístico: "Quais e-mails estão aguardando resposta?" respondido por consulta, sem IA (`usedAi: false`).
- **IA real do Floot**: `gpt-6-luna` respondeu "ok" em 945 ms; consumo (1 crédito) registrado só para o usuário A.
- Logout invalida a sessão (401 depois).

Produção (https://mailbot-ai.floot.app): `/` e `/login` 200; APIs sem login 401; sonda de desenvolvimento 404 (não vai para produção). Login conferido em iPhone 15 e desktop.

## 2. Banco de dados e isolamento (`npm run test:rls`) — passou
Postgres 16 temporário + migration + stub do Supabase Auth: cada usuário só lê os próprios dados; busca textual não vaza; tokens, cache e rate limit inacessíveis ao cliente; escrita direta bloqueada; anônimo não vê nada; `service_role` acessa o rate limit; exclusão em cascata.

## 3. Build e tipos
`npm run typecheck` e `npm run build` sem erros (Next.js 16.4.6).

## 4. Produção (Vercel)
| Verificação | Resultado |
|---|---|
| Build na Vercel (clone do repositório + `npm ci` + `next build`) | ✅ READY |
| `GET /api/health` | ✅ 200 — criptografia e agendador configurados; IA via AI Gateway |
| `GET /login` | ✅ 200 — mostra "Instalação em andamento" enquanto o banco não está conectado |
| Telas internas sem login | ✅ redirecionam para `/login` |
| `GET /api/gmail/connect` sem login/banco | ✅ recusado (503), não inicia OAuth |
| `GET /api/cron` sem segredo | ✅ 401 |
| Cabeçalhos HSTS, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy` | ✅ |
| Chamada real à IA (sonda `/api/health?probe=…`) | ⚠️ token OIDC aceito e requisição chegou à Vercel AI Gateway; o gateway respondeu 403 `customer_verification_required` (exige cartão no time) |

## 5. Pendências que dependem de autorização externa
Ver a lista objetiva no README (seção "Dependências externas"): banco Supabase exclusivo (limite de projetos gratuitos), cliente OAuth do Google e cartão na AI Gateway.

## 6. Não executado (depende das pendências acima)
Login real, conexão Gmail real, sincronização com caixa real e respostas da IA em produção. Esses fluxos estão cobertos pelos testes automatizados com Gmail e IA simulados (seção 1) e serão verificados em produção assim que as pendências forem resolvidas.
