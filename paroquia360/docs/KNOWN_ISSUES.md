# Problemas conhecidos

- Protótipo: dados de exemplo gerados em `p360.js` (nov–dez/2026); alterações ficam só no navegador (botão "reiniciar" volta ao início).
- Protótipo: "trocar paróquia" e "lembrar pendentes" só mostram aviso — dependem de auth e notificações (Fase 4).
- Protótipo: a tela mostra a visão da coordenação; a visão do voluntário (confirmar a própria escala) será feita no app.
- Banco: falta política de retenção/anonimização automática (LGPD) e job de backup — Fase 6.
- Supabase: alerta "Signed-In Users Can Execute SECURITY DEFINER Function" em `parish_directory` é intencional — a função só devolve nomes se quem chama for membro da paróquia.
- Protótipo: cena do hero é ilustração SVG; produto final deve permitir foto da própria igreja (Storage).
- Protótipo mobile: Relatórios e tema ficam fora da barra inferior; irão para menu "Mais".
- App: convites não são enviados por e-mail; o link é copiado e enviado pela administração.
- App: o e-mail de login usa o servidor padrão do Supabase (limite baixo de envios por hora). Para produção, configurar SMTP próprio e as URLs de redirecionamento do Auth (Site URL) no painel do Supabase.
- App: faltam disponibilidade, talentos, "Preciso de ajuda", comunicados e relatórios.
- Supabase: banco zerado em 18/11 (sem paróquias, usuários ou auditoria de teste).
- Login no site publicado: `https://paroquia360.vercel.app` (e o domínio do Floot, se for usado) precisa estar em Authentication → URL Configuration do Supabase (Site URL e Redirect URLs), senão o link do e-mail volta para localhost.
- Login: o servidor de e-mail padrão do Supabase envia no máximo 2 e-mails por hora para o projeto todo. Para uso real, configurar SMTP próprio (ex.: Resend/Brevo com domínio da paróquia) em Authentication → Emails → SMTP Settings.
- Login: enquanto a Site URL do Supabase for `http://localhost:3000`, os links do e-mail levam para localhost. Corrigir em Authentication → URL Configuration.
