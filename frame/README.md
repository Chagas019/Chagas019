# FRAME

> **Sua criatividade merece um mundo inteiro.**
> Rede social para fotógrafos, videomakers, editores e criadores visuais — portfólio, processo, aprendizado, desafios e comunidades.

Documento de requisitos e plano técnico: [`docs/REQUISITOS-E-PLANO.md`](docs/REQUISITOS-E-PLANO.md).

## Stack

| Camada | Escolha |
|---|---|
| App | Next.js 16 (App Router, Server Components, Server Actions, Route Handlers), React 19, TypeScript estrito |
| UI | Tailwind CSS 4 (tokens em `src/app/globals.css`), lucide-react, motion (respeita `prefers-reduced-motion`) |
| Dados | PostgreSQL + Drizzle ORM, migrações versionadas em `drizzle/` |
| Auth | Better Auth (e-mail/senha, sessão em cookie httpOnly, recuperação de senha, rate limit em banco) |
| Mídia | `sharp` (validação, remoção de EXIF/GPS, WebP + miniatura) · storage local **ou** Vercel Blob privado |
| IA | Vercel AI SDK — modelo trocável por variável de ambiente (Gateway, Anthropic ou OpenAI) |
| Testes | Vitest (unidade + integração com Postgres real) · Playwright (E2E desktop + mobile) |

## Rodando localmente

```bash
cp .env.example .env          # ajuste DATABASE_URL e BETTER_AUTH_SECRET
npm install
npm run db:migrate            # aplica as migrações
npm run db:seed               # OPCIONAL: dados de DEMONSTRAÇÃO (contas @demo.frame.local, imagens abstratas "DEMO")
npm run dev                   # http://localhost:3000
```

Contas demo (só após o seed): `lia@demo.frame.local`, `admin@demo.frame.local` etc. — senha `demo-frame-2026`.
O seed se recusa a rodar com `NODE_ENV=production`.

### Verificações

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # eslint
npm test            # vitest: unidade + integração (usa o banco frame_test — recriado a cada execução)
npm run build && npm run test:e2e   # Playwright contra o build, banco frame_test
```

`TEST_DATABASE_URL` (padrão `postgres://frame:frame@localhost:5432/frame_test`) precisa apontar para um banco **descartável**: os testes apagam e recriam o schema.

## O que está implementado (MVP)

- **Conta**: cadastro, login, logout, recuperação/redefinição de senha, troca de senha (encerra outras sessões).
- **Onboarding por interesses** → página de primeiros passos com criadores sugeridos, comunidades e desafios + checklist de ativação.
- **Perfil/portfólio**: avatar, capa, bio, especialidades, interesses, links, equipamento, disponibilidade, contato com visibilidade configurável, cor de destaque, abas (trabalhos por categoria, Showcases, tutoriais, coleções), indexação opcional.
- **Publicação**: imagens (até 10, carrossel), vídeo (MP4/MOV/WebM), texto alternativo, categorias, ferramentas, visibilidade (público/seguidores/só eu), projeto colaborativo.
- **Showcase**: resultado + foto original com **slider antes/depois** (mouse, toque e teclado), processo, ficha técnica (câmera, lente, luz, apps, preset/LUT, parâmetros), créditos, link de portfólio, opção de ocultar a ficha.
- **Feed Inspiração** com filtros (Para você, Seguindo, Fotografia, Vídeo, Edição, Color grading, Design, Tutoriais, Antes e depois, Colaborativos) e ranking documentado em `src/lib/ranking.ts`.
- **Seguidores aprovados**: seguir é instantâneo, mas posts "Seguidores aprovados" só aparecem para quem você aprova em Configurações (ou ative a aprovação automática).
- **Interações**: curtir, comentar/responder, excluir comentário, salvar, coleções, seguir, compartilhar, denunciar, bloquear, silenciar.
- **FRAME LAB**: tutoriais com área, nível, tempo, app, etapas, materiais, avaliação de utilidade e filtro "meus salvos".
- **Descobrir talentos**: novos talentos com critérios públicos e rotação diária, filtro por especialidade, exploração por interesse, projetos colaborativos.
- **Comunidades**: públicas, privadas (aprovação) e por convite (link regenerável), papéis, banimento, remoção de posts, discussões, notificações por comunidade.
- **Creative Battles**: desafios semanais/mensais com briefing, regras, paleta, galeria, envio, retirada, votação com regras anti-abuso (sem voto próprio, limite por pessoa, idade mínima de conta, contagem oculta até o fim) e resultados.
- **Notificações** reais (seguidores, comentários, respostas, comunidade, desafios) com preferências.
- **Moderação**: fila de denúncias priorizada (direitos autorais/assédio/ódio primeiro), remoção, arquivamento, restauração, log.
- **Privacidade/LGPD**: exportação JSON dos dados, exclusão definitiva da conta (incluindo arquivos), EXIF/GPS removidos, localização oculta por padrão.
- **FRAME AI** (texto): 8 ferramentas (ideias, roteiro, conceito, shot list, briefing, títulos, perguntas de feedback, portfólio), limite diário por usuário, teto global de custo, registro só de tokens/custo.

## Testes executados

| Suíte | Resultado |
|---|---|
| `tsc --noEmit` | sem erros |
| `eslint .` | sem erros/avisos |
| Vitest — 4 arquivos de unidade + 4 de integração (Postgres real) | 35 testes passando |
| Playwright — 9 cenários (cadastro→onboarding→publicação, edição de perfil, curtida/comentário/follow persistidos, post privado e arquivo inacessíveis, notificações, Showcase + slider por teclado, envio a desafio, comunidade privada com aprovação, layout mobile sem overflow) | 9 passando |
| `next build` | sem erros/avisos |

**Não testado automaticamente**: FRAME AI com provedor real (sem chave no ambiente), Vercel Blob (sem token), envio de e-mail real (sem provedor), upload de vídeos grandes, leitores de tela reais.

## Integrações e credenciais

| Serviço | Obrigatório? | Variáveis | Custo |
|---|---|---|---|
| PostgreSQL (Neon, Supabase, RDS…) | Sim | `DATABASE_URL` | Neon/Supabase têm plano gratuito |
| Segredo de sessão | Sim | `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL` | — |
| Vercel Blob (store **privada**) | Em produção serverless | `STORAGE_DRIVER=blob`, `BLOB_READ_WRITE_TOKEN` | Cota gratuita limitada; pago acima |
| E-mail transacional (Resend) | Para recuperar senha em produção | `RESEND_API_KEY`, `MAIL_FROM` | Plano gratuito disponível |
| Provedor de IA | Opcional (IA fica desativada sem chave) | `AI_GATEWAY_API_KEY` **ou** `ANTHROPIC_API_KEY` **ou** `OPENAI_API_KEY`; `FRAME_AI_MODEL` | Pago por uso |
| Cron (limpeza, avisos de desafio) | Recomendado | `CRON_SECRET` (+ `vercel.json`) | Incluído na Vercel |
| Administração | Opcional | `FRAME_ADMIN_EMAILS` (e-mails que viram admin ao se cadastrar) | — |

Sem `RESEND_API_KEY`, em desenvolvimento o link de redefinição de senha é impresso no log do servidor; em produção a solicitação falha explicitamente (não fingimos que o e-mail foi enviado).

## Segurança — o que existe

- Autorização sempre no servidor (`src/server/services/*`), regra única de visibilidade (`canViewPost`) espelhada em SQL (`visibleToViewer`) e coberta por testes.
- Mídia nunca exposta por URL pública permanente: `/api/media/[id]` checa permissão a cada requisição; conteúdo não público usa `Cache-Control: private`.
- Uploads validados por assinatura binária (não por extensão/MIME), limite de tamanho e de pixels, reencodados (neutraliza payloads em metadados).
- Zod em todas as entradas; links só `http(s)` e com `rel="nofollow ugc noopener"`; nenhum `dangerouslySetInnerHTML`.
- Rate limit em banco (funciona com várias instâncias) para login/cadastro/reset, curtidas, comentários, follows, denúncias, uploads, exportação e IA.
- Cabeçalhos: CSP, `X-Frame-Options: DENY`, `nosniff`, HSTS, `Referrer-Policy`, `Permissions-Policy`.
- Proteção contra open redirect no `?next=`; códigos de convite comparados em tempo constante.

### Riscos conhecidos (revisão de segurança)

Uma revisão estática por agente encontrou e o PR já corrigiu: open redirect com caracteres de controle no `?next=`, upload sem `Content-Length`, avatares/capas órfãos hospedados para sempre, cache longo de mídia, admin de comunidade agindo sobre outros admins, título de post invisível vazando em notificações, verificação de senha sem rate limit na exclusão de conta, exclusão de conta não atômica (e arquivos órfãos de comunidades), cota de IA contornável abortando o stream, e posts "só seguidores" visíveis a qualquer conta (agora exigem seguidor aprovado; aprovação automática é opcional em Configurações).

Ainda em aberto (decisões de produto ou infraestrutura):
- **Vídeos mantêm metadados** (incluindo GPS) — requer ffmpeg (`-map_metadata -1`) ou serviço de mídia.
- **Votação com contas falsas**: hoje a defesa é idade mínima de conta + rate limit de cadastro; exigir e-mail verificado para votar.

## O que falta para produção

1. **Infra**: provisionar Postgres gerenciado, Vercel Blob privado, Resend; configurar variáveis; rodar `npm run db:migrate` no deploy.
2. **Upload de vídeo em serverless**: funções da Vercel limitam o corpo a ~4,5 MB. Para vídeos/imagens grandes é preciso upload direto do navegador para o Blob (`@vercel/blob/client` + token emitido pelo servidor). A interface `Storage` já isola essa troca. Não há transcodificação nem pôster de vídeo (requer ffmpeg/serviço dedicado).
3. **Verificação de e-mail** no cadastro (Better Auth suporta; depende do provedor de e-mail).
4. **Suspensão de contas** pela moderação (hoje a moderação remove conteúdo, não bloqueia login) e moderação automática de imagens.
5. **Tempo real**: notificações são persistidas e lidas a cada navegação; não há push/WebSocket.
6. **Escala do feed "Para você"**: ranqueia até 400 candidatos recentes em memória por requisição — adequado ao MVP; depois, materializar scores.
7. **Observabilidade**: logs estruturados, Sentry/OpenTelemetry e painel de métricas de ativação (dados já em `activation_event`).
8. **Revisão jurídica** de `/termos` e política de privacidade; fluxo formal de notificação de direitos autorais (DMCA/LGPD).
9. **i18n**: estrutura em `src/i18n/` (navegação já usa o dicionário); a maioria dos textos ainda está nos componentes.

### Fora do MVP (planejado, não implementado)

Creative Assets/marketplace (presets, LUTs, pagamentos), Collab (oportunidades e candidaturas), mensagens diretas/grupos. O schema e as camadas foram pensados para recebê-los sem refatoração estrutural; nenhuma tela finge que eles existem.

## Estrutura

```
src/
  app/                 rotas (páginas, API) — UI fina
  components/          ui/ (design system), post/, social/, community/, challenge/, settings/, ai/…
  lib/                 validação (Zod), taxonomias, ranking, utilitários (sem dependência de servidor)
  server/
    actions/           Server Actions (envelope ActionResult, sem lógica de negócio)
    services/          regras de negócio + autorização
    db/                schema Drizzle, cliente, migrate, seed (demo)
    storage/           driver local / Vercel Blob privado
  i18n/                dicionários
drizzle/               migrações SQL versionadas
tests/                 unit/, integration/, e2e/
```
