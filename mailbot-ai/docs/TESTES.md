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
| Chamada real à IA (sonda `/api/health?probe=…`) | ver seção 5 |

## 5. Pendências que dependem de autorização externa
Ver a lista objetiva no README (seção "Dependências externas").
