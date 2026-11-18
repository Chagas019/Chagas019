# Paróquia360 — app

Next.js 15.5 (App Router, TypeScript) + Supabase (Auth por link no e-mail, Postgres com RLS).

## Rodar
```bash
cp .env.example .env.local   # URL e chave publicável do projeto paroquia360
npm install
npm run dev                  # http://localhost:3000
```

## Telas
- `/entrar` login por link no e-mail · `/comecar` cadastrar paróquia · `/convite/[token]` aceitar convite
- `/p/[slug]` painel · `/agenda` · `/escalas` · `/equipe` (pastorais, funções, pessoas, convites, perfil)

Toda autorização é feita pelo banco (RLS); o app só esconde botões que a pessoa não pode usar.

## Teste ponta a ponta
`e2e/fluxo.mjs` roda contra o Supabase real com usuários fictícios (`*@exemplo.invalid`) com senha
(criados só para teste). Com o app em `localhost:3100`:
```bash
ADMIN=admin2.teste@exemplo.invalid PW=<senha> node e2e/fluxo.mjs
```
Neste container é preciso `NODE_USE_ENV_PROXY=1` (proxy de rede) no app e no teste.
