# DISANTOS — Cinematic Brand Motion

Campanha vertical (Reels) de **20 s, 1080×1920, 30 FPS**, feita em **React + Remotion**. Conceito: "Vestir a fé com memória". Assinatura: "Vista a fé. Carregue a história."

## Estrutura

```
src/
  Root.tsx                 composição DisantosReel (1080×1920, 30 FPS, 600 frames)
  DisantosReel.tsx         monta as cenas por Sequence e a mixagem
  scenes/                  S01Despertar · S02Memoria · S03Identidade · S04Conexao · S05Assinatura
  components/              fundo, grão, luz, partículas, texto cinético, legendas, logo, produto
  audio/MusicMix.tsx       trilha com ducking, varreduras, impactos e assinatura sonora
  config/
    brand.ts               cores, tipografia e textos aprovados
    timeline.ts            duração de cada cena, sobreposições e cortes (em frames)
    captions.ts            legendas da narração e janelas de ducking
    assets.ts              slots de fotos, logo, narração e trilha
    assets.generated.ts    status dos arquivos (gerado por `npm run assets`)
public/
  audio/                   trilha e efeitos gerados (original, sem licença de terceiros)
  produtos/                fotos de produto (ver LEIA-ME.md)
  marca/                   logo oficial (ver LEIA-ME.md)
  narracao/                narração final (ver narracao/roteiro-narracao.md)
narracao/roteiro-narracao.md
scripts/
  gerar-audio.py           sintetiza trilha, varredura, impacto e assinatura
  verificar-assets.mjs     confere os arquivos reais e gera assets.generated.ts
previa/                    prévia de revisão (folha de contato e vídeo em 540×960)
```

## Linha do tempo

| Cena | Tempo | Conteúdo |
|---|---|---|
| 01 — O despertar da marca | 0–3 s | Tela quase preta, linha de luz azul, "Algumas histórias nunca deixam de viver." |
| 02 — A memória | 3–7 s | Macro da estampa com dolly-out e foco que se fecha; narração N1 |
| 03 — A identidade | 7–12 s | Cortes rítmicos entre os produtos, varreduras e tríade "É fé. É história. É identidade." |
| 04 — A conexão | 12–16 s | Câmera se aproxima do detalhe; trilha cresce; narração N2 |
| 05 — Assinatura final | 16–20 s | Máscara abre sobre fundo escuro; logo centralizada; assinatura |

As cenas se sobrepõem por 12 frames (0,4 s) e cada uma revela a seguinte com uma máscara circular ou em varredura. Não há transição aleatória nem glitch.

## Como executar

Requisitos: Node 18+ e Python 3 com numpy (só para regenerar o áudio).

```bash
npm install
npm run audio        # regenera a trilha e os efeitos (opcional, já estão em public/audio)
npm run assets       # mostra o que falta e atualiza assets.generated.ts
npm run start        # Remotion Studio, para revisar quadro a quadro
npm run preview      # prévia em 540×960
npm run render       # MP4 final em out/disantos-reel-9x16.mp4
npm run still        # quadro único em out/preview/quadro.png
```

Se o Remotion não conseguir baixar o próprio navegador, aponte para um Chromium instalado:

```bash
REMOTION_BROWSER=/caminho/para/chrome-headless-shell npm run render
```

No ambiente em que esta campanha foi montada, o caminho era `/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell`. O executável `chromium` comum não serve, porque o Remotion exige o modo headless novo ou o headless shell.

## Substituindo os arquivos

| O que | Onde colocar | Efeito |
|---|---|---|
| Fotos de produto | `public/produtos/` com os nomes de `produtos/LEIA-ME.md` | Substitui o quadro-reserva na cena |
| Logo oficial | `public/marca/logo.png` | Já incluída (extraída da arte enviada). Aparece no selo branco nas cenas 01 e 05 |
| Narração | `public/narracao/narracao-final.wav` | Entra na mixagem e a trilha abaixa nas falas |
| Trilha licenciada | `public/audio/trilha-licenciada.mp3` | Substitui a trilha gerada (precisa de licença comercial) |

Depois de qualquer troca, rode `npm run assets` antes de renderizar. O comando `npm run render` já faz isso.

## Estado desta entrega

**Executado e verificado:**
- Logo oficial incluída, com a cruz dourada como ponto de aproximação da câmera na cena 01.
- Transições de corte com flash de luz e vazamento diagonal, palavras-carimbo e frases de marca.
- Projeto Remotion completo, com cinco cenas, componentes reutilizáveis e linha do tempo em frames.
- Animações por `useCurrentFrame`, `interpolate` e `spring`/`rise`, sem timers do navegador nem aleatoriedade (grão e partículas são determinísticos).
- Trilha, varredura, impacto e assinatura sonora gerados por código, com níveis conferidos (pico em -1,2 dB na prévia).
- Legendas da narração sincronizadas com as janelas de ducking, dentro da zona segura do Reels.
- Typecheck (`tsc --noEmit`) sem erros.
- Prévia completa renderizada e revisada em folha de contato (`previa/`).

**Ainda depende de arquivos externos (não existem nos repositórios):**
- **Fotos reais das camisetas e das estampas.** Sem elas, as cenas 02, 03 e 04 mostram quadros-reserva identificados. Nenhuma estampa foi inventada.
- **Narração em português do Brasil.** Não há voz gerada nem gravada. Veja `narracao/roteiro-narracao.md`.
- **Trilha licenciada (opcional).** A trilha gerada é original e pode ser usada.
- **CTA de compra.** Não há endereço oficial confirmado, então a assinatura final não tem link nem oferta.

## Licenças

- Fontes: Cormorant Garamond e Manrope, via `@fontsource`, licença SIL OFL.
- Áudio: trilha, varredura, impacto e assinatura sintetizados por `scripts/gerar-audio.py`. Não há amostras de terceiros.
- Imagens: nenhuma imagem de terceiros é usada. Fotos reais só devem entrar com autorização de uso.
