# Estúdio Motion — 10 agentes + Remotion

Estúdio de motion design multiagente sobre **Remotion 4.0.544 + React 19**, 60 FPS, H.264.
Os agentes são **subagentes nativos do Claude Code** (`.claude/agents/motion-*.md`), coordenados pela skill **`/motion-studio`** (`.claude/skills/motion-studio/SKILL.md`).

## Começo rápido

```bash
cd motion-studio
npm install              # só na primeira vez
npm run studio           # Remotion Studio em http://localhost:3000
```

No Claude Code, a partir da raiz do repositório:

```
/motion-studio Quero um reels vertical de 15s sobre <tema>. Narração: <texto ou caminho do áudio>.
```

## Os 10 agentes

| # | Agente | Chamar com | Função |
|---|---|---|---|
| 01 | VOZ | `motion-voz` | Transcrição, tempo por palavra, pausas, impactos, organização da narração |
| 02 | CENAS | `motion-cenas` | Divisão em cenas, duração, storyboard, transições, narrativa |
| 03 | PERSONAGENS | `motion-personagens` | Personagens 2D/3D, entradas/saídas, flutuação, quique, sombra, profundidade |
| 04 | TEXTO | `motion-texto` | Tipografia cinética, títulos, legendas sincronizadas, hierarquia, legibilidade |
| 05 | PEÇAS | `motion-pecas` | Celulares, notificações, dashboards, cards, UI em React reutilizável |
| 06 | MOVIMENTO | `motion-movimento` | Curvas, easing, springs, whip, parallax, câmera |
| 07 | COR | `motion-cor` | Paletas, gradientes, contraste, grão, vinheta, consistência |
| 08 | SOM | `motion-som` | SFX, sincronia, volumes, mixagem com ducking, QA de áudio |
| 09 | CÓDIGO | `motion-codigo` | Composições, integração, timelines, performance, correção de erros |
| 10 | REVISÃO | `motion-revisao` | Análise de frames, QA, pedidos de correção, aprovação |

Chamar um agente diretamente: *"use o agente motion-texto para aumentar o título da cena 2 do projeto demo"*, ou `@motion-texto ...`.

## Fluxo

```
VOZ → CENAS → [PERSONAGENS | TEXTO | PEÇAS | MOVIMENTO | COR | SOM] → CÓDIGO → REVISÃO ⟲ correções → aprovação humana → render
```

## Comandos

| Comando | O que faz |
|---|---|
| `npm run studio` | Abre o Remotion Studio (preview) |
| `npm run typecheck` | TypeScript estrito |
| `npm run qa` | QA estático: Math.random, timers, CSS animation, assets ausentes |
| `npm run compositions` | Lista composições registradas |
| `npm run review -- <Id> [f1,f2,...]` | Renderiza **stills** de revisão + folha de contato em `render/revisao/<Id>/` |
| `npm run sfx` | Regera os SFX base (determinístico) |
| `npm run render -- <Id>` | Render final H.264, **bloqueado** sem `aprovacoes/<Id>.aprovado` |

## Pedir revisões

- Completa: *"/motion-studio revise o projeto demo"* → REVISÃO gera `projetos/<slug>/revisao-N.md` com problemas por frame, severidade e agente responsável; o coordenador despacha as correções.
- Pontual: *"use o motion-revisao para checar só a cena 2 do Demo-Horizontal"*.

## Aprovar e renderizar

1. Revise no Studio e na folha de contato.
2. Diga ao Claude "aprovado" (ele cria `aprovacoes/<Id>.aprovado`) ou crie o arquivo você mesmo.
3. `npm run render -- Demo-Vertical` → `render/saida/Demo-Vertical.mp4`.

## Estrutura

```
.claude/agents/motion-*.md        10 subagentes
.claude/skills/motion-studio/     coordenador (/motion-studio)
motion-studio/
  src/config/      formatos, FPS, área segura           (CÓDIGO)
  src/voz/         contrato e utilitários de sincronia   (VOZ)
  src/cenas/       contrato do storyboard                (CENAS)
  src/personagens/ mascote 2D, objeto 3D, movimentos     (PERSONAGENS)
  src/texto/       fontes, título cinético, legendas     (TEXTO)
  src/pecas/       celular, notificação, card            (PEÇAS)
  src/movimento/   curvas, câmera/parallax, whip         (MOVIMENTO)
  src/cor/         paletas, contraste, fundo, grão       (COR)
  src/som/         catálogo SFX, mixagem, camada de som  (SOM)
  src/projetos/<slug>/  dados por agente + composição do projeto
  public/audio/{narracao,sfx,trilha}  public/personagens  public/assets  public/fontes
  projetos/<slug>/ briefing e relatórios dos agentes (NN-agente.md, revisao-N.md)
  render/revisao   stills de revisão     render/saida   vídeos finais
  aprovacoes/      aprovações humanas (libera o render)
  docs/            PROTOCOLO.md (posse/handoff) · QUALIDADE.md (checklist)
```

## Limitações conhecidas neste ambiente

- **Transcrição automática**: huggingface.co está bloqueado na rede do container, então os modelos Whisper locais não baixam. O VOZ usa a transcrição do ElevenLabs (conector) ou timestamps de roteiro. Na sua máquina local, `@remotion/install-whisper-cpp` funciona normalmente.
- **Fontes** ficam em `public/fontes/` (Inter e Space Grotesk, licença OFL), para o render funcionar offline e ser reprodutível.
