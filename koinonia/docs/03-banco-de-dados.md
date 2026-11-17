# Banco de dados

Migrations em `supabase/migrations` (ordem de aplicação pelo prefixo):

| Arquivo | Conteúdo |
|---|---|
| `..0100_extensions_and_types` | pgcrypto, citext, pg_trgm; enums de domínio |
| `..0200_core_tables` | profiles, profile_private, user_roles, skill_categories, skills, profile_skills, portfolio_items, communities, community_members, community_verifications |
| `..0300_activity_tables` | opportunities, opportunity_skills, applications, conversations, conversation_participants, messages, blocks, resources, resource_requests, reviews, notifications, reports, audit_log, rate_limit_events |
| `..0400_functions_triggers` | helpers de autorização, auditoria, notificações, rate limit, regras de transição |
| `..0500_rls_policies` | RLS em todas as tabelas |
| `..0600_rpc_search_matching` | `start_conversation`, `mark_conversation_read`, `search_volunteers`, `match_score`, `match_opportunities_for_me`, `match_volunteers_for_opportunity` |
| `..0700_storage` | buckets `avatars` e `community-logos` (pasta por usuário) |

## Modelo (resumo)
```
auth.users 1─1 profiles 1─1 profile_private (contatos, só o dono)
profiles *─* skills (profile_skills) ; skills *─1 skill_categories
communities 1─* community_members *─1 profiles ; communities 1─* community_verifications
communities 1─* opportunities *─* skills ; opportunities 1─* applications *─1 profiles
applications(completed) 1─* reviews → (profile | community)
conversations 1─* conversation_participants ; conversations 1─* messages
communities 1─* resources 1─* resource_requests
profiles 1─* notifications ; profiles 1─* reports ; audit_log ; rate_limit_events
```

## Regras garantidas no banco
- Criador de comunidade vira `owner`; comunidade sempre mantém ao menos um owner.
- `status`/`verified_at` de comunidade só mudam por admin de plataforma (via aprovação de verificação, auditada e notificada).
- Só comunidades **verificadas** publicam oportunidades (`status = open`).
- Candidaturas: candidato só retira; admin da comunidade aceita/recusa (pendente) e conclui (aceita). Duplicidade bloqueada.
- Avaliações só após colaboração **concluída**, apenas entre as partes (voluntário ↔ comunidade).
- Mensagens só entre participantes; bloqueio impede envio; destinatário controla quem pode iniciar conversa.
- Notificações: usuário só altera `read_at`.
- Rate limits: comunidades 5/dia, oportunidades 20/dia, candidaturas 20/h, mensagens 30/min, conversas 20/h, pedidos de recurso 20/h, denúncias 10/h.

## Índices
GIN para `languages`, `availability` e `tsvector` de busca (perfis, comunidades, oportunidades); trigram em `display_name`; índices compostos para listagens (`status, created_at desc`), notificações não lidas (parcial) e unicidades parciais (uma verificação pendente por comunidade; uma denúncia aberta por alvo).

## Testes
`npm run test:db` — sobe PostgreSQL 16 temporário, aplica stub do Supabase + migrations + catálogo e executa `supabase/tests/*.sql` simulando os papéis anon/autenticado/admin.
