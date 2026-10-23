# Arquitetura do NEXUS Cloud Gaming

Este documento descreve a arquitetura-alvo. O que já existe está marcado com ✅; o resto é projeto.

## Visão geral

```
 Celular / navegador (PWA)                    Plano de controle                         Plano de execução
┌───────────────────────────┐  HTTPS   ┌──────────────────────────────┐        ┌────────────────────────────────┐
│ apps/web (Next.js) ✅      │ ───────► │ Proxy reverso (Caddy) TLS    │        │ Nó de jogo (Linux + GPU)        │
│ • catálogo, biblioteca ✅   │          │  ├─ web (Next.js) ✅          │  gRPC/ │ • agente do nó (recebe ordens  │
│ • Gamepad API, toque ✅     │          │  ├─ api (Node, Fase 3)        │  mTLS  │   assinadas, nunca comandos do │
│ • medição de conexão ✅     │  WSS     │  │   auth, catálogo, sessões  │ ─────► │   usuário)                      │
│ • player WebRTC (Fase 4)   │ ───────► │  ├─ signaling WebSocket (F4)  │        │ • jogo em contêiner isolado    │
└────────────┬──────────────┘          │  └─ gerenciador de sessões    │        │ • captura + NVENC + WebRTC     │
             │  WebRTC (UDP/DTLS-SRTP)  │ PostgreSQL · Redis           │        └──────────────┬─────────────────┘
             └──────────────────────────┴── STUN/TURN (coturn) ────────┴───────────────────────┘
```

Separação obrigatória: **site**, **API**, **gerenciador de sessões** e **nós de execução** são processos distintos. O navegador só fala com a API e com o canal WebRTC; nunca com o agente do nó.

## Componentes

### A. Frontend — `apps/web` ✅
Next.js 16 (App Router), React 19, TypeScript estrito, Tailwind CSS 4, PWA (manifesto + service worker próprio). Regras de domínio vêm de `@nexus/core`, sem duplicação.

### B. Backend — `apps/api` (Fase 3)
- Node.js 22 + Fastify, validação de entrada com Zod, PostgreSQL (dados duráveis), Redis (sessões temporárias, filas, limites de taxa, presença de nós).
- Autenticação: cookie de sessão `HttpOnly; Secure; SameSite=Lax`, senha com **Argon2id**, verificação de e-mail e recuperação por token de uso único com expiração, proteção CSRF (token sincronizado) nas rotas que mudam estado, limitação de requisições por IP e por conta.
- Autorização no servidor em toda rota (papel `user`/`admin`); o painel admin é protegido pela API, não por esconder botões.
- WebSocket autenticado para sinalização e eventos de sessão.
- Logs estruturados (pino) sem dados pessoais desnecessários; métricas Prometheus.

Esquema inicial (resumo): `users`, `email_tokens`, `sessions_auth`, `devices`, `games`, `platforms`, `providers`, `library_items`, `favorites`, `play_sessions`, `session_metrics`, `queue_entries`, `nodes`, `audit_log`.

### C. Streaming (Fase 4)
- **WebRTC** para vídeo/áudio (servidor → cliente) e um **DataChannel** para entrada (cliente → servidor), com eventos tipados (`button`, `axis`, `touch`) validados no nó. Nada de comandos arbitrários.
- **STUN/TURN**: coturn com credenciais temporárias (REST API do TURN, validade curta) emitidas pela API.
- **Codificação**: NVENC (NVIDIA) ou VAAPI (Intel/AMD) quando houver GPU; x264 em CPU apenas para testes.
- **Bitrate adaptativo**: controle de congestionamento do WebRTC (GCC) + ajuste de resolução/fps pelo nó a partir das estatísticas `getStats()` (RTT, jitter, perda). A classificação e a recomendação de qualidade já existem em `@nexus/core/network` ✅.
- **Métricas**: RTT, jitter, perda de pacotes, quadros decodificados/descartados, latência estimada glass-to-glass (medida com marcador visual na Fase 4).

Alternativas avaliadas para a prova de conceito:

| Opção | Prós | Contras | Uso sugerido |
|---|---|---|---|
| **Selkies-GStreamer** | WebRTC no navegador, NVENC/VAAPI, entrada de teclado/mouse/gamepad, código aberto | Pensado para desktop remoto; exige ajuste para jogos | **Primeira escolha para a POC** |
| GStreamer `webrtcbin` próprio | Controle total do pipeline | Mais trabalho de engenharia | Evolução após a POC |
| Neko (m1k1o/neko) | Sobe rápido em Docker | Foco em navegador compartilhado; latência maior | Teste rápido de pipeline |
| Sunshine + Moonlight | Excelente latência | Moonlight não roda no navegador | Fora do escopo web |
| WebTransport / WebCodecs | Latência potencialmente menor | Suporte desigual no Safari | Reavaliar depois |

### D. Execução dos jogos (Fases 4–6)
- Nós Linux com GPU; jogos em contêineres com usuário sem privilégios, sistema de arquivos somente leitura + volume temporário por sessão, sem rede de saída (exceto o necessário), limites de CPU/memória/GPU (cgroups) e duração máxima.
- Para isolamento mais forte entre usuários: uma VM leve (Firecracker/Kata) ou uma GPU por sessão (MIG/vGPU quando disponível).
- **Consoles não rodam em contêineres.** PlayStation/Xbox só por serviços oficiais. Emulação fica fora do produto até haver análise jurídica por título; o NEXUS nunca distribui ROMs, ISOs ou BIOS.

### E. Infraestrutura (Fases 6–8)
Docker Compose para desenvolvimento ✅ (arquivo pronto). Kubernetes só quando houver mais de um nó de jogo. Caddy como proxy com HTTPS automático e HSTS. Prometheus + Grafana + Alertmanager (CPU, memória, GPU via DCGM exporter, rede, disco). Backups diários do PostgreSQL com teste de restauração. Segredos em variáveis de ambiente injetadas pelo orquestrador ou em cofre (SOPS/Vault), nunca no Git.

## Gerenciador de sessões (projeto, Fase 3–4)

Máquina de estados de uma sessão:

```
solicitada → autorizada → (na_fila) → reservada → iniciando → conectando → ativa ⇄ reconectando → encerrando → encerrada
                     └────────────── negada / falhou ──────────────────────────────────────────────────┘
```

1. **Autenticação**: cookie válido; senão 401.
2. **Permissão**: plano do usuário + licença/provedor do jogo + `availability = operacional`; senão 403. É a mesma regra de `callToAction` ✅.
3. **Limites**: sessões simultâneas por conta e por dispositivo (Redis, operação atômica).
4. **Capacidade**: consulta nós saudáveis compatíveis (GPU, região, jogo instalado). Sem capacidade → **fila** (Redis sorted set por prioridade do plano + horário), com posição e tempo estimado via WebSocket.
5. **Reserva**: lock com expiração (ex.: 60 s) para evitar dupla alocação.
6. **Inicialização**: a API envia ao agente do nó uma ordem assinada (`start {game, session_id, limits}`); o agente só aceita jogos de uma lista local.
7. **Sinalização WebRTC** via WebSocket; credenciais TURN temporárias.
8. **Acompanhamento**: estatísticas a cada 2 s; qualidade adaptativa; heartbeat do cliente.
9. **Reconexão**: queda curta (≤ 60 s) mantém a sessão em `reconectando`, com backoff exponencial no cliente (`backoffDelay` ✅).
10. **Encerramento**: por usuário, inatividade (sem entrada por N minutos, com aviso), tempo máximo do plano ou admin. Libera recursos, grava métricas e duração.

## Limitações reais do iPhone (Safari)

| Recurso | Situação | Consequência no NEXUS |
|---|---|---|
| WebRTC | Suportado; decodificação H.264 por hardware | H.264 como codec base |
| Gamepad API | Suportada para controles reconhecidos pelo iOS (Xbox, DualShock 4, DualSense, MFi) | Genéricos podem não aparecer |
| Tela cheia de elemento | **Não no iPhone** (só vídeo via `webkitEnterFullscreen`); disponível no iPad | Orientamos a instalar como PWA para esconder as barras |
| Bloqueio de orientação | Indisponível | Aviso para girar o aparelho |
| Vibração (`navigator.vibrate`) | Indisponível | Opção desativada sem erro |
| Vibração do controle | Não exposta | Botão só aparece quando suportado |
| Áudio automático | Exige gesto do usuário | O player inicia o áudio no toque em "Jogar" |
| Pointer Lock | Indisponível | Jogos de mouse ficam fora do celular |

Tudo isso é detectado em tempo de execução pela página **Servidores → Recursos do navegador** ✅, sem adivinhar pelo user-agent. Validação em aparelho real é pendência da Fase 4.

## Custos estimados (faixas para planejamento — confirmar no provedor antes de contratar)

| Item | Faixa mensal | Observação |
|---|---|---|
| Site + API + PostgreSQL + Redis (VPS 4 vCPU/8 GB) | US$ 20 – 60 | Um servidor basta até milhares de usuários de catálogo |
| TURN (coturn) | US$ 10 – 40 + tráfego | Só uma parte das sessões precisa de TURN |
| Nó de jogo com GPU dedicada (aluguel mensal) | ~US$ 150 – 400 por nó | Ex.: servidores dedicados com GPU de entrada; ~1–4 sessões 1080p60 dependendo do jogo |
| Nó de jogo com GPU sob demanda (nuvem pública) | ~US$ 0,50 – 1,50 por hora de GPU | Regiões no Brasil costumam ser mais caras que nos EUA |
| Tráfego de vídeo | 1080p60 ≈ 10–20 Mbps ≈ 4,5–9 GB por hora de sessão | Custo de saída varia muito por provedor |
| Monitoramento, backups, domínio | US$ 10 – 30 | |

Conclusão: o custo dominante é **GPU por hora de sessão** + **tráfego**. Os preços dos planos só devem ser definidos depois de medir sessões por GPU na Fase 4.
