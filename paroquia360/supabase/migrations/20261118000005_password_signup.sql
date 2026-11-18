-- Cadastro com e-mail e senha, sem e-mail de confirmação
-- (o envio de e-mails do projeto é limitado e não é necessário para entrar).
create function public.sign_up(p_email text, p_password text, p_name text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  e text := lower(trim(p_email));
  existing auth.users;
  uid uuid;
begin
  if e !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Digite um e-mail válido.'; end if;
  if length(coalesce(p_password, '')) < 8 then raise exception 'A senha precisa ter pelo menos 8 caracteres.'; end if;
  if length(trim(coalesce(p_name, ''))) < 2 then raise exception 'Informe seu nome.'; end if;
  -- freio contra cadastros em massa
  if (select count(*) from auth.users where created_at > now() - interval '1 minute') >= 20 then
    raise exception 'Muitos cadastros agora. Tente de novo em um minuto.';
  end if;

  select * into existing from auth.users where lower(email) = e;
  if found then
    -- Conta antiga criada pelo link de e-mail, sem senha e sem nenhuma paróquia: pode receber senha.
    if coalesce(existing.encrypted_password, '') = ''
       and not exists (select 1 from public.memberships m where m.user_id = existing.id) then
      update auth.users set encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')),
        email_confirmed_at = coalesce(email_confirmed_at, now()), updated_at = now() where id = existing.id;
      update public.profiles set full_name = trim(p_name) where user_id = existing.id and full_name = '';
      return;
    end if;
    raise exception 'Este e-mail já tem conta. Use “Entrar”.';
  end if;

  uid := gen_random_uuid();
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
  values ('00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated', e,
    extensions.crypt(p_password, extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}', jsonb_build_object('full_name', trim(p_name)), now(), now(), '', '', '', '');
  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), uid, uid::text, jsonb_build_object('sub', uid::text, 'email', e, 'email_verified', true), 'email', now(), now(), now());
end $$;

revoke all on function public.sign_up(text, text, text) from public;
grant execute on function public.sign_up(text, text, text) to anon, authenticated;
