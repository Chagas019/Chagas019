# CRIATIVA LAB

**Sua criatividade não tem limites.**
Plataforma de desenvolvimento da criatividade: desafios diários, laboratório de referências, academia, gerador de ideias com IA, portfólio e gamificação.

> Ideias não nascem prontas. Elas são desenvolvidas.

---

## Stack

| Camada | Tecnologia |
| --- | --- |
| Framework | Next.js 16 (App Router) + React 19 + TypeScript |
| Estilo | Tailwind CSS 4 (tokens em `src/app/globals.css`) |
| Motion | Framer Motion |
| Ícones | Lucide |
| Dados e login | Supabase (Auth, Postgres com RLS, Storage) — com **modo local** automático |
| IA | Claude (Anthropic SDK) via rota de API no servidor — com **motor criativo local** de reserva |
| Fontes | Bricolage Grotesque, Instrument Serif, JetBrains Mono (`next/font`) |

## Como rodar

```bash
cd criativa-lab
npm install
cp .env.example .env.local   # opcional — sem variáveis roda em modo local
npm run dev                  # http://localhost:3000
```

Sem nenhuma variável de ambiente, **tudo funciona**: cadastro, login, desafios, XP, favoritos, coleções, portfólio com imagens e gerador de ideias. Os dados ficam no navegador (modo local, indicado no rodapé do menu). Para produção, configure o Supabase e a IA.

### Variáveis de ambiente

| Variável | Onde fica | Para quê |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | navegador | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | navegador | chave pública (anon) — protegida por RLS |
| `ANTHROPIC_API_KEY` | **só servidor** | gerador de ideias com IA |
| `ANTHROPIC_MODEL` | só servidor | opcional; padrão `claude-opus-5-5` |

A chave da IA nunca chega ao navegador: o front chama `POST /api/ideas`, e a rota no servidor fala com a API. A rota valida a entrada (zod), limita requisições por IP e, se a IA falhar, recusar o pedido ou não estiver configurada, responde com o motor criativo local.

## Configurar o Supabase

1. Crie um projeto em [supabase.com](https://supabase.com).
2. Em **SQL Editor**, rode, nesta ordem:
   - `supabase/migrations/0001_schema.sql` — tabelas, triggers, RLS, bucket `portfolio` e políticas de Storage;
   - `supabase/seed.sql` — catálogo de desafios, referências, cursos e aulas.
   *(ou use a CLI: `supabase link` + `supabase db push`, e depois rode o seed)*
3. Em **Project Settings → API**, copie a URL e a `anon key` para o `.env.local`.
4. Em **Authentication → URL Configuration**, adicione a URL do site (ex.: `http://localhost:3000` e o domínio de produção).
   Com "Confirm email" ligado, o cadastro mostra a tela "Confira seu e-mail"; sem ele, o usuário entra direto.

Depois de mudar o conteúdo em `src/lib/content`, gere o seed de novo com `npm run db:seed`.

### Banco de dados

| Tabela | Conteúdo |
| --- | --- |
| `auth.users` | usuários (Supabase Auth) |
| `profiles` | nome, bio, áreas de foco e meta semanal (criado por trigger no cadastro) |
| `challenges` | desafios (diários e especiais de 7/30 dias, com etapas) |
| `completions` | desafios e etapas concluídos |
| `creative_references` | biblioteca de referências |
| `favorites` / `collections` | favoritos e coleções do usuário |
| `projects` | portfólio (imagens no bucket `portfolio`) |
| `courses` / `lessons` | trilhas da Academia |
| `lesson_progress` | aulas concluídas |
| `activities` | histórico de atividades e fonte única do XP |
| `saved_ideas` | ideias salvas do gerador |
| `user_progress` (view) | XP e contagens agregadas por usuário |

**Segurança (RLS):** catálogo com leitura pública e escrita só pelo service role; cada usuário só lê e altera as próprias linhas (`auth.uid() = user_id`); conclusões e histórico não aceitam UPDATE; upload só na pasta `portfolio/<uid>/`.
Triggers no banco recalculam o XP de cada conclusão a partir do desafio, limitam o XP por tipo de atividade, impedem concluir duas vezes a mesma etapa e impedem usar a coleção de outra pessoa.

## Estrutura

```
src/
  app/
    page.tsx                 landing
    (auth)/entrar, cadastro  login e cadastro
    (app)/                   área logada (menu lateral + tab bar no celular)
      inicio/                dashboard
      desafios/[slug]        desafios + detalhe (com etapas)
      referencias/           laboratório de referências + coleções
      academia/[slug]        trilhas e aulas
      gerador/               gerador de ideias
      portfolio/             projetos, ideias salvas e evolução
      progresso/             XP, níveis, medalhas, mapa de constância, histórico
      configuracoes/         perfil, exportar dados, reiniciar progresso
    api/ideas/route.ts       IA no servidor
  components/                UI (Button, Modal, motion), arte generativa, layout, feedback
  lib/
    content/                 catálogo (fonte única: app + seed SQL)
    data/                    backend Supabase e backend local, mesmo contrato
    ideas/                   schema zod + motor criativo local
    gamification.ts          níveis, sequências, medalhas, XP por dia
    store.tsx                estado global, ações e cálculos de progresso
supabase/                    migration + seed
tests/                       testes unitários e E2E
```

As imagens da biblioteca são **composições generativas em SVG** (`components/art/RefArt.tsx`): cada referência tem semente e paleta próprias. Não pesam nada, não têm direitos de terceiros e não quebram.

## Gamificação

- **XP**: desafio (40–120; especiais divididos por etapa), aula (+25), projeto (+40), ideia gerada (+10), ideia salva (+5), referência salva (+5, uma vez por referência), cadastro (+20).
- **9 níveis**: Faísca → Curioso → Explorador → Experimentador → Criador → Autor → Diretor Criativo → Visionário → Mestre do Lab.
- **11 medalhas**, sequência diária (com recorde), progresso semanal (meta configurável) e mensal, mapa de constância de 18 semanas.

## Testes

```bash
npm test                    # unitários: níveis, sequências, XP, conteúdo, motor de ideias
npm run lint                # checagem de tipos
npm run build && npm start  # em outro terminal:
BASE_URL=http://localhost:3000 npm run test:e2e -- caminho/para/uma-imagem.jpg
```

O E2E (Playwright) percorre: landing, redirecionamento da área logada, validação e cadastro, conclusão do desafio do dia com celebração, filtros e busca, etapas de desafio especial, favoritos e coleções, aula, gerador de ideias, portfólio com upload e edição, progresso, perfil, logout e login (inclusive com senha errada), persistência, 404 e o layout no celular (sem rolagem horizontal). Ao final, falha se houver qualquer erro no console.

## Publicar (Vercel)

1. Importe o repositório e defina **Root Directory** = `criativa-lab`.
2. Adicione as variáveis de ambiente.
3. Deploy. A rota `/api/ideas` roda em Node.js.
