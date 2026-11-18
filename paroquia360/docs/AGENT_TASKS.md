# Tarefas por agente

Regra de custo: um agente só é acionado quando a tarefa precisa da especialidade dele; paralelo só entre tarefas independentes que não tocam os mesmos arquivos. O Orchestrator executa direto tudo que é pequeno.

| # | Agente | Tarefa | Depende de | Paralelo com | Status |
|---|---|---|---|---|---|
| 1 | Orchestrator + PM | Diagnóstico, MVP, docs | — | — | ✅ |
| 2 | UI/UX | Protótipo do painel no estilo de referência | 1 | — | ✅ |
| 3 | UI/UX | Telas Escalas (montar/confirmar/trocar) e Agenda mensal | 2 | 4 | ✅ |
| 4 | Backend | Migrations: schema + RLS + seed de exemplo (fictício) | 1 | 3 | ✅ |
| 5 | Security | Revisar RLS e política de menores | 4 | 6 | — |
| 6 | Frontend | Scaffold Next.js + componentes do design system | 3 | 5 | ✅ |
| 7 | Frontend | Telas do MVP ligadas ao Supabase | 4,5,6 | — | 🟡 |
| 8 | QA | e2e dos fluxos do MVP (Playwright), mobile e desktop | 7 | — | 🟡 fluxo principal |

## Formato de entrega
Objetivo · Arquivos modificados · O que foi feito · Problemas · Próximos passos (máx. 10 linhas).

## Log
- **#1/#2** — `paroquia360/README.md`, `docs/*`, `prototipo/index.html`. Painel com filtros funcionais, confirmar/substituir/compartilhar escala, Preciso de Ajuda, tema claro/escuro, layout mobile. Dados de exemplo rotulados. Próximo: #3 e #4 em paralelo.
- **#3** — `prototipo/escalas.html`, `agenda.html`, `p360.css`, `p360.js`, `painel.js`. Escalas: lista por celebração com % confirmado, escalar/substituir com seletor que respeita função, disponibilidade, conflito e consentimento de menores; registrar confirmação, tirar, lembrar, enviar. Agenda: mês com eventos por tipo, painel do dia, criar evento (cria escala padrão para missa). Painel passou a ler os mesmos dados. Testado em 1360px e 390px, sem erros de console nem rolagem lateral.
- **#4** — `supabase/migrations/20261117000001_init.sql`, `seed.sql`, `tests/`. 17 tabelas, RLS em todas, FKs compostas impedem referência entre paróquias, gatilhos: perfil automático, anti-autopromoção, voluntário só altera a própria resposta, menor só com consentimento, auditoria. 44 checagens em `tests/rls_test.sql` passando num Postgres 16 local. Ainda não aplicado em nenhum projeto Supabase.
- **Security + Backend** — projeto `paroquia360` criado no Supabase (São Paulo, gratuito); migrações `init` e `harden` aplicadas. Alertas do Supabase corrigidos (search_path, anon sem acesso a funções); resta só o alerta intencional de `parish_directory`. Isolamento conferido no projeto real com dados temporários, desfeitos ao final.
- **#6/#7/#8** — `app/` (Next.js 15.5), migração `20261117000003_onboarding.sql` (convites, `create_parish`, `accept_invitation`; aplicada). Login por link, cadastro de paróquia, convite, painel, agenda, escalas, equipe. `e2e/fluxo.mjs` passou contra o Supabase real (13 checagens: redirecionamento sem login, criar paróquia, pastoral/função, convite, evento, aceitar convite, convite não reutilizável, escalar, voluntário confirma, voluntário sem acesso a convites, paróquia alheia = 404, celular sem rolagem lateral, sem erros de console). Testes de banco: 55 checagens.
- **Preciso de ajuda + talentos + disponibilidade** — tela `/p/[slug]/ajuda` (publicar pedido, sugestões por talento e dia livre, oferecer/retirar, aceitar/recusar, atender/cancelar), talentos e horários em Equipe, ✓ de disponível no seletor das Escalas, pedidos abertos no Painel. Migração `20261118000004_help_offers.sql` (refazer oferta) testada localmente; aplicada no Supabase em 18/11 (como ALTER POLICY). e2e: 19 checagens contra o Supabase real. Publicado na Vercel em 18/11 (https://paroquia360.vercel.app).
