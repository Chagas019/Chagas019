-- JARVIS v2 — endurecimento de segurança (T09, achado F-01).
-- O cliente (anon/authenticated via PostgREST) só pode LER as próprias linhas. Toda escrita passa pelo backend
-- (conexão de serviço, que ignora RLS), com rate limit, limite de corpo, orçamento e confirmação de ações.
-- Isso impede forjar `messages.meta.pending` e burlar limites gravando direto no banco.

drop policy if exists conversations_owner on conversations;
drop policy if exists messages_owner on messages;
drop policy if exists memories_owner on memories;
drop policy if exists tasks_owner on tasks;
drop policy if exists devices_owner on devices;
drop policy if exists conversations_select on conversations;
drop policy if exists messages_select on messages;
drop policy if exists memories_select on memories;
drop policy if exists tasks_select on tasks;
drop policy if exists devices_select on devices;

create policy conversations_select on conversations for select
  using (user_id = auth.uid()::text);
create policy messages_select on messages for select
  using (exists (select 1 from conversations c where c.id = messages.conversation_id and c.user_id = auth.uid()::text));
create policy memories_select on memories for select
  using (user_id = auth.uid()::text);
create policy tasks_select on tasks for select
  using (user_id = auth.uid()::text);
create policy devices_select on devices for select
  using (user_id = auth.uid()::text);
-- usage_records e audit_events já são somente select (migration inicial); integration_tokens segue sem policy.

-- Defesa em profundidade: sem privilégios de escrita para os papéis do cliente (se existirem, ex.: Supabase).
do $$
declare r text;
begin
  foreach r in array array['anon', 'authenticated'] loop
    if exists (select 1 from pg_roles where rolname = r) then
      execute format('revoke insert, update, delete, truncate on conversations, messages, memories, tasks, usage_records, audit_events, devices, integration_tokens from %I', r);
    end if;
  end loop;
end $$;
