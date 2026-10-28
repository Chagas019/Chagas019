# MídiaFlow

**Sua equipe. Sua missão. Tudo conectado.**

Plataforma para a PASCOM organizar as equipes de mídia, as escalas das missas e a cobertura dos eventos da paróquia.

## Como rodar

```bash
cd midiaflow
npm install
npm run dev       # http://localhost:5173
npm test          # regras de escala e conflitos
npm run build     # verificação de tipos + build de produção em dist/
```

Sem configurar nada, o app abre em **modo demonstração**: os dados são fictícios, gerados a partir da data de hoje e salvos apenas no `localStorage` do navegador. Uma faixa no topo deixa isso claro. Em **Configurações → Restaurar dados de exemplo** você volta ao estado inicial.

Pelo menu do perfil (canto superior direito) dá para **ver o app como** Administrador, Coordenador ou Integrante e testar as permissões.

## Funcionalidades

- **Visão geral:** saudação, indicadores (próximas escalas, confirmados, vagas abertas, eventos do mês), próxima celebração com % de cobertura, faixa da semana com as escalas de cada dia (tabela no desktop, cards no celular), gráfico de cobertura, próximas celebrações, atividades recentes e avisos da equipe.
- **Escalas:** criar, editar, duplicar e excluir (com confirmação), funções personalizadas, designação por vaga, botão "sugerir alguém disponível", filtros por data, evento, função e status, busca por nome, visualização em tabela ou cards e histórico de alterações de cada escala.
- **Conflitos:** alerta quando a mesma pessoa é escalada em funções incompatíveis na mesma celebração (as compatíveis são configuradas em *Funções*), em outra escala no mesmo horário, fora da disponibilidade, numa data marcada como indisponível, ou quando está inativa. Para salvar mesmo assim, é preciso confirmar.
- **Calendário:** visualização por mês, semana ou lista, cores por tipo de evento, eventos sem cobertura destacados, filtro por função ou por integrante, e criação de escala clicando em um dia.
- **Equipe:** cadastro e edição dos integrantes (funções, disponibilidade, datas indisponíveis, situação), consulta "quem está disponível?" por data e hora, perfil com escalas futuras e histórico, convites. Os contatos só aparecem para a coordenação.
- **Eventos:** cadastro, equipe necessária, status de cobertura, "montar escala deste evento" e checklist de produção.
- **Minhas escalas:** o integrante confirma presença, informa que não poderá participar ou pede substituição. A vaga fica destacada para o coordenador, e **nenhuma substituição é feita automaticamente**.
- **Relatórios:** escalas, cobertura, confirmações, vagas abertas, participação por função, eventos e auditoria, com exportação CSV (protegida contra injeção de fórmulas) e impressão. Os números são marcados como demonstrativos.
- **Formação PASCOM (`/formacao`):** 8 módulos com 18 lições: postura e liturgia, direito de imagem, ajustes de celular separados para iPhone antigo, iPhone novo, Android antigo e Android novo, luz da igreja, câmera fotográfica, vídeo, áudio e transmissão ao vivo, mapa interativo das posições dentro da igreja, momentos da missa, composição, edição de fotos e vídeos, artes, stories e organização de arquivos. Tem checklists, progresso por integrante, avaliação final e certificado para imprimir. O conteúdo fica em `src/lib/training.ts`, fácil de editar.
- **Visual Liquid Glass:** cards, menus, modais, barra lateral e barra inferior flutuante em vidro translúcido (desfoque + saturação, borda especular e brilho no topo) sobre um fundo com luzes neon/azul, linhas verticais e grade de pontos. No painel: lista de missões com check, calendário em matriz de pontos, relógio digital com contagem até a próxima missa e a "troca líquida" (metaball) entre quem pediu substituição e quem está livre.
- **Experiência:** animações de entrada, transição de páginas, modais, toasts, anéis de cobertura animados, estados vazios e de carregamento, respeito a `prefers-reduced-motion`, navegação por teclado (atalho `⌘K` / `/` para busca) e layout mobile-first com barra inferior.

## Estrutura

```
src/
  lib/        tipos, regras (domain.ts), dados demo, store (demo e banco), remote.ts (Supabase), formação, CSV
  components/ ui (design system), layout (sidebar, header, barra mobile), schedule (editor, detalhe, confirmação)
  pages/      Visão geral, Escalas, Calendário, Equipe, Funções, Eventos, Relatórios, Notificações, Configurações, Minhas escalas, Login
supabase/migrations/0001_midiaflow.sql   banco: tabelas, RLS e funções
supabase/tests/                          verificações de segurança do banco
tests/e2e/                               testes no navegador + simulador do Supabase
deploy/                                  publicação na Vercel sem integração GitHub
```

## Login e banco de dados (Supabase)

Com as variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` configuradas, o MídiaFlow deixa o modo demonstração e passa a funcionar de verdade:

- **Conta:** criar conta com e-mail e senha, entrar, “Esqueci minha senha” (link por e-mail e tela de nova senha), entrar com Google (se ativado no Supabase), alterar senha e sair.
- **Primeiro acesso:** criar a paróquia (quem cria vira administrador) ou entrar com o **código de convite**. O link `https://seu-site/?convite=CODIGO` já preenche o código. Se a coordenação cadastrou a pessoa antes com o mesmo e-mail, a conta é ligada a esse cadastro, sem duplicar.
- **Dados salvos no banco:** escalas, eventos, equipe, funções, avisos, notificações e histórico, com salvamento automático (indicador “Salvo/Salvando…”), atualização em tempo real e controle de versão (se duas pessoas editarem ao mesmo tempo, ninguém sobrescreve o outro sem aviso).
- **Progresso da Formação** salvo na conta: acompanha a pessoa em qualquer aparelho.
- **Segurança:** Row Level Security separa as paróquias. Integrante só responde às próprias vagas e só edita a própria disponibilidade; coordenador não muda níveis de acesso nem dados da paróquia; contatos (e-mail/telefone) ficam numa tabela separada, visível só para a coordenação e para o próprio integrante; o código de convite só é visível para a coordenação. Apenas a chave pública `anon` vai para o site.

### Ativar (uma vez)

1. Crie um projeto gratuito em [supabase.com](https://supabase.com) (região São Paulo).
2. Em **SQL Editor**, cole e rode o conteúdo de `supabase/migrations/0001_midiaflow.sql`.
3. Em **Authentication → URL Configuration**, coloque a **Site URL** do site (ex.: `https://midiaflow-chagas7.vercel.app`) e adicione a mesma em **Redirect URLs**.
4. (Opcional) **Authentication → Providers → Google** para o botão “Continuar com Google”.
5. Em **Project Settings → API**, copie a **Project URL** e a chave **anon public**. Coloque como `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` nas variáveis do projeto na Vercel (ou no `.env` local) e publique de novo.

## Bots de teste e revisão

| Bot | O que faz | Onde |
| --- | --- | --- |
| **MídiaFlow — testes** | A cada push/PR: tipos, testes de unidade, build, auditoria de segurança das dependências, **30 verificações de segurança do banco** num PostgreSQL real e **20 testes no navegador** (computador, celular e login/banco com simulador do Supabase) | `.github/workflows/midiaflow-ci.yml` |
| **MídiaFlow — revisão do Claude** | Lê cada pull request e comenta bugs, falhas de segurança, acessibilidade e coerência católica. Ative criando o segredo `ANTHROPIC_API_KEY` no repositório | `.github/workflows/midiaflow-claude-review.yml` |
| **Dependabot** | Abre PRs semanais com atualizações e correções de segurança | `.github/dependabot.yml` |

Rodar localmente:

```bash
npm run check      # tipos + testes de unidade + build
npm run test:e2e   # testes no navegador (instale antes: npx playwright install chromium)
npm run test:db    # banco: precisa de um PostgreSQL (PGHOST/PGUSER/PGPASSWORD)
```

## Notificações por e-mail e WhatsApp

**Não configuradas.** As notificações aparecem dentro do app, e a tabela `notifications` já recebe os registros. Para enviar mensagens fora do app, crie uma Edge Function do Supabase disparada na inserção, com um provedor de e-mail (ex.: Resend) e a WhatsApp Business API, guardando as chaves como *secrets* do Supabase, nunca no frontend. O app não simula esses envios.

## Publicação

No ar em **https://midiaflow-chagas7.vercel.app** (projeto `midiaflow`, time *chagas* na Vercel).

Como a integração GitHub da Vercel ainda não está ativa nesse time, a publicação é feita enviando à Vercel só o script `deploy/vercel-build.sh`: na hora do build ele baixa o código deste repositório (público) num commit fixo, roda `npm install` e `npm run build` e entrega `dist/`. Para publicar uma versão nova, troque o `SHA` no script pelo commit desejado e crie um novo deploy com ele.

Quando a integração GitHub estiver instalada (Vercel → Settings → Git), basta conectar o repositório ao projeto com *Root Directory* `midiaflow`, comando `npm run build` e saída `dist`; o `vercel.json` já redireciona as rotas para o `index.html`. Aí cada push publica sozinho.
