# SOCIAL AI — Agência digital autônoma para Instagram

Sistema multiagente que **pesquisa, planeja, cria, edita, agenda, publica e analisa** conteúdos de um perfil do Instagram todos os dias, e melhora a estratégia com base nos resultados reais.

- **6 agentes** com identidade, instruções, ferramentas autorizadas, memória operacional, histórico, status, logs e tratamento de erros
- **Orquestrador central** com fila persistente (uma tarefa por agente por vez, deduplicação, retentativas com backoff)
- **Publicação somente pela Instagram Graph API oficial**, com travas de segurança e botão de emergência
- **Painel** dark premium com 12 páginas (React)
- Português brasileiro, operação 7 dias por semana, tudo configurável

> **Nada é simulado.** Sem as chaves reais, os agentes falham de forma explícita e registram o motivo. A publicação real exige três travas independentes (veja [Ativar produção](#ativar-a-publicação-automática)).

---

## Arquitetura

```
             ┌────────────── Orquestrador (scheduler + fila SQLite) ──────────────┐
 06:00       │  07:00          08:00         09:00          10:00      janela    │  noite
Trend Scout ─┼► (análise) ──► Strategist ──► Copywriter ──► Creative ──► Publisher ┼► Analyst
   ▲         │                    ▲                          Studio + QA            │    │
   │         └────────────────────┼─────────────────────────────────────────────────┘    │
   │                              └──────────── recomendações (memória) ─────────────────┘
Graph API (hashtag search, business discovery, mídia própria) + pesquisa web pública (Claude)
```

| Agente | Faz | Ferramentas |
|---|---|---|
| **Trend Scout** | Pesquisa tendências (padrões de gancho, estrutura, duração, estilo, CTA), ranqueia oportunidades | Graph API (Hashtag Search, Business Discovery, mídia própria), pesquisa web do Claude |
| **Strategist** | Calendário de 30 dias + pauta diária (tema, objetivo, formato, público, gancho, CTA, horário, justificativa) | Banco, recomendações do Analyst, Claude |
| **Copywriter** | Ganchos, roteiros de Reels, legendas, CTAs, hashtags, carrosséis, stories | Claude + revisor de copy (clichês, regras, limites) |
| **Creative Studio** | Artes de feed, carrosséis, capas, stories e Reels (vídeo) com a identidade visual | Templates SVG + sharp, FFmpeg, geração de imagem (opcional), QA visual |
| **Publisher** | Agenda e publica (imagem, carrossel, Reels, Stories) com idempotência e retentativas | Content Publishing API |
| **Analyst** | Coleta métricas, relatórios diário/semanal, top 5, desempenho por formato/pilar | Insights API, Claude |

Detalhes em [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

### Stack

Node.js 22 + TypeScript · Fastify · SQLite nativo (`node:sqlite`, WAL) · Claude API (`@anthropic-ai/sdk`, saída estruturada + web search) · sharp (render SVG→JPEG) · FFmpeg · React + Vite · Vitest.

### Estrutura

```
social-ai/
├─ src/
│  ├─ agents/          # 6 agentes + calendário + base (execuções, memória, logs)
│  ├─ orchestrator/    # fila, worker, scheduler (rotina diária), handlers
│  ├─ integrations/    # instagram (graph, oauth, nicho), llm (Claude), media (ffmpeg), imagegen
│  ├─ creative/        # identidade visual e templates
│  ├─ quality/         # revisão automática visual e de copy
│  ├─ api/             # servidor Fastify + rotas do painel
│  ├─ security/        # criptografia, senhas, sessões, papéis
│  ├─ db/              # migrações, acesso, configurações
│  └─ cli/             # migrate, seed (demo), create-admin, backup, preview
├─ web/                # painel React (12 páginas)
├─ tests/              # unitários, pipeline completo e API (dados fictícios)
└─ docs/
```

---

## Instalação (desenvolvimento)

Pré-requisitos: Node.js ≥ 22.13, FFmpeg no PATH.

```bash
cd social-ai
npm install
cp .env.example .env          # ajuste NODE_ENV=development
npm run db:seed               # OPCIONAL: dados fictícios [DEMO] para ver o painel
npm run build:web             # compila o painel (servido pela API)
npm run dev                   # API + worker + scheduler em http://localhost:8080
npm run dev:web               # (opcional) painel com hot reload em http://localhost:5173
```

O seed cria `admin@demo.local / demo-senha-segura`. Em ambiente real use `ADMIN_EMAIL`/`ADMIN_PASSWORD` ou `npm run admin:create -- email senha admin`.

### Testes

```bash
npm test          # 27 testes: segurança, fila, calendário, copy, pipeline completo (render real + FFmpeg), API, OAuth
npm run typecheck
```

Os testes usam **dados fictícios** e substituem apenas nos testes o cliente HTTP da Graph API e o LLM. Nenhum teste fala com o Instagram.

---

## Conectar as APIs

### 1. Claude (obrigatório para os agentes)
Defina `ANTHROPIC_API_KEY`. Modelo padrão `claude-opus-5-5` com raciocínio adaptativo, saída JSON estruturada e fallback automático do servidor em caso de recusa.

### 2. Instagram (Meta)
1. Conta Instagram **profissional** (Business ou Creator) vinculada a uma **Página do Facebook**.
2. Crie um app em developers.facebook.com, adicione o produto *Instagram* (API com Login do Facebook).
3. Permissões: `instagram_basic`, `instagram_content_publish`, `instagram_manage_insights`, `pages_show_list` (+ `pages_read_engagement`, `business_management`). Para **Hashtag Search** solicite o recurso *Instagram Public Content Access* (revisão do app).
4. Configure `META_APP_ID`, `META_APP_SECRET` e `META_REDIRECT_URI` (`https://SEU_DOMINIO/api/instagram/oauth/callback`).
5. No painel: **Integrações → Conectar com Facebook → Verificar conta → Confirmar permissões → Analisar perfil → Confirmar nicho**.

O token de longa duração é guardado **criptografado** (AES-256-GCM) com `ENCRYPTION_KEY`.

### 3. URL pública de mídia
A Graph API baixa imagens e vídeos por **URL HTTPS pública**. O servidor expõe `/media/public/<nome-aleatório>` (144 bits, sem listagem). Defina `PUBLIC_BASE_URL`.

### 4. Geração de imagens (opcional)
`IMAGE_GEN_PROVIDER=openai` + `IMAGE_GEN_API_KEY`. Sem isso, as artes usam composição tipográfica da marca — nunca imagens aleatórias.

---

## Ativar a publicação automática

Publicar exige **todas** as condições:

1. `ALLOW_PUBLISHING=true` no servidor (trava de infraestrutura);
2. Conta conectada, elegibilidade verificada, **permissões confirmadas** e **nicho confirmado**;
3. `PUBLIC_BASE_URL` HTTPS;
4. **Modo de produção** ligado no painel digitando `ATIVAR PRODUÇÃO`.

Mesmo assim cada publicação passa pelas travas: arquivo íntegro (hash), legenda não vazia, requisitos da mídia, duplicidade (índice único no banco), regras configuradas, limite de 24h da API, pausa de emergência e janela de horário. Se algo falhar, a publicação fica **bloqueada com o motivo** visível em *Agendamento*.

Por padrão, a **aprovação humana** está ligada: o Creative Studio entrega para revisão e você aprova (e agenda) na Central de criação. Pode ser desligada em Configurações.

**Botão de emergência:** no Dashboard, pausa todas as publicações e cancela as tarefas pendentes do Publisher.

---

## Rotina diária (padrão, configurável)

| Horário | Etapa |
|---|---|
| 06:00 | Pesquisar tendências |
| 07:00 | Analisar referências e oportunidades |
| 08:00 | Criar estratégia editorial do dia |
| 09:00 | Gerar roteiros, copies e conteúdos |
| 10:00 | Renderizar e validar mídias |
| janela 08:00–22:30 | Publicar (Feed 12:00, Reel 18:30, Stories 11:00/13:30/17:00/20:00/21:30) |
| 22:00 | Coletar métricas e atualizar relatórios (semanal aos domingos) |
| 03:00 | Backup do banco |

Cada etapa só roda depois que a anterior terminar. Falhas são repetidas com backoff (2, 10, 30 min) e registradas.

---

## Limitações oficiais e alternativas

Veja [docs/LIMITATIONS.md](docs/LIMITATIONS.md) — resumo: stickers interativos de Stories, músicas da biblioteca do Instagram, métricas de salvamento de terceiros e trending audio **não** estão disponíveis pela API; o sistema documenta e aplica alternativas seguras.

## Deploy

Docker / docker-compose, variáveis, HTTPS, backups e escala: [docs/DEPLOY.md](docs/DEPLOY.md).
