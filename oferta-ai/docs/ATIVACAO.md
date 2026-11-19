# Ativação das integrações reais

O código de todas as integrações está pronto. Abaixo, exatamente o que falta para ativar cada uma. Tudo pode ser configurado pelo `.env` **ou** pelo painel em **Integrações** (credenciais criptografadas no banco). Depois de configurar, clique em **Verificar conexão** — a verificação faz chamadas reais e mostra o erro exato da plataforma se algo falhar.

## Status atual

| Integração | Código | O que falta |
|---|---|---|
| Shopee Affiliate Open API | ✅ pronto | App ID + App Secret aprovados pela Shopee |
| Claude API (IA) | ✅ pronto | API key (opcional: sem ela o Copywriter usa template com dados reais) |
| WhatsApp Cloud API + Groups API | ✅ pronto | Conta Official Business Account (OBA), número na Cloud API, token, grupo criado pela API, consentimento |
| Telegram Bot API | ✅ pronto | Bot token + chat ID + bot como administrador |
| Compartilhamento manual (WhatsApp) | ✅ funciona hoje | — |

## 1. Shopee Affiliate Open API (obrigatória para `DATA_MODE=live`)
1. Ter conta aprovada no Programa de Afiliados Shopee Brasil (affiliate.shopee.com.br).
2. No painel de afiliados, acessar **Open API** e solicitar acesso. Após a aprovação, copiar **App ID** e **Secret**.
3. Preencher `SHOPEE_APP_ID` e `SHOPEE_APP_SECRET` (ou pelo painel).
4. Em **Integrações → Shopee → Verificar conexão**: o sistema executa uma consulta real `productOfferV2` assinada (`SHA256 Credential=…, Timestamp=…, Signature=sha256(AppId+Timestamp+Payload+Secret)`).
5. Mudar `DATA_MODE=live` e reiniciar `api` e `worker`.

> As operações usadas são `productOfferV2` (busca), `generateShortLink` (link de afiliado) e `conversionReport` (comissão reportada). Se a sua conta não tiver permissão para alguma delas, a verificação/sincronização mostrará o erro retornado pela Shopee. Confirme no painel de documentação da Open API os campos disponíveis para a sua conta.

## 2. WhatsApp — o que a via oficial permite
- A **Groups API** da WhatsApp Business Platform envia mensagens apenas para **grupos criados pela própria API**.
- É exigido status **Official Business Account (OBA)**; verificação de empresa não é suficiente. Não funciona com números do app WhatsApp Business.
- Não há endpoint para adicionar membros: as pessoas entram pelo **link de convite** gerado pela API. Há limite reduzido de participantes por grupo — confirme o valor atual na documentação da Meta.
- **O grupo existente (link `chat.whatsapp.com/…`) não pode ser usado pela API.** Para ele, use o canal **Compartilhamento manual**.

Passos para o modo automático oficial:
1. Meta Business Manager → WhatsApp → número registrado na **Cloud API**.
2. Obter status **OBA** para a conta.
3. Criar um **System User** com permissão `whatsapp_business_messaging` e gerar um token permanente → `WHATSAPP_TOKEN`.
4. Copiar o **Phone Number ID** → `WHATSAPP_PHONE_NUMBER_ID`.
5. No painel: **Integrações → WhatsApp → Criar grupo**. O sistema salva o `groupId` e mostra o link de convite.
6. Compartilhar o convite com os membros e **confirmar o consentimento** no painel.
7. **Verificar conexão** (lê o número e o grupo pela Graph API).
8. **Configurações → Canal principal = WhatsApp Cloud API** → **Habilitar publicação automática**.

## 3. Telegram (alternativa 100% automática e oficial)
1. Criar um bot com o **@BotFather** → `TELEGRAM_BOT_TOKEN`.
2. Adicionar o bot como **administrador** do canal ou grupo.
3. Obter o chat ID (ex.: `-100…`) → `TELEGRAM_CHAT_ID`.
4. **Verificar conexão** (getMe + getChat + permissão de administrador) e confirmar o consentimento.
5. **Canal principal = Telegram** → **Habilitar publicação automática**.

## 4. Compartilhamento manual (funciona hoje com o grupo existente)
**Configurações → Canal principal = Compartilhamento manual.** No horário programado, cada oferta aparece na **Central de publicações** com **Copiar mensagem** e **Abrir no WhatsApp** (abre o WhatsApp com o texto pronto para você escolher o grupo). Depois de enviar, clique em **Confirmar envio** para registrar a publicação e contar na meta.

## 5. Claude API (opcional)
`ANTHROPIC_API_KEY` → **Verificar conexão**. Modelo principal `claude-opus-5-5` com fallback de recusa do lado do servidor e cadeia de fallback `claude-sonnet-5-5`, `claude-haiku-5-5`; esforço `low`. Sem chave, o sistema funciona com o template determinístico.

## Checklist para habilitar a publicação automática
- [ ] `DATA_MODE=live`
- [ ] Shopee **Verificada**
- [ ] Canal (WhatsApp Cloud ou Telegram) **Verificado**
- [ ] Consentimento dos participantes confirmado
- [ ] Janela de publicação, meta e limite revisados em Configurações
- [ ] (Recomendado) `PUBLIC_BASE_URL` com HTTPS para contar cliques

O painel recusa a ativação e lista os itens pendentes se qualquer condição não for atendida.
