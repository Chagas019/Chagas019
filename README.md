# Chagas019 — projetos

Repositório com cinco projetos independentes. Cada pasta tem seu próprio README com detalhes.

| Projeto | Pasta | O que é | Stack | Testes |
|---|---|---|---|---|
| **Comunica+Fé** | raiz (`site/`, `index.html`) | Site da Pastoral da Comunicação: liturgia do dia, escala das missas, agenda, frase do dia | HTML/JS estático, sem dependências | `node tests/e2e.js` (Playwright) |
| **OFERTA AI** | [`oferta-ai/`](oferta-ai/README.md) | Multiagente que garimpa ofertas da Shopee e publica no WhatsApp/Telegram | Next.js 15 + Fastify + Prisma/PostgreSQL + Redis | `npm test` |
| **SOCIAL AI** | [`social-ai/`](social-ai/README.md) | Agência autônoma para Instagram (perfil católico pronto) | TypeScript + SQLite + React (Vite) + ffmpeg | `npm test` |
| **Virtual Office AI** | [`virtual-office-ai/`](virtual-office-ai/README.md) | Agência de marketing com 31 funcionários de IA | Node 22 (SQLite nativo) + SDK Anthropic | `npm test` |
| **Brabo Club** | `brabo-club/` | Site de barbearia com agendamento e painel do dono | HTML estático + funções serverless (Vercel) | workflow `conferir-brabo.yml` |

Requisitos gerais: **Node 22.13+**, `bash`, `python3`. Os testes de navegador usam Playwright com Chromium.

## Comunica+Fé (site)

- Edite **só `site/pagina.html`** (fonte única). Depois:

```bash
bash scripts/montar-site.sh       # gera index.html (+ robots.txt/sitemap.xml se SITE_URL estiver definida)
bash scripts/verificar-site.sh    # precisa terminar com "Tudo certo."
NODE_PATH=$(npm root -g) node tests/e2e.js   # 288 verificações de ponta a ponta
```

- Para ver localmente: `python3 -m http.server 8000` e abra http://localhost:8000.
- Publicação: GitHub → Actions → **Publicar site** → *Run workflow* (GitHub Pages com fonte "GitHub Actions").
- Variável opcional `SITE_URL` (Settings → Secrets and variables → Actions → Variables).
- Liturgia diária: skill `.claude/skills/liturgia-do-dia`.

## OFERTA AI

```bash
cd oferta-ai
cp .env.example .env
docker compose up -d              # PostgreSQL + Redis + API + worker + painel
# ou, sem Docker: npm ci && npm run dev:api / dev:worker / dev:web
npm run typecheck && npm test && npm run build
```

Deploy serverless (Vercel + Supabase): [`oferta-ai/deploy/vercel/README.md`](oferta-ai/deploy/vercel/README.md).

## SOCIAL AI

```bash
cd social-ai
npm ci
npm run db:migrate && npm run admin:create
npm run dev          # API   ·   npm run dev:web  → painel
npm run typecheck && npm test && npm run build
```

Deploy em um clique no Render (`render.yaml` na raiz). Guia: [`social-ai/docs/COLOCAR-NO-AR.md`](social-ai/docs/COLOCAR-NO-AR.md).

## Virtual Office AI

```bash
cd virtual-office-ai
npm install && npm run setup     # cria banco e OWNER_TOKEN no .env
npm start                         # http://localhost:3210
npm test
```

## Brabo Club

Site estático em `brabo-club/index.html`, API em `brabo-club/api/` (funções Vercel) e painel do dono em `/dono`. Publicado pela Vercel a partir da pasta `brabo-club/`.

## Integração contínua

| Workflow | Quando roda | O que faz |
|---|---|---|
| `oferta-ai.yml` | push/PR em `oferta-ai/` | typecheck, testes (Postgres + Redis), build |
| `social-ai.yml` | push/PR em `social-ai/` | typecheck, testes, build, imagem Docker + health check |
| `publicar-site.yml` | manual | verifica, publica o Comunica+Fé no Pages e confere no ar |
| `conferir-brabo.yml` | agendado/manual | confere páginas e API do Brabo Club no ar |

## Credenciais externas (nunca no código)

| Projeto | Variáveis necessárias para uso real |
|---|---|
| OFERTA AI | `SHOPEE_APP_ID`/`SHOPEE_APP_SECRET` (Afiliados), `WHATSAPP_TOKEN`/`WHATSAPP_PHONE_NUMBER_ID` ou `TELEGRAM_BOT_TOKEN`/`TELEGRAM_CHAT_ID`, `ANTHROPIC_API_KEY` (opcional) |
| SOCIAL AI | `ANTHROPIC_API_KEY`, `META_APP_ID`/`META_APP_SECRET` (ou `IG_ACCESS_TOKEN`/`IG_USER_ID`), `IMAGE_GEN_API_KEY` (opcional) |
| Virtual Office AI | `ANTHROPIC_API_KEY` |
| Brabo Club | `ADMIN_KEY` (painel do dono) e `BLOB_READ_WRITE_TOKEN` (Vercel Blob, criado ao ligar o Blob no projeto) |

Sem essas chaves os sistemas rodam em modo de teste/não configurado e mostram no painel o que falta — nada é simulado como se fosse real.
