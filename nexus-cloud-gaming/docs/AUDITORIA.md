# Fase 1 — Auditoria técnica do ambiente

Data: 23/10/2026. Ambiente: sessão de desenvolvimento em nuvem do Claude Code (contêiner Linux efêmero).

## Repositórios encontrados

| Repositório | Conteúdo existente | Decisão |
|---|---|---|
| `chagas019/chagas019` | Site estático da Comunica+Fé (`index.html`, `site/`), subprojeto `brabo-club/` (Vercel), skills de design em `.claude/skills`, workflows manuais (`workflow_dispatch`) | **Recebe o NEXUS** em `nexus-cloud-gaming/`, isolado. Já abriga subprojetos; nada existente foi alterado. |
| `chagas019/rfff` | GRID F1 (React + Vite), publicado na Vercel | Não tocado. Colocar o NEXUS ali faria o `vitest` e o build da Vercel do GRID F1 pegarem arquivos novos. |

Nenhum dos dois tinha código de cloud gaming. O projeto começa do zero.

## Sistema e ferramentas

| Item | Encontrado | Impacto |
|---|---|---|
| SO | Ubuntu 24.04.5 LTS, kernel 6.18, x86_64 | OK |
| CPU / RAM / disco | 4 vCPUs, 15 GiB, ~30 GiB livres | Suficiente para web, API, banco e testes |
| **GPU** | **Nenhuma** (`nvidia-smi` ausente) | Sem codificação de vídeo por hardware aqui. Streaming real exige máquina com GPU (Fase 4). |
| Node.js / npm / pnpm | 22.22.0 / 10.9.4 / 10.28.0 | OK |
| PostgreSQL | 16.15 (cliente e servidor instalados) | Usado na Fase 3 |
| Redis | 7.0.15 | Usado na Fase 3 |
| Docker | CLI 29.9.1, **sem daemon** | `docker compose` não pode ser executado nesta sessão; arquivos foram escritos, mas não testados aqui. |
| ffmpeg | 6.1.1 (codificação por software) | Útil para um protótipo de pipeline em CPU (x264) |
| Navegador de teste | Chromium (Playwright) em `/opt/pw-browsers` | E2E em Chromium. **Não há WebKit**: Safari não pode ser testado aqui. |
| Rede | Saída HTTPS via proxy; registro npm e Google Fonts acessíveis | Fontes empacotadas via `@fontsource` (sem depender de CDN). |

## Skills e integrações disponíveis (verificadas)

Usadas neste trabalho:
- `ui-ux-pro-max` (instalada no repositório): gerou a direção do sistema visual (estilo 3D/hiper-realista para jogos, Chakra Petch como fonte de exibição, checklist de acessibilidade). A paleta sugerida (roxo + rosa) foi ajustada para o briefing: preto/azul-marinho com azul e violeta.

Disponíveis, não necessárias nesta fase: skills de design (`design`, `brand`, `design-system`, `ui-styling`), `engineering:*` (arquitetura, testes, revisão), conectores Vercel, Figma, GitHub. Falharam ao conectar nesta sessão: vários plugins (Datadog exige autorização; outros com erro de proxy). Nenhuma integração de jogos, Steam ou provedores de GPU está disponível como ferramenta.

## Limitações identificadas

1. **Hardware:** sem GPU, sem codificador NVENC/VAAPI. A Fase 4 precisa de uma máquina com GPU (nuvem ou própria).
2. **Contêiner efêmero:** nada persiste fora do Git. Banco e serviços sobem só durante a sessão.
3. **Safari/iPhone:** não testável aqui. A suíte já tem o projeto `webkit-iphone` (ativado com `PW_WEBKIT=1`) para rodar onde o WebKit estiver instalado, e a validação final precisa de iPhone real.
4. **Credenciais:** nenhuma chave de Steam, provedor de nuvem, e-mail transacional ou pagamento foi fornecida — e nenhuma foi inventada.
5. **Orçamento e conectividade do usuário final:** desconhecidos. As estimativas de custo em `ARQUITETURA.md` são faixas a confirmar.
6. **Legal:** consoles não podem ser executados pelo NEXUS (licença e hardware). O catálogo usa só jogos de código aberto e links para serviços oficiais.
