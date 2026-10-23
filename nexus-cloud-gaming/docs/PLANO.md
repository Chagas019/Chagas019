# Plano de execução

| Fase | Escopo | Estado | Critério de pronto |
|---|---|---|---|
| 1 — Auditoria | Ambiente, repositórios, ferramentas, limitações | ✅ Concluída | `docs/AUDITORIA.md` |
| 2 — Interface | Frontend completo, responsivo, PWA, dados demonstrativos identificados | ✅ Concluída | Build de produção, 24 testes de domínio e 40 E2E passando |
| 3 — Backend | `apps/api`: PostgreSQL, Redis, autenticação, catálogo no banco, favoritos/histórico na conta, painel admin com autorização no servidor | Próxima | Testes de cadastro, login, autorização, admin, segurança da API |
| 4 — Streaming POC | Um nó com GPU, Selkies/GStreamer + WebRTC, SuperTuxKart em contêiner, player no frontend, métricas reais | Pendente (precisa de GPU) | Latência medida em Android e iPhone reais, documentada |
| 5 — Integração de jogos | Mais títulos livres validados um a um; login Steam (OpenID) só para identificar a conta; links oficiais | Pendente | Cada título com licença revisada e teste de sessão |
| 6 — Infraestrutura | Agente do nó, isolamento, limites, monitoramento GPU, alertas | Pendente | Painel com métricas reais e alertas testados |
| 7 — Segurança e testes | Testes de carga (k6), testes de rede degradada, revisão de segurança, WebKit/Safari | Pendente | Relatório de carga antes de abrir ao público |
| 8 — Publicação | Domínio, HTTPS, CSP com nonce, backups, variáveis de produção | Pendente | Checklist de implantação cumprido |

## Próximo passo recomendado

Fase 3 em `apps/api`: Fastify + PostgreSQL + Redis, cadastro/login com Argon2id e cookies seguros, migração do catálogo de `@nexus/core` para o banco (mantendo o pacote como fonte dos tipos e regras), e o painel administrativo protegido no servidor. Em paralelo, decidir onde rodará o nó com GPU da Fase 4.
