-- Dados iniciais opcionais. Os imóveis de demonstração vivem em src/data/properties.ts; para levá-los ao banco,
-- gere o SQL com: node scripts/export-seed.mjs > supabase/seed-imoveis.sql  (depois de npm install)
-- Este arquivo só cria o conteúdo padrão do site.

insert into public.site_content (key, value) values
  ('home', '{"heroTitle":"Seu próximo capítulo começa aqui.","heroSubtitle":"Descubra imóveis extraordinários e explore cada espaço antes mesmo de visitá-lo.","heroPrimary":"Explorar imóveis","heroSecondary":"Conhecer a experiência 3D","ctaTitle":"Encontre um espaço que combine com a sua história.","ctaButton":"Começar minha busca"}')
on conflict (key) do nothing;

-- Primeiro administrador: depois de criar a conta em /entrar, rode (trocando o e-mail):
-- update public.profiles set role = 'admin' where id = (select id from auth.users where email = 'voce@suaimobiliaria.com.br');
