-- Simula o ambiente do Supabase: schema auth, roles e privilégios padrão.
do $$ begin
  if not exists (select from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
end $$;
create schema auth;
create table auth.users (id uuid primary key, email text);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to anon, authenticated;
grant usage on schema public to anon, authenticated;
alter default privileges in schema public grant all on tables to anon, authenticated;
insert into auth.users values
 ('00000000-0000-0000-0000-0000000000a1','ana@x.org'),
 ('00000000-0000-0000-0000-0000000000b2','beto@x.org'),
 ('00000000-0000-0000-0000-0000000000c3','carla@x.org'),
 ('00000000-0000-0000-0000-0000000000d4','davi@y.org'),
 ('00000000-0000-0000-0000-0000000000e5','elisa@x.org');
