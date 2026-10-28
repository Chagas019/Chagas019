---
name: security-audit
description: Verifica permissões, segredos expostos, validação de entradas, exposição de dados e riscos comuns (OWASP Top 10) em frontend, backend e configuração de deploy. Use antes de publicar, ao lidar com login, formulários, pagamentos, uploads ou dados pessoais, ou ao revisar código de terceiros.
---

# Security Audit

## Segredos
- Procure chaves e tokens no código e no histórico: `grep -rEi "(api[_-]?key|secret|token|password|sk_live|BEGIN .*PRIVATE)"`.
- Variáveis com prefixo público (`VITE_`, `NEXT_PUBLIC_`) vão para o navegador: só coloque o que pode ser público.
- `.env*` no `.gitignore`. Se um segredo vazou, ele precisa ser revogado e trocado (apagar o commit não basta).

## Entradas e saídas
- Valide no servidor toda entrada (tipo, tamanho, formato). Validação no cliente é só conveniência.
- XSS: evite `dangerouslySetInnerHTML`/`innerHTML`; se necessário, sanitize (DOMPurify).
- SQL/NoSQL injection: consultas parametrizadas ou ORM; nunca concatene entrada em consulta.
- Uploads: limite tipo e tamanho, renomeie, armazene fora da raiz pública e não execute.
- Links externos com `rel="noopener noreferrer"`; valide URLs de redirecionamento.

## Autenticação e autorização
- Verifique o dono do recurso em cada requisição (IDOR).
- Senhas com hash forte (bcrypt/argon2) via biblioteca; rate limit e bloqueio no login.
- Cookies `HttpOnly; Secure; SameSite`; proteção CSRF quando usar cookies.
- Banco: RLS/políticas ativas; chave de serviço nunca no cliente.

## Exposição de dados
- APIs retornam só os campos necessários (sem hash de senha, e-mail de outros, IDs internos).
- Mensagens de erro genéricas para o cliente; detalhes só nos logs.
- Logs sem senhas, tokens ou dados pessoais completos (LGPD).

## Configuração
- HTTPS, cabeçalhos: `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `frame-ancestors`/`X-Frame-Options`.
- CORS restrito às origens necessárias (nada de `*` com credenciais).
- Dependências: `npm audit` e atualização das vulneráveis.

## Entregável
Liste os achados por severidade (crítico, alto, médio, baixo), com arquivo e linha, o risco concreto e a correção. Corrija primeiro os críticos.
