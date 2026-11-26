# Publicar na Vercel

## 1. Projeto
1. Importe o repositório na Vercel e defina **Root Directory = `preset-lab`** (framework Next.js detectado automaticamente).
2. Node.js 20 ou 22.

## 2. Variáveis de ambiente (Production)

| Variável | Obrigatória | Observação |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | sim | `https://seu-dominio.com.br` (sem barra final) |
| `NEXT_PUBLIC_SUPABASE_URL` | sim | Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | sim | Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | sim | **somente servidor** — nunca com prefixo `NEXT_PUBLIC_` |
| `MP_ACCESS_TOKEN` | sim | Mercado Pago → Suas integrações → Credenciais de produção |
| `MP_WEBHOOK_SECRET` | sim | Mercado Pago → Webhooks → Assinatura secreta |
| `APP_SECRET` | recomendado | `openssl rand -hex 32` |

Não defina `DATA_BACKEND=local`, `PAYMENTS_PROVIDER=dev` nem `ALLOW_LOCAL_DEMO` em produção — o app **se recusa a rodar** com modo local ou checkout simulado em `NODE_ENV=production`.

Em Preview, use credenciais de **teste** do Mercado Pago e, de preferência, um projeto Supabase separado.

## 3. Mercado Pago
1. Crie uma aplicação em *Suas integrações* (produto: Checkout Pro).
2. **Webhooks → Configurar notificações**: URL `https://seu-dominio.com.br/api/webhooks/mercadopago`, evento **Pagamentos**. Copie a *assinatura secreta* para `MP_WEBHOOK_SECRET`.
3. PIX: habilite uma chave PIX na conta do vendedor — o Checkout Pro passa a oferecê-lo automaticamente.
4. Teste com usuários de teste (comprador/vendedor) antes de usar credenciais de produção.

Fluxo: botão “Comprar” → server action cria o pedido `pending` (preço do banco) → preferência no Mercado Pago (`external_reference` = id do pedido, chave de idempotência) → usuário paga → webhook assinado → servidor consulta `GET /v1/payments/:id`, confere valor/moeda/referência → `fulfill_purchase` libera. A página `/checkout/retorno` só mostra o status; ela nunca libera nada.

## 4. Depois do deploy
- [ ] Supabase: migrations aplicadas, Site URL/Redirect URLs e templates de e-mail configurados, SMTP próprio.
- [ ] Criar sua conta e promover a admin (docs/SUPABASE.md §5).
- [ ] Cadastrar produtos reais no Admin Studio (ou remover os de demonstração).
- [ ] Fazer uma compra real de valor baixo e conferir: pedido “Pago”, item na biblioteca, download, receita no dashboard.
- [ ] Revisar textos legais (termos de uso, política de privacidade, reembolso) — não fazem parte deste escopo.
