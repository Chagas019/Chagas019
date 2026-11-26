-- Funções de gatilho não precisam ser chamáveis pela API; o dashboard não é para visitantes.
-- is_admin() e can_access_product() continuam executáveis: as políticas RLS dependem delas
-- e ambas já se protegem internamente.
revoke execute on function public.downloads_bump_counter() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.admin_dashboard_stats() from public, anon;
grant execute on function public.admin_dashboard_stats() to authenticated;
