-- KOINONIA — 0007: Storage (somente quando o schema storage do Supabase existe).
-- Buckets públicos para avatares e logotipos; cada usuário escreve apenas na pasta {uid}/.
do $$
begin
  if not exists (select 1 from pg_namespace where nspname = 'storage') then
    raise notice 'storage schema not found; skipping bucket setup';
    return;
  end if;

  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values
    ('avatars', 'avatars', true, 2097152, array['image/png', 'image/jpeg', 'image/webp']),
    ('community-logos', 'community-logos', true, 2097152, array['image/png', 'image/jpeg', 'image/webp'])
  on conflict (id) do nothing;

  execute $p$
    create policy "koinonia own folder upload" on storage.objects for insert to authenticated
    with check (bucket_id in ('avatars', 'community-logos') and (storage.foldername(name))[1] = (select auth.uid())::text)
  $p$;
  execute $p$
    create policy "koinonia own folder update" on storage.objects for update to authenticated
    using (bucket_id in ('avatars', 'community-logos') and (storage.foldername(name))[1] = (select auth.uid())::text)
  $p$;
  execute $p$
    create policy "koinonia own folder delete" on storage.objects for delete to authenticated
    using (bucket_id in ('avatars', 'community-logos') and (storage.foldername(name))[1] = (select auth.uid())::text)
  $p$;
end $$;
