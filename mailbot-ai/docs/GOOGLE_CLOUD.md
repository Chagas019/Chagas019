# Configurar o Google Cloud (Gmail API + OAuth)

1. Acesse https://console.cloud.google.com e crie um projeto (ex.: `mailbot-ai`).
2. **APIs e serviços → Biblioteca** → ative a **Gmail API**.
3. **APIs e serviços → Tela de consentimento OAuth** (Google Auth Platform):
   - Tipo de usuário: **Externo**.
   - Nome do app: MAILBOT AI; e-mail de suporte; domínio do app (o domínio publicado).
   - Link da política de privacidade: `https://SEU-DOMINIO/privacidade`.
   - **Escopos**: adicione `openid`, `.../auth/userinfo.email` e `https://www.googleapis.com/auth/gmail.readonly`.
   - **Usuários de teste**: adicione os e-mails que vão usar o app enquanto ele estiver em modo de teste.
4. **Credenciais → Criar credenciais → ID do cliente OAuth** → tipo **Aplicativo da Web**:
   - Origens JavaScript autorizadas: `http://localhost:3000` e `https://SEU-DOMINIO`
   - URIs de redirecionamento autorizados:
     - `http://localhost:3000/api/gmail/callback`
     - `https://SEU-DOMINIO/api/gmail/callback`
     - `https://SEU-PROJETO.supabase.co/auth/v1/callback` (somente se usar "Entrar com Google" no login)
5. Copie **Client ID** → `GOOGLE_CLIENT_ID` e **Client secret** → `GOOGLE_CLIENT_SECRET`.

## Observações importantes

- `gmail.readonly` é um **escopo restrito**. Em modo de teste funciona para até 100 usuários de teste e o refresh token expira em 7 dias (o app detecta e pede reconexão). Para uso público sem limite é preciso enviar o app para **verificação do Google** (inclui avaliação de segurança CASA para escopos restritos).
- O app pede `access_type=offline` + `prompt=consent` para receber o refresh token. Se o Google não enviar o refresh token, remova o acesso em https://myaccount.google.com/permissions e conecte de novo.
- Cota da Gmail API: o cliente já faz backoff exponencial em 429/5xx e respeita `Retry-After`.
