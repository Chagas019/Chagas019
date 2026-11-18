# MCP — ambiente de desenvolvimento do Paróquia360

Atualizado em 18/11/2026. Regra geral: **o mínimo de conectores, com o mínimo de permissão**. Nada de deploy ou SQL destrutivo sem autorização explícita do responsável.

## Onde cada conector é configurado

| Escopo | Onde | Quem vê |
|---|---|---|
| Projeto | `/.mcp.json` na raiz do repositório (versionado, **sem segredos**) | qualquer sessão deste repositório |
| Conta | conectores da conta em claude.ai → Settings → Connectors (OAuth) | todas as sessões da conta |

## Inventário

| Conector | Escopo | Autenticação | Estado | Uso no projeto |
|---|---|---|---|---|
| GitHub | conta | OAuth (GitHub App) | ✅ ativo, limitado a `Chagas019/Chagas019` | PRs, revisões |
| Supabase | conta | OAuth | ✅ ativo | banco `paroquia360` (ref `gyhnmnzaxrlamvptczek`) |
| **Context7** | **projeto (`.mcp.json`)** | nenhuma (nível gratuito) | ✅ ativo e testado | documentação atual de bibliotecas |
| Playwright | — (biblioteca local, sem MCP) | — | ✅ disponível | testes ponta a ponta (`app/e2e/`) |
| Sentry | conta | OAuth | conectado; **sem projeto criado** | aguarda autorização |
| Figma | conta | OAuth | conectado | só quando houver arquivo de design |
| Vercel | conta | OAuth | conectado | não usado (site hospedado no Floot) |
| Linear | conta | OAuth | ⚠️ falha: proxy de rede bloqueia | não usado (tarefas em `AGENT_TASKS.md`) |
| Stripe | — | — | não instalado | sem cobrança no MVP |
| Chrome DevTools | — | — | não instalado | redundante com Playwright |

## Context7 (instalado em 18/11)

`/.mcp.json`:
```json
{ "mcpServers": { "context7": { "type": "http", "url": "https://mcp.context7.com/mcp" } } }
```
- Permissão: somente leitura de documentação pública; nenhum dado do projeto é enviado além do texto da consulta (não colocar dados pessoais nas consultas).
- Sem chave: usa o nível gratuito com limite de requisições. Se o limite incomodar, criar chave gratuita em context7.com/dashboard e salvá-la como **segredo de rede do ambiente** (header `CONTEXT7_API_KEY`), nunca no `.mcp.json`.
- Rede: `mcp.context7.com` foi liberado no ambiente de nuvem "Chagas019".
- Teste (18/11): `initialize` → 200 (Context7 4.7.3); `tools/list` → `resolve-library-id`, `query-docs`; consulta "supabase / row level security" retornou `/supabase/supabase`.

## Regras de uso

**Supabase**
- Mudança de schema só por arquivo em `supabase/migrations/`, testado com `supabase/tests/run.sh`, aplicado com confirmação.
- Nunca `DELETE`/`DROP`/`TRUNCATE` em dados reais sem pedido explícito; o conector pede confirmação nesses casos.
- Recomendado (no claude.ai, ferramentas do conector): desligar `create_project`, `pause_project`, `create_branch`, `merge_branch`, `reset_branch`, `delete_branch`, `deploy_edge_function`, que não usamos.

**GitHub**: commits só na branch de trabalho; PR em rascunho; nada de merge sem pedido.

**Deploy (Floot/Vercel)**: só com autorização expressa.

**Segredos**: nenhum token no repositório. A chave publicável do Supabase é pública por natureza (o acesso é controlado pelo RLS) e pode ficar no código do front.

## Pendências (aguardam autorização)

1. Sentry: criar projeto `paroquia360` (plano Developer, gratuito) e SDK só de erros no app, sem replay.
2. Linear: liberar `mcp.linear.app` na rede se o time quiser usar.
3. Desligar no claude.ai os conectores sem relação com o projeto (ElevenLabs, Etherscan, Spotify, Motion, Framer etc.) para reduzir ruído.
