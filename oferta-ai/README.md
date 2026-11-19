# OFERTA AI

Plataforma multiagente que pesquisa ofertas na **Shopee Brasil**, seleciona as melhores, escreve a copy e publica em um canal autorizado — com meta de **30 ofertas por dia**, distribuídas ao longo de uma janela configurável.

> **Regra fundamental:** nenhuma conexão externa é simulada. Sem credenciais aprovadas, cada integração fica em estado *Não configurado* e o painel mostra exatamente o que falta. O **ambiente de testes** (`DATA_MODE=sandbox`) usa produtos **fictícios** (prefixo `[TESTE]`, links `example.com`) e publica apenas no canal `dry_run`, que não envia nada.

---

## Arquitetura

```
                ┌─────────────────────────── ORCHESTRATOR (BullMQ) ───────────────────────────┐
                │  scout-cycle (2h) · distributor-tick (1 min) · supply-check · recovery ·     │
                │  daily-close (23:55 America/Sao_Paulo) · STOP ALL · idempotência · retentativas│
                └──────────────────────────────────────────────────────────────────────────────┘
   Shopee Affiliate API            Claude API (opcional)              WhatsApp Cloud API / Telegram / Manual
          │                                │                                         ▲
   ┌──────▼──────┐  Validação   ┌──────────▼─────────┐  Validação final  ┌───────────┴──────────┐
   │  SCOUT AI   │──(nota ≥75)─▶│   COPYWRITER AI    │──(anti-invenção)─▶│    DISTRIBUTOR AI    │
   │ pesquisa,   │   filtros    │ título + descrição │                   │ agenda, limite, fila,│
   │ pontua 0–100│              │ dados reais fixos  │                   │ circuit breaker      │
   └─────────────┘              └────────────────────┘                   └──────────────────────┘
                     PostgreSQL (Prisma) · Redis · logs estruturados (pino)
```

Estados de cada produto (ID único `cuid`): `PENDING → RESEARCHING → APPROVED → COPY_GENERATED → READY_TO_PUBLISH → PUBLISHING → PUBLISHED`, com `FAILED` (erro técnico, retentável) e `REJECTED` (critério de qualidade). Toda transição é atômica e fica em `ProductStateHistory`.

| Camada | Tecnologia |
|---|---|
| Frontend | Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, Framer Motion, Recharts |
| Backend | Node.js 22, Express (REST), TypeScript, Prisma ORM, PostgreSQL 16, Redis 7, BullMQ |
| IA | Claude API (`@anthropic-ai/sdk`), saída estruturada JSON, fallback de modelos + template determinístico |
| Infra | Docker, Docker Compose, logs estruturados, healthchecks, backup automático |

### Estrutura de pastas

```
oferta-ai/
├── apps/
│   ├── api/                      # API REST + workers dos agentes
│   │   ├── prisma/               # schema.prisma, migrações, seed
│   │   ├── src/
│   │   │   ├── agents/
│   │   │   │   ├── scout/        # categorias, scoring (0–100), filtros, ciclo de pesquisa
│   │   │   │   ├── copywriter/   # prompt, montagem da mensagem, validador anti-invenção
│   │   │   │   └── distributor/  # agenda, canais, publicação, idempotência
│   │   │   ├── orchestrator/     # máquina de estados, filas BullMQ, STOP ALL
│   │   │   ├── integrations/     # shopee/, whatsapp/, telegram/, ai/, store (credenciais criptografadas)
│   │   │   ├── auth/             # JWT, perfis ADMIN/OPERATOR/VIEWER, auditoria
│   │   │   ├── lib/              # logger, prisma, redis, crypto, settings, métricas, circuit breaker, fuso
│   │   │   ├── routes/api.ts     # API REST
│   │   │   ├── server.ts         # processo HTTP
│   │   │   └── worker.ts         # processo dos agentes
│   │   └── test/                 # unitários + integração ponta a ponta
│   └── web/                      # dashboard (12 páginas)
├── docs/ATIVACAO.md              # o que falta para ativar cada integração real
├── scripts/                      # backup
├── docker-compose.yml
└── .env.example
```

---

## Agentes

### 01 · Scout AI
- Pesquisa via `productOfferV2` (GraphQL) por **15 categorias × palavras-chave**, com rotação persistida (não repete a mesma categoria em sequência) e alternância de ordenação (relevância / mais vendidos / menor preço) — não só os mais populares.
- Descoberta extra de palavras-chave por IA (opcional).
- **Pontuação 0–100:** preço vs. mediana de comparáveis (25) · avaliação (25) · vendas, escala log (20) · reputação da loja: Mall/Star+/Star/comum (15) · desconto comprovado (10) · comissão (5).
- **Desconto comprovado:** usa o histórico próprio de preços (mediana 30 dias, ≥5 registros); sem histórico, usa o desconto informado pela Shopee e registra a fonte.
- **Aprovação automática apenas com nota ≥ 75** (configurável).
- **Exclusões:** dados insuficientes, sem preço válido, oferta encerrada, duplicados (no ciclo e publicados nos últimos N dias), loja abaixo da reputação mínima, dados inconsistentes.
- Dado ausente = 0 ponto + registrado em `unavailableData`. Nada é presumido.
- Link de afiliado: `offerLink` da API ou `generateShortLink`.

### 02 · Copywriter AI
- A IA escreve **somente** o título e a descrição. Preços, avaliação, vendas e link são inseridos pelo sistema a partir dos dados reais. Linhas sem dado (ex.: "De:" sem desconto comprovado) são omitidas.
- Validador bloqueia: qualquer número no texto criativo, urgência falsa ("últimas unidades", "só hoje", "corra"…), claims não verificáveis ("mais vendido", "frete grátis"…), links, excesso de emojis e textos longos. Se a IA falhar duas vezes, usa template determinístico baseado em dados.
- Fallback de modelos: `claude-opus-5-5` (com fallback de recusa do lado do servidor) → `claude-sonnet-5-5` → `claude-haiku-5-5` → template.
- Todas as copies ficam salvas em `GeneratedCopy`, com modelo e erros de validação.

### 03 · Distributor AI
- Intervalo efetivo = `max(intervalo mínimo, janela ÷ meta)` → 08:00–22:00 com meta 30 = **1 oferta a cada 28 min**.
- Limite diário, horários permitidos (inclusive janelas que cruzam a meia-noite), prioridade por nota, no máximo N por categoria/dia e alternância de categoria.
- **Revalida preço/disponibilidade** antes de publicar; variação acima do limite volta para nova copy.
- Idempotência: chave única `produto:canal:dia`. Lock distribuído no Redis.
- Retentativas controladas e **circuit breaker** (falhas consecutivas, perda de conexão, permissão negada, inconsistência de preço) → pausa automática.
- Canais: `whatsapp_cloud` (Groups API), `telegram`, `manual` (envio pelo operador com um toque) e `dry_run` (testes).

### Orchestrator
Agenda os ciclos, distribui tarefas pelas filas, evita duplicidade (`taskKey` + `jobId`), recupera tarefas travadas, antecipa pesquisas quando o estoque de ofertas prontas não cobre a meta e fecha o dia registrando se a meta foi atingida. **Se houver menos de 30 ofertas qualificadas, publica apenas as disponíveis e registra "meta não atingida".**

---

## Sobre o grupo do WhatsApp

A WhatsApp Business Platform (oficial) **só envia mensagens para grupos criados pela própria Groups API**, e a Groups API exige que a empresa tenha status **Official Business Account (OBA)** (a verificação de empresa comum não basta), com número na Cloud API. Um grupo existente criado no app do WhatsApp — como o do link de convite `chat.whatsapp.com/...` — **não pode receber publicações automáticas por via oficial**, e a OFERTA AI não usa automação de WhatsApp Web.

Opções suportadas:
1. **Compartilhamento manual (padrão):** no horário programado a oferta aparece na *Central de publicações* com **Copiar mensagem** / **Abrir no WhatsApp** e **Confirmar envio**. Funciona com o grupo existente.
2. **Grupo novo pela Groups API:** com conta OBA, o painel cria o grupo e gera o link de convite. Os membros entram por esse link.
3. **Telegram (Bot API oficial):** canal ou grupo com publicação 100% automática.

Detalhes e checklist em [`docs/ATIVACAO.md`](docs/ATIVACAO.md).

---

## Instalação

### Requisitos
Node.js ≥ 20, PostgreSQL 16, Redis 7 — ou apenas Docker.

### Com Docker (produção)
```bash
cp .env.example .env
# preencha: POSTGRES_PASSWORD, JWT_SECRET (openssl rand -hex 32),
# ENCRYPTION_KEY (openssl rand -base64 32), ADMIN_EMAIL, ADMIN_PASSWORD
docker compose up -d --build
```
- Painel: http://localhost:3000 · API: http://localhost:4000/health
- Serviços: `postgres`, `redis`, `api` (aplica migrações ao iniciar), `worker` (agentes), `web`, `backup` (pg_dump diário, retenção 14 dias em `./backups`).
- Em produção, coloque um proxy HTTPS (Caddy, Nginx, Traefik) na frente de `web` e, se usar rastreamento de cliques, de `api` (`PUBLIC_BASE_URL`).

### Desenvolvimento local
```bash
npm install
cp .env.example apps/api/.env      # ajuste DATABASE_URL/REDIS_URL e segredos
cd apps/api && npx prisma migrate deploy && cd ../..
npm run dev:api      # API em :4000
npm run dev:worker   # agentes
API_URL=http://localhost:4000 npm run dev:web   # painel em :3000
```

### Testes
```bash
createdb oferta_ai_test   # banco dedicado (o nome precisa terminar em _test)
npm test                  # 45 testes: unitários + integração ponta a ponta (Postgres + Redis reais, sandbox)
```
Os testes cobrem pontuação, filtros, rotação, mensagem e validador, agenda, assinatura da Shopee, criptografia, máquina de estados, pipeline completo Scout → Copywriter → Distributor, idempotência, circuit breaker, STOP ALL, fechamento do dia, autenticação, não-exposição de segredos, bloqueio da publicação automática e rastreamento de cliques. Nenhuma mensagem real é enviada.

---

## Segurança e controle
- Login administrativo com bcrypt + JWT; o token fica em **cookie httpOnly** e o painel acessa a API por um proxy no servidor — **nenhum token vai para o navegador**.
- Perfis `ADMIN` / `OPERATOR` / `VIEWER`; auditoria de todas as ações (`AuditLog`).
- Credenciais salvas pelo painel são criptografadas com **AES-256-GCM** e só retornam mascaradas (`••••abcd`).
- Rate limiting (login e API), Helmet, CORS restrito, validação de entrada (zod).
- **STOP ALL** pausa as filas e bloqueia qualquer agente imediatamente; **circuit breaker** suspende a publicação após falhas consecutivas.
- Publicação automática só pode ser ligada com `DATA_MODE=live`, Shopee verificada, canal verificado e consentimento confirmado.

## Analytics
Pesquisados, publicados, categorias, desempenho dos agentes, **cliques** (redirecionador próprio `/r/:code`, se `PUBLIC_BASE_URL` estiver definida), **comissão estimada** (preço × taxa, rotulada como estimativa) e **comissão reportada** (importada do relatório oficial de conversões da Shopee). Cliques não são tratados como vendas, e conversões só aparecem com dados oficiais.

## API REST (resumo)
`POST /api/auth/login` · `GET /api/dashboard` · `GET /api/agents` · `POST /api/agents/{scout|copywriter}/run` · `POST /api/agents/distributor/tick` · `GET /api/products` · `GET /api/products/:id` · `POST /api/products/:id/{reject|retry|regenerate-copy}` · `GET /api/publications` · `POST /api/publications/:id/{confirm|cancel}` · `GET /api/history` · `GET /api/analytics` · `POST /api/analytics/sync-commissions` · `GET|PUT /api/settings` · `POST /api/settings/auto-publish` · `GET /api/integrations` · `PUT /api/integrations/:provider` · `POST /api/integrations/:provider/{verify|consent}` · `POST /api/integrations/WHATSAPP_CLOUD/create-group` · `GET /api/logs` · `POST /api/system/{stop-all|resume|pause-publishing|circuit-breaker/reset}` · `GET /health` · `GET /r/:code`
