---
name: backend-api-design
description: Desenha APIs com validações, integração com banco de dados, autenticação, autorização e tratamento de erros consistente. Use ao criar endpoints, rotas serverless, integrações com serviços externos ou ao revisar um backend.
---

# Backend & API Design

## Contrato primeiro
- Defina recursos, rotas, métodos, entrada, saída e erros antes de implementar.
- REST: substantivos no plural (`/users/:id/orders`), métodos HTTP corretos e status certos (200, 201, 204, 400, 401, 403, 404, 409, 422, 429, 500).
- Respostas consistentes: `{ data }` no sucesso e `{ error: { code, message, details? } }` no erro.
- Paginação (cursor ou `limit/offset`), filtros e ordenação documentados.
- Versione quando houver clientes externos (`/v1`).

## Validação
- Valide toda entrada na borda (body, query, params, headers) com schema (Zod, Valibot, Joi).
- Rejeite campos desconhecidos; normalize (trim, lowercase em e-mail).
- Nunca confie em dado do cliente para preço, permissão ou ID de dono.

## Autenticação e autorização
- Use um provedor ou biblioteca consolidada; não invente criptografia.
- Sessão em cookie `HttpOnly; Secure; SameSite` ou token de curta duração com refresh.
- Autorização em todo endpoint: o usuário pode acessar **este** recurso? (evite IDOR).

## Erros
- Erros esperados → 4xx com mensagem útil. Inesperados → 500 genérico para o cliente + log detalhado no servidor.
- Nunca vaze stack trace, SQL ou segredos na resposta.
- Timeouts e retries com backoff em chamadas externas; idempotência em operações de pagamento e criação.

## Operação
- Rate limiting em login, formulários e endpoints caros.
- Logs estruturados com ID de requisição; sem dados sensíveis nos logs.
- Segredos em variáveis de ambiente, nunca no código nem no frontend.
- Testes de integração para os fluxos principais e os casos de erro.
