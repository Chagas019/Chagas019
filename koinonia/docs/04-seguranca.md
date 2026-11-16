# Segurança

| Ameaça | Controle | Onde |
|---|---|---|
| Acesso indevido a dados | RLS em todas as tabelas; `anon` sem escrita | `..0500_rls_policies.sql` |
| Escalada de privilégio | Papéis em `user_roles` (só admin concede); triggers impedem auto-verificação, auto-promoção a owner, mudança de `created_by`/`community_id` | `..0400_functions_triggers.sql` |
| Vazamento de contatos | `profile_private` legível só pelo dono; nunca exibido em buscas | migrations + `search_volunteers` |
| Spam / abuso | Rate limit no banco; permissões de mensagem; bloqueios; denúncias com moderação e auditoria | triggers + `/admin` |
| CSRF | Server Actions (verificação de Origin pelo Next); cookies `SameSite=Lax` | Next.js |
| XSS | React escapa saída; sem `dangerouslySetInnerHTML`; CSP restritiva; links externos com `rel="noopener noreferrer nofollow"`; URLs só `https://` validadas | `next.config.ts`, schemas |
| Clickjacking | `frame-ancestors 'none'` + `X-Frame-Options: DENY` | `next.config.ts` |
| Open redirect | `safeRedirectPath` em `next`/`back`/`returnTo` | `src/lib/utils.ts` (testado) |
| Injeção em filtros | Parâmetros do PostgREST; busca sanitizada; `plainto_tsquery` | `services/pagination.ts` |
| Enumeração de contas | Mensagens genéricas em login e recuperação de senha | `features/auth/actions.ts` |
| Sessão | `getUser()` (validação no servidor do Auth) em vez de `getSession()`; renovação no proxy | `lib/supabase` |
| Vazamento de erros | `dbErrorMessage` devolve mensagens neutras e registra só código + 200 chars | `lib/errors.ts` |
| Privacidade (LGPD/GDPR) | Consentimento explícito no cadastro (gravado com data), visibilidade do perfil (público/membros/privado), controle de mensagens | cadastro, onboarding, perfil |

## Revisão de segurança independente (16/11/2026)
Um revisor separado tentou explorar o banco com SQL real. Achados confirmados e corrigidos na migration `..0800_security_hardening.sql`, com regressões em `supabase/tests/30_security_regressions.sql`:

| Sev. | Achado | Correção |
|---|---|---|
| Alta | Admin não-owner podia inserir um owner, rebaixar/remover o owner original (tomada da comunidade) e adicionar pessoas sem consentimento | Inserção só do próprio usuário como `member`; trigger exige ser owner para alterar/remover owner |
| Alta | Open redirect com `/\t/evil.com` (o parser de URL remove TAB) | `safeRedirectPath` rejeita caracteres de controle e `\`, confere a origem |
| Média | Pedido de recurso aprovado podia ser reescrito (datas, comunidade, `decided_by`) | Campos imutáveis fora das transições; edição só pelo solicitante enquanto pendente |
| Média | `decided_by/decided_at/completed_at` de candidatura forjáveis | Campos de decisão só mudam nas transições |
| Média | Admin da comunidade podia se candidatar, concluir e autoavaliar a comunidade | Admin não se candidata à própria comunidade; trigger de avaliação reforçado |
| Baixa | `is_blocked_between` revelava bloqueios de terceiros | Função só responde para pares que incluem o próprio usuário |
| Baixa | Consentimento/onboarding com data retroativa; notas de revisão pré-preenchidas; rejeitar re-verificação "desverificava"; `created_by` de recursos mutável; moderador editava conteúdo de oportunidades; conversa referenciando qualquer oportunidade; inserts sem rate limit; extensões expostas em `public` | Todos corrigidos na 0008 |

## Riscos aceitos / pendências conhecidas
- *Login CSRF* no link de confirmação (`/auth/confirm` com `token_hash` de terceiros) é inerente ao fluxo de e-mail do Supabase; mitigado por redirecionamento apenas interno.
- `message_permission` é verificada ao iniciar a conversa; quem já conversa continua podendo enviar (bloqueio continua valendo). Revisar quando a UI de mensagens for criada.
- Membros de comunidades verificadas são legíveis publicamente (inclusive de perfis privados) — avaliar restringir a membros autenticados.
- Exclusão de conta e exportação de dados (requer Edge Function com `service_role`).
- Verificação de upload de imagens (avatar/logotipo) — buckets e políticas prontos, UI pendente.
- Rate limit também na borda (Vercel Firewall) e CAPTCHA no cadastro (Supabase Auth suporta hCaptcha/Turnstile).
- Revisão jurídica dos Termos e da Política de Privacidade (marcados como preliminares).
