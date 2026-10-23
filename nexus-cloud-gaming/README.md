# NEXUS CLOUD GAMING

**Seu universo gamer. Em qualquer tela.**

Plataforma web de jogos na nuvem, mobile-first, pensada para jogar pelo navegador do celular com controle Bluetooth ou toque.

> **Estado: Fase 2 concluída (interface).** O site, o catálogo, a biblioteca local, o teste de controle, a sala de teste e o diagnóstico funcionam de verdade. **Nenhum jogo é transmitido ainda**: não há servidor de jogo com GPU. Títulos sem integração aparecem como "Em breve", nunca com um botão "Jogar" falso. Detalhes em [`/transparencia`](apps/web/src/app/transparencia/page.tsx) e em [docs/PLANO.md](docs/PLANO.md).

## Estrutura

```
nexus-cloud-gaming/
├── packages/core/        # Domínio sem framework: tipos, catálogo, regras de disponibilidade,
│                         # busca/filtros, mapeamento de controle, rede/reconexão, preferências
├── apps/web/             # Next.js 16 + React 19 + Tailwind 4 (PWA)
│   ├── src/app/          # Rotas (App Router)
│   ├── src/components/   # Componentes de interface
│   ├── src/lib/          # Hooks do cliente: armazenamento local, Gamepad API, conexão
│   ├── public/           # Ícones e service worker
│   └── e2e/              # Testes Playwright
├── docs/                 # AUDITORIA, ARQUITETURA, PLANO
├── docker-compose.yml
└── .env.example
```

## Requisitos

- Node.js 22+ e npm 10+
- Para E2E: navegadores do Playwright (`npx playwright install chromium`, opcionalmente `webkit`)
- Docker (opcional)

## Executar

```bash
cd nexus-cloud-gaming
npm install
npm run dev          # http://localhost:3000 (desenvolvimento)

npm run build        # build de produção
npm start            # serve o build em http://localhost:3000
```

Para testar no celular na mesma rede: `npm run build && npx -w @nexus/web next start -H 0.0.0.0` e abra `http://IP-DO-COMPUTADOR:3000`. O service worker, a instalação como app e algumas APIs (Wake Lock, Gamepad em alguns navegadores) exigem HTTPS fora de `localhost`; use um túnel HTTPS ou o proxy da Fase 8.

### Docker

```bash
cp .env.example .env
docker compose up --build                 # site em http://localhost:3000
docker compose --profile fase3 up -d      # + PostgreSQL e Redis (preparação da Fase 3)
```

> O Docker não pôde ser executado no ambiente em que este código foi escrito (sem daemon). O build standalone usado pela imagem foi testado diretamente com Node; a imagem em si ainda precisa ser validada.

## Testes

```bash
npm run typecheck    # TypeScript estrito nos dois pacotes
npm test             # 24 testes de domínio (Vitest)
npm run build && npm run test:e2e   # 20 cenários × 2 projetos = 40 testes E2E (Playwright)
```

Com Chromium do sistema: `PW_CHROMIUM_PATH=/caminho/do/chrome npm run test:e2e`. Para incluir o motor do Safari: `npx -w @nexus/web playwright install webkit` e `PW_WEBKIT=1 npm run test:e2e` (a CI faz isso).

O que os testes cobrem: catálogo, pesquisa sem acento, filtros e validação de URL, regra do botão "Jogar", plataformas sem acesso legítimo, favoritos e histórico, armazenamento corrompido, controle (Gamepad API com controle virtual injetado), remapeamento salvo, sala de teste, preferências, reconexão quando o servidor cai, ausência de rolagem horizontal, cabeçalhos de segurança, manifesto do PWA e recusa de comandos na API.

## O que funciona de verdade

| Recurso | Como |
|---|---|
| Catálogo, pesquisa e filtros compartilháveis por URL | `@nexus/core/search` |
| Favoritos, histórico, preferências | `localStorage` validado (só no aparelho) |
| Controle Bluetooth: detecção, botões, analógicos, vibração, remapeamento | Gamepad API |
| Sala de teste: tela cheia (quando suportada), orientação, toque multi-dedo, teclado, Wake Lock | APIs do navegador |
| Latência até o servidor web e reconexão com backoff | `/api/health` |
| Diagnóstico do aparelho (WebRTC, codecs, tela, PWA…) | Detecção em tempo de execução |
| PWA instalável e modo offline para páginas visitadas | Manifesto + `public/sw.js` |
| Cabeçalhos de segurança (CSP, frame-ancestors, nosniff, Permissions-Policy) | `next.config.ts` |

## Demonstrativo

- Jogos: títulos reais de **código aberto** (licenças GPL/LGPL), escolhidos porque podem ser executados e transmitidos legalmente. Nenhum roda ainda. Campos que exigem medição ou órgão oficial (classificação indicativa, requisitos, qualidade máxima, tempo de inicialização) aparecem como "A confirmar".
- Capas: arte gerada pelo próprio site (gradiente + ícone), sem imagens de terceiros.
- Regiões de servidor e planos: plano de implantação, sem capacidade nem preços.

## Pendente (depende de hardware, licenças ou credenciais)

- **Contas, API, banco, fila, painel admin** — Fase 3 (sem dependência externa além de um servidor SMTP).
- **Streaming WebRTC** — Fase 4, precisa de uma máquina com **GPU**.
- **Steam** — login oficial via OpenID e chave da Steam Web API (Fase 5). Senhas da Steam nunca são pedidas.
- **Consoles** — apenas links para serviços oficiais (PlayStation Plus Premium, Xbox Cloud Gaming). Nintendo: sem acesso legítimo no navegador. O NEXUS não emula consoles nem distribui ROMs, ISOs ou BIOS.
- **Pagamentos** — provedor e preços a definir.

## Limitações conhecidas

- Safari/iPhone não foi testado em aparelho real; a CI roda o motor WebKit, mas a validação final exige iPhone. No iPhone não há tela cheia para elementos (só para vídeo), bloqueio de orientação nem vibração pelo navegador — ver [docs/ARQUITETURA.md](docs/ARQUITETURA.md#limitações-reais-do-iphone-safari).
- A latência medida é até o servidor web, não até um servidor de jogo.
- CSP usa `'unsafe-inline'` para scripts por causa da hidratação do Next.js; troca por nonce prevista na Fase 8.
- Sem contas, favoritos e histórico não acompanham o usuário entre aparelhos.

## Custos

Faixas estimadas em [docs/ARQUITETURA.md](docs/ARQUITETURA.md#custos-estimados-faixas-para-planejamento--confirmar-no-provedor-antes-de-contratar). O custo dominante será GPU por hora de sessão e tráfego de vídeo (~4,5–9 GB por hora em 1080p60).

## Direitos e privacidade

Marcas citadas pertencem aos seus donos; o NEXUS não é afiliado a Sony, Microsoft, Nintendo, Valve ou NVIDIA. Nesta fase nenhum dado pessoal é coletado (LGPD): tudo fica no aparelho do usuário.
