# KOINONIA

**Talentos unidos. Uma só missão.** — plataforma global e gratuita de colaboração entre paróquias, comunidades, movimentos católicos e voluntários.

- Arquitetura: [`docs/02-arquitetura.md`](docs/02-arquitetura.md)
- Banco de dados e regras: [`docs/03-banco-de-dados.md`](docs/03-banco-de-dados.md)
- Segurança: [`docs/04-seguranca.md`](docs/04-seguranca.md)
- Design System: [`docs/05-design-system.md`](docs/05-design-system.md) · rota `/design-system`
- Status por fase: [`docs/06-roadmap.md`](docs/06-roadmap.md)
- Execução local e deploy: [`docs/07-deploy.md`](docs/07-deploy.md)

```bash
npm install && cp .env.example .env.local && npm run dev
npm run check      # lint + tipos + testes unitários + build
npm run test:db    # migrations + RLS num PostgreSQL 16 temporário
npm run test:e2e   # Playwright (desktop, tablet, mobile) + axe
```
