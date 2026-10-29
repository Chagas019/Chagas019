# FRAME — Requisitos do MVP e plano técnico

> "Sua criatividade merece um mundo inteiro."

## 1. Usuários prioritários do MVP

| Persona | Necessidade principal | O que o MVP entrega |
|---|---|---|
| Fotógrafo(a) iniciante/intermediário | Mostrar trabalho e aprender | Feed, Showcase com antes/depois, FRAME LAB |
| Videomaker / editor(a) | Portfólio com vídeo e processo | Upload de vídeo, Showcase com ficha técnica |
| Profissional buscando clientes | Ser encontrado | Perfil-portfólio público/indexável, Descobrir Talentos |
| Comunidade / grupo | Trocar conhecimento | Comunidades públicas, privadas e por convite |

## 2. Escopo do MVP (itens da seção 22)

1. Cadastro e login (e-mail + senha, recuperação de senha).
2. Onboarding por interesses → sugestões de criadores, comunidades e desafios.
3. Perfil criativo (avatar, capa, bio, especialidades, links, equipamento, disponibilidade).
4. Publicação de imagens (até 10, carrossel) e vídeos.
5. Feed "Inspiração" com filtros e ranking equilibrado.
6. Curtidas, comentários (com respostas) e seguidores.
7. Showcase com comparação antes/depois e ficha técnica ocultável.
8. Descobrir Talentos com critérios transparentes de destaque de novos criadores.
9. FRAME LAB: tutoriais com nível, tempo, app, etapas, avaliação de utilidade.
10. Comunidades (pública / privada / convite), papéis e moderação.
11. Creative Battles: desafios, submissões, votação opcional com regras anti-abuso.
12. Layout responsivo mobile-first.
13. PostgreSQL real com migrações versionadas.
14. Moderação básica: denúncias (incl. direitos autorais), remoção, bloqueio, silenciamento.
15. Privacidade: visibilidade de posts, perfil indexável, localização opcional, exportação e exclusão de dados (LGPD).

Extra entregue se couber: FRAME AI (assistente de texto) com limites e custo monitorado.

Fora do MVP (arquitetura preparada, não implementado): Creative Assets/marketplace,
Collab, mensagens diretas, notificações push/e-mail, tempo real.

## 3. Critérios de aceitação

Os da seção 23 do briefing; cada um é coberto por teste E2E ou de integração (ver `tests/`).

## 4. Arquitetura

- **Next.js 16 (App Router) + React 19 + TypeScript estrito**.
- **Tailwind CSS 4** com tokens do design system em `src/app/globals.css`; ícones **lucide-react**; animações **motion** (respeitando `prefers-reduced-motion`).
- **PostgreSQL + Drizzle ORM** (escolhido em vez de Prisma: sem binário de engine, SQL explícito, migrações em `drizzle/`).
- **Better Auth** (e-mail/senha, sessões em cookie httpOnly, rate limit em banco).
- **Armazenamento**: interface `Storage` com drivers `local` (dev) e `blob` (Vercel Blob **privado**). Arquivos nunca são servidos por URL pública permanente: tudo passa por `/api/media/[id]`, que verifica a permissão do post.
- **Imagens** processadas com `sharp`: validação por assinatura binária, remoção de EXIF/GPS, versão de exibição (≤2560px, WebP) e miniatura (640px).
- **Camadas**: `src/app` (UI e rotas) → `src/server/actions` (Server Actions finas) → `src/server/services` (regras de negócio + autorização) → `src/server/db` (schema/queries). Validação com **Zod** em `src/lib/validation.ts`.
- **Erros**: `AppError` com códigos (`UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION`, `RATE_LIMITED`) traduzidos para mensagens úteis.
- **i18n**: dicionário `src/i18n/pt-BR.ts` + helper `t()`; novos idiomas = novo dicionário.
- **IA**: Vercel AI SDK, modelo configurável por `FRAME_AI_MODEL` (Gateway, Anthropic ou OpenAI), chaves só no servidor, limite diário por usuário e teto global de custo.

## 5. Ranking do feed "Para você"

Função pura `rankFeed` (testada em `tests/unit/ranking.test.ts`):

`score = recência × (1 + qualidade + interesse + novo_talento)`

- **qualidade**: comentários e salvamentos pesam mais que curtidas, normalizados por `log(seguidores+2)` do autor — quem tem muitos seguidores não ganha só por volume.
- **interesse**: categorias em comum com os interesses do usuário.
- **novo talento**: bônus para contas com < 45 dias ou < 50 seguidores.
- **diversidade**: no máximo 2 trabalhos do mesmo autor a cada 12 itens.
- Conteúdo de pessoas bloqueadas/silenciadas e removido pela moderação nunca entra.

## 6. Plano de fases

| Fase | Status |
|---|---|
| 1. Análise e MVP | este documento |
| 2. Arquitetura, banco, auth, design system | implementado |
| 3. Feed, publicação, perfis, seguidores | implementado |
| 4. Showcase, antes/depois, portfólio | implementado |
| 5. FRAME LAB (tutoriais) | implementado · Creative Assets: pendente |
| 6. Creative Battles e comunidades | implementado |
| 7. Collab, mensagens, notificações | notificações implementadas · Collab e mensagens: pendentes |
| 8. FRAME AI | implementado (requer chave) |
| 9. Segurança, acessibilidade, testes | contínuo — ver README |
| 10. Publicação e monitoramento | checklist no README |

## 7. Retenção e exclusão de dados

- Excluir conta remove usuário, perfil, posts, mídia (arquivos inclusive), comentários, reações, seguidores, coleções, submissões e votos (cascata).
- Denúncias feitas pelo usuário permanecem anonimizadas (`reporterId = null`) para histórico de moderação.
- Registros de uso de IA guardam apenas contagem de tokens e custo estimado — nunca o conteúdo das conversas.
- Logs de moderação guardam ação, autor da ação e alvo, sem copiar conteúdo.
