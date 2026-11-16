-- DADOS DE DEMONSTRAÇÃO — somente para ambiente LOCAL (npx supabase db reset).
-- Todos os registros são marcados com "[DEMO]" e e-mails @demo.koinonia.invalid.
-- Nunca aplicar em produção.
do $$
begin
  if current_setting('app.environment', true) = 'production' then
    raise exception 'demo seed must not run in production';
  end if;
end $$;

insert into auth.users (id, email, raw_user_meta_data) values
  ('d0000000-0000-0000-0000-000000000001', 'voluntaria@demo.koinonia.invalid', '{"display_name":"[DEMO] Voluntária","consent_version":"2026-11"}'),
  ('d0000000-0000-0000-0000-000000000002', 'paroquia@demo.koinonia.invalid',   '{"display_name":"[DEMO] Coordenação paroquial","consent_version":"2026-11"}')
on conflict do nothing;

update public.profiles set onboarded_at = now(), visibility = 'public', country_code = 'BR', city = 'Campinas',
  languages = '{pt,es}', availability = '{weekends}', bio = '[DEMO] Perfil de demonstração.'
where id in ('d0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000002');

insert into public.communities (id, slug, name, kind, description, country_code, city, created_by, status, verified_at)
values ('d1000000-0000-0000-0000-000000000001', 'demo-paroquia', '[DEMO] Paróquia de demonstração', 'parish',
        '[DEMO] Comunidade fictícia para testes locais.', 'BR', 'Campinas', 'd0000000-0000-0000-0000-000000000002', 'verified', now())
on conflict do nothing;

insert into public.opportunities (community_id, created_by, title, description, mode, status, country_code, city, languages, availability)
values ('d1000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000002', '[DEMO] Músicos para a missa jovem',
        '[DEMO] Oportunidade fictícia para testar candidaturas e o Match Missionário.', 'onsite', 'open', 'BR', 'Campinas', '{pt}', '{weekends}')
on conflict do nothing;
