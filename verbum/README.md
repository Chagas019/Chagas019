# VERBUM: plataforma para pregadores católicos

> *Prepare a mensagem. Anuncie a Palavra.*

O VERBUM reúne num só ambiente o que um pregador católico precisa para preparar pregações, estudos bíblicos, encontros, retiros, grupos de oração e formações:

- Bíblia
- Catecismo
- Documentos da Igreja
- Músicas
- Santos
- Calendário litúrgico
- Um assistente de IA que monta o roteiro com fontes verificáveis

**Público:** pregadores, missionários, coordenadores de grupos de oração, servos de comunidades, catequistas, líderes de movimentos e seminaristas.

## Módulos

| Módulo | Rota | O que faz |
|---|---|---|
| Landing | `/` | Apresentação, liturgia do dia e compromissos de confiabilidade |
| Início | `/painel` | Busca global, liturgia do dia, temas do tempo litúrgico, pregações e pesquisas recentes |
| Central de pesquisa | `/pesquisa` | Busca em perícopes, Catecismo, documentos, músicas, pregadores, santos e temas. Tem filtros por categoria, ordenação, histórico e reconhecimento de referências bíblicas (`Lc 15,11-32`) |
| Músicas | `/musicas` | 71 faixas católicas conferidas no Spotify, com filtro por 13 temas e momento. Cada uma traz justificativa, link para o Spotify e busca no YouTube |
| Pregações | `/pregacoes` | Busca de vídeos por assunto, pregador, palavra-chave e duração (YouTube Data API), mais pregadores de referência e portais de formação |
| Biblioteca teológica | `/biblioteca` | 50 documentos oficiais com links conferidos, os 73 livros da Bíblia, índice temático do Catecismo, Padres e Doutores da Igreja |
| Assistente | `/assistente` | “Preparar minha pregação”: roteiro editável com as 12 seções pedidas, que pode ser salvo, copiado e exportado em PDF |
| Explorar | `/explorar` | Calendário litúrgico mensal, santos do dia, próximas celebrações, temas, leituras, músicas e formação |
| Meu Espaço | `/meu-espaco` | Pastas, itens salvos, anotações, projetos de encontros e retiros, e histórico de pesquisas |
| Configurações | `/configuracoes` | Perfil, plano e uso da IA, estado das integrações e exportação dos dados |
| Entrar | `/entrar` | Login, cadastro e recuperação de senha (Supabase Auth) |

## Princípios de confiabilidade (implementados, não só declarados)

1. **Nada é inventado.** O catálogo foi verificado antes de entrar no código (`src/data/verified/`):
   - Documentos: cada URL foi conferida em resultado de busca em vatican.va, cnbb.org.br ou celam.org.
   - Músicas: título, artista e link foram copiados de resultados do Spotify.
   - Vídeos: só aparecem quando a API do YouTube os devolve.
2. **A IA é verificada depois de responder** (`src/lib/ai/verify.ts`):
   - Referências bíblicas são checadas contra o cânon de 73 livros e o número de capítulos de cada um.
   - Parágrafos do Catecismo são checados contra a faixa §§ 1–2865 e o índice temático.
   - Santos são checados contra o calendário litúrgico.
   - Documentos e músicas fora do catálogo são **removidos**, com um aviso ao usuário.
   - Cada item aparece como “verificada” ou “não verificada”.
3. **A IA trabalha com recuperação (RAG).** O prompt recebe apenas o contexto recuperado do catálogo e só pode citar documentos e músicas pelos ids desse contexto. Ela não faz citações literais de santos e documentos, e não reproduz letras nem trechos bíblicos longos.
4. **Texto da IA e fonte ficam separados.** No roteiro, as seções escritas pela IA trazem o selo “texto gerado · editável”. As fontes aparecem com o selo de verificação e o link oficial.
5. **Pregação não é homilia.** O assistente, a interface e o PDF lembram que a homilia na Santa Missa é reservada ao ministro ordenado (CIC cân. 767 §1; *Redemptionis Sacramentum* 64-66).
6. **Integração ausente significa aviso claro e alternativa que funciona.**

   | Sem a integração | O que o VERBUM faz |
   |---|---|
   | IA | Gera um roteiro-base só com o catálogo |
   | YouTube | Mostra um link de busca direta |
   | Supabase | Salva no navegador |

## Arquitetura

```
verbum/
├─ src/app/                 Next.js 15 (App Router)
│  ├─ page.tsx              landing
│  ├─ (app)/…               páginas da plataforma (layout com navegação)
│  ├─ entrar/, auth/callback  autenticação Supabase
│  └─ api/                  search · videos · assistant · status
├─ src/lib/
│  ├─ search.ts             motor de busca por provedores (catálogo local + YouTube)
│  ├─ liturgy.ts            calendário litúrgico (Brasil) calculado
│  ├─ ai/                   schema (zod), prompt (RAG), assistant (Claude), verify, template, format
│  ├─ store/                Meu Espaço: interface única → Supabase (nuvem) ou localStorage
│  ├─ supabase/             clientes browser/servidor (+ src/middleware.ts renova a sessão)
│  └─ env.ts                variáveis secretas — `import "server-only"`
├─ src/data/                catálogo (temas, perícopes, Catecismo, santos, pregadores, verified/*.json)
├─ supabase/migrations/     esquema + RLS + função de limite de IA
├─ supabase/seed.sql        catálogo para o banco (gerado por `npm run db:seed-sql`)
├─ supabase/tests/          testes de RLS (Postgres puro)
└─ tests/                   unitários (node:test) e ponta a ponta (Playwright)
```

**Segurança**
- `ANTHROPIC_API_KEY` e `YOUTUBE_API_KEY` existem só no servidor. O módulo `env.ts` importa `server-only`, e o build falha se um componente cliente tentar usá-lo.
- O RLS está ativo em todas as tabelas:
  - O catálogo é de leitura pública e só o service role escreve nele.
  - Os dados pessoais seguem a regra `user_id = auth.uid()`.
  - O usuário não pode alterar o próprio `plan`.
  - O `ai_usage` só é alterado pela função `consume_ai_credit` (`SECURITY DEFINER`, com `search_path` vazio).
- Cabeçalhos de segurança estão em `next.config.ts`. O parâmetro `voltar` do login só aceita caminhos internos.

**Banco de dados:**
- `auth.users` (Supabase Auth)
- `profiles`
- Catálogo: `songs`, `preachers`, `sermons`, `theological_sources`, `bible_references`
- Dados do usuário: `folders`, `saved_items`, `notes`, `sermon_projects`, `search_history`
- Uso da IA: `ai_usage`

**Monetização (base pronta, sem pagamentos):**
- `profiles.plan` aceita `free` ou `premium`.
- O limite mensal de IA do plano gratuito vem de `VERBUM_FREE_AI_LIMIT`, padrão 10.
- O roteiro-base sem IA é ilimitado.
- Para criar o premium, basta um processo do servidor (service role) alterar `plan`.

## Instalação

Requisitos: Node 22.13+.

```bash
cd verbum
npm ci
cp .env.example .env.local      # preencha o que tiver; tudo é opcional
npm run dev                     # http://localhost:3000
```

### Variáveis de ambiente

| Variável | Onde | Para quê |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | público | Login, Meu Espaço na nuvem e limites |
| `ANTHROPIC_API_KEY` | **servidor** | Assistente de IA (Claude) |
| `VERBUM_AI_MODEL` | servidor | Modelo. Padrão: `claude-opus-5-5` |
| `YOUTUBE_API_KEY` | **servidor** | Busca de vídeos de pregações e músicas (YouTube Data API v3) |
| `VERBUM_FREE_AI_LIMIT` | servidor | Gerações de IA por mês no plano gratuito. Padrão: 10 |

O assistente usa saída estruturada e pede ao Claude o *fallback* do servidor (`fallbacks: "default"`, beta `server-side-fallback-2026-07-01`). Assim, se o modelo principal recusar, outro modelo responde. Para desligar, remova esses dois campos em `src/lib/ai/assistant.ts`.

### Configurar o Supabase

1. Crie um projeto em supabase.com e copie a URL e a chave *anon/publishable* para `.env.local`.
2. Aplique o esquema e os dados do catálogo, por um destes caminhos:
   - **CLI:** `supabase link --project-ref <ref>` e depois `supabase db push`, seguido de `psql "$DATABASE_URL" -f supabase/seed.sql`.
   - **Painel:** SQL Editor → cole `supabase/migrations/20261126000000_verbum_init.sql` e execute. Depois faça o mesmo com `supabase/seed.sql`.
3. Em Authentication → URL Configuration, adicione `https://SEU_DOMINIO/auth/callback` (e `http://localhost:3000/auth/callback`) às Redirect URLs.

### Publicar (Vercel)

Importe a pasta `verbum/` como projeto (framework Next.js) e cadastre as variáveis acima. A rota `/api/assistant` declara `maxDuration = 300`.

## Testes

```bash
npm run typecheck
npm test                        # 18 testes unitários: liturgia, busca, parser bíblico, verificação da IA
npm run build && npm start      # em outro terminal:
BASE_URL=http://localhost:3000 npm run test:e2e   # 14 fluxos no navegador
```

Os testes de RLS rodam em um Postgres comum:

```bash
psql -f supabase/tests/auth-stub.sql
psql -f supabase/migrations/20261126000000_verbum_init.sql
psql -f supabase/seed.sql
psql -f supabase/tests/rls.sql
```

O CI (`.github/workflows/verbum.yml`) roda typecheck, testes unitários, build, testes de ponta a ponta e os testes de RLS no Postgres 17.

## Atualizar o catálogo

- **Músicas, documentos e o padrão de links da Bíblia:** edite `src/data/verified/*.json` e acrescente só o que você conferiu na fonte. Depois rode `npm run db:seed-sql` para atualizar o `seed.sql`.
- **Temas, perícopes, índice do Catecismo e santos:** ficam em `src/data/*.ts`.
- **Links bíblicos:** hoje existem só para os livros cujo endereço foi confirmado (Gn, Sl, Is, Mt, Lc, Jo, Rm, 1Jo). Os demais mostram “leia na sua Bíblia”.

## Limites conhecidos

- O calendário litúrgico segue as Normas Universais e o calendário próprio do Brasil. Não inclui celebrações próprias de dioceses e congregações. As leituras do dia remetem à liturgia da Canção Nova.
- As justificativas das músicas e a relação documento → tema são indicações editoriais e estão sinalizadas assim na interface.
- O PDF usa a impressão do navegador (“Salvar como PDF”), com folha de estilos própria.
