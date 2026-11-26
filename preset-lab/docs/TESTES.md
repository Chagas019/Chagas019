# Relatório de testes

Executado em 26/11/2026, Node 22, PostgreSQL 16, Chromium (Playwright 1.63).

| Suíte | Comando | Resultado |
|---|---|---|
| TypeScript | `npm run typecheck` | ✅ sem erros |
| Unitários + integração (Vitest) | `npm test` | ✅ 27/27 |
| Banco: migrations, seed, RLS e regras (PostgreSQL real) | `npm run test:sql` | ✅ 40/40 asserções |
| Ponta a ponta (Playwright, build de produção em modo demo) | `npm run test:e2e` | ✅ 25/25 (desktop + Pixel 7) |

## O que é coberto

**Vitest** (`tests/unit`)
- Decisão de acesso para todos os modos (free, purchase_or_subscription, purchase_only, subscription_only, rascunho, admin).
- Filtros, busca sem acento, ordenação e validação dos parâmetros da URL.
- Assinatura do webhook do Mercado Pago: válida, id trocado, ausente, adulterada e replay (timestamp antigo).
- Tokens de download local: válido, forjado, adulterado, expirado; bloqueio de path traversal.
- Hash de senha (scrypt) e proteção contra open redirect.
- Checkout + downloads integrados: preço do servidor, reaproveitamento de pedido pendente (clique duplo), idempotência da confirmação, compra alheia, gratuito/exclusivo não vendáveis, assinatura libera exclusivos mas não `purchase_only`, renovação soma período, coleção libera seus itens, pagamento recusado não libera, dashboard separa vendas simuladas da receita.

**SQL** (`supabase/tests/rls.test.sql`, rodado num PostgreSQL com shim do Supabase)
- anon só vê publicados; não lê arquivos nem perfis; não cria favoritos.
- usuário só lê o próprio perfil/compras/assinaturas; não cria compras; não se promove a admin; não altera e-mail; não executa `fulfill_purchase` nem lê estatísticas.
- `fulfill_purchase`: confirma, ignora evento repetido, não paga duas vezes; libera por coleção e por assinatura; renovação soma período.
- `can_access_product` para todos os modos, assinatura vencida, `purchase_only`.
- admin vê rascunhos, edita produtos, promove usuários e não remove o próprio acesso.
- restrições: gratuito sem preço, premium à venda com preço; rate limit bloqueia após o limite.

**Playwright** (`tests/e2e`)
- Navegação principal, home com dados do banco, sem erros de JavaScript.
- Filtros (gratuito/premium/categoria), busca, estado vazio e ordenação.
- Página do preset: comparador por teclado e toque, painel de acesso bloqueado sem login.
- Download: POST sem login → login; GET recusado (405); token forjado → 403.
- Cadastro com validação → e-mail de confirmação → confirmação → logout → senha errada → login.
- Download gratuito real (arquivo .xmp/.zip) e histórico de downloads.
- Favoritos persistem.
- Premium: bloqueado → compra (checkout simulado identificado) → confirmado → biblioteca → download real.
- Exclusivo do Club: sem botão de compra; assinatura libera; página de assinatura mostra validade.
- Rate limit de login por IP.
- Usuário comum não entra no Admin Studio; upload do admin exige admin.
- Admin Studio: dashboard, criar produto premium com preço, enviar arquivo .xmp, ver no marketplace, excluir.
- Mobile: sem rolagem horizontal em 8 páginas, menu móvel, comparador por toque.

Além disso, os agentes de frontend validaram manualmente (Playwright) recuperação de senha, perfil, compras recusadas/renovação, uploads de imagem e arquivos inválidos, coleções, banners, categorias e promoção de usuários.

## Não testado (depende de credenciais externas)
- Supabase real (Auth, PostgREST, Storage, URLs assinadas). O SQL foi validado num PostgreSQL local com shim; o código do adaptador Supabase só passou pelo typecheck.
- Mercado Pago real (criação de preferência, webhook real, PIX). A verificação da assinatura e a idempotência estão cobertas; a chamada HTTP à API não.
