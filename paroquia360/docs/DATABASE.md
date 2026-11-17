# Banco de dados (Fase 3 — implementado em `supabase/migrations/`)

Todas as tabelas de domínio têm `id uuid`, `parish_id uuid not null`, `created_at`, `updated_at` e RLS ativa.

| Tabela | Campos principais |
|---|---|
| parishes | name, slug (único), diocese, city, settings jsonb |
| profiles | user_id (=auth.users), full_name, phone, birth_date, is_minor (gerado), guardian_consent_at |
| memberships | user_id, parish_id, role (`parish_admin`,`priest`,`coordinator`,`pastoral_agent`,`volunteer`), status |
| platform_admins | user_id |
| pastorals | name, description, active |
| pastoral_members | pastoral_id, user_id, is_coordinator, active |
| skills / volunteer_skills | name / user_id, skill_id |
| availability | user_id, weekday, start_time, end_time, or date-specific exceptions |
| events | type (`mass`,`meeting`,`formation`,`retreat`,`feast`,`procession`,`special`), title, starts_at, ends_at, location, pastoral_id null |
| roster_roles | name (Leitor, Ministro, Músico, Coroinha, PASCOM), pastoral_id |
| roster_slots | event_id, roster_role_id, quantity |
| roster_assignments | slot_id, user_id, status (`pending`,`confirmed`,`declined`,`swap_requested`), confirmed_at |
| help_requests | pastoral_id, event_id null, skill_id null, description, needed, status |
| help_offers | help_request_id, user_id, status |
| announcements | title, body, audience (`all`,`pastoral`,`coordinators`), pastoral_id null, published_at |
| audit_log | actor_id, action, entity, entity_id, diff jsonb, at |

Funções de acesso ficam no schema `private` (fora da API): `is_member`, `has_role`, `is_staff`, `coordinates`, `can_manage_pastoral`, `can_view_profile`. O diretório de nomes da paróquia é a RPC `parish_directory(parish_id)`, que mostra menores só pelo primeiro nome.

Regras: menores (`is_minor`) só visíveis a coordenadores da própria pastoral e admins; `audit_log` só insere por trigger e só é lido por `parish_admin`/`priest`.
