-- Endurecimento após os alertas do Supabase:
-- 1) função de gatilho com search_path fixo;
-- 2) anon não executa nenhuma função nossa (o Supabase concede EXECUTE a anon por padrão).
alter function private.touch_updated_at() set search_path = '';
revoke execute on function public.parish_directory(uuid) from anon, public;
revoke all on all functions in schema private from anon;
revoke usage on schema private from anon;
