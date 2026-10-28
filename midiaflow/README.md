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
- **Visual Liquid Glass:** cards, menus, modais, barra lateral e barra inferior flutuante em vidro translúcido (desfoque + saturação, borda especular e brilho no topo) sobre um fundo com luzes neon/azul, linhas verticais e grade de pontos. No painel: lista de missões com check, calendário em matriz de pontos, relógio digital com contagem até a próxima missa e a "troca líquida" (metaball) entre quem pediu substituição e quem está livre.
- **Experiência:** animações de entrada, transição de páginas, modais, toasts, anéis de cobertura animados, estados vazios e de carregamento, respeito a `prefers-reduced-motion`, navegação por teclado (atalho `⌘K` / `/` para busca) e layout mobile-first com barra inferior.

## Estrutura

```
src/
  lib/        tipos, regras (domain.ts), dados demo, store, períodos, Supabase, CSV
  components/ ui (design system), layout (sidebar, header, barra mobile), schedule (editor, detalhe, confirmação)
  pages/      Visão geral, Escalas, Calendário, Equipe, Funções, Eventos, Relatórios, Notificações, Configurações, Minhas escalas, Login
supabase/migrations/0001_midiaflow.sql   esquema + RLS
```

## Supabase: o que está pronto e o que falta

**Pronto**

- `supabase/migrations/0001_midiaflow.sql`: paróquias, perfis, integrantes, contatos (em tabela separada), funções, compatibilidades, disponibilidade, eventos, escalas, designações, notificações e auditoria. Inclui **Row Level Security** em todas as tabelas, separação por paróquia, os três níveis de acesso, validações no banco (`check`), a função `respond_assignment` (o integrante só altera a própria vaga) e triggers de auditoria.
- **Login real e recuperação de senha:** com as variáveis configuradas, o app exige sessão e mostra a tela de login.

**Falta (depende de você / próximo passo)**

1. Criar um projeto no Supabase e rodar a migração (SQL Editor ou `supabase db push`).
2. Copiar `.env.example` para `.env` e preencher `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (apenas a chave **anon**; nunca a `service_role`).
3. Criar a paróquia e o primeiro perfil admin.
4. **Sincronizar os dados:** hoje as telas leem e gravam no store local (`src/lib/store.tsx`). Trocar essas funções por consultas às tabelas é o próximo passo, e enquanto isso a faixa do topo avisa que os dados ainda são locais.

## Notificações por e-mail e WhatsApp

**Não configuradas.** As notificações aparecem dentro do app, e a tabela `notifications` já recebe os registros. Para enviar mensagens fora do app, crie uma Edge Function do Supabase disparada na inserção, com um provedor de e-mail (ex.: Resend) e a WhatsApp Business API, guardando as chaves como *secrets* do Supabase, nunca no frontend. O app não simula esses envios.

## Publicação

O `vercel.json` já redireciona as rotas para o `index.html` (SPA). Na Vercel, use `midiaflow` como diretório raiz, `npm run build` como comando de build e `dist` como pasta de saída.
