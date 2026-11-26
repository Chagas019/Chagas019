# 05 — Relatório de QA · V2 (Teaser 10ª edição)

Produto validado: `PafiesTeaser` (1920×1080) e `PafiesTeaserVertical` (1080×1920), 720 f · 30 fps · 24 s,
trilha `public/trilha-v2.wav`, tempo em `src/timeline-v2.json`. Remotion 4.0.242.

**Status: APROVADO para entrega** (com as 2 correções abaixo).

## Entregáveis
| Arquivo | Vídeo | Áudio | Tamanho |
|---|---|---|---|
| `out/pafies-teaser-10-edicao.mp4` | H.264 1920×1080, 30/1 fps, 720 f, yuv420p (tv) | AAC 48 kHz estéreo | 13,4 MB |
| `out/pafies-teaser-10-edicao-vertical.mp4` | H.264 1080×1920, 30/1 fps, 720 f, yuv420p (tv) | AAC 48 kHz estéreo | 13,4 MB |

Duração 24,000 s nos dois. O render do Remotion sai em `yuvj420p` (range pc) → reconvertido com
`ffmpeg -c:v libx264 -crf 17 -preset slow -pix_fmt yuv420p -color_range tv -c:a copy -movflags +faststart`.
Prancha do filme final (1 still/s, H + V): `docs/qa-prancha-v2.png`.

## Checagens
| Item | Resultado |
|---|---|
| `npx tsc --noEmit` | OK (0 erros) |
| Roteiro na tela | Só "E AÍ," · "ESTÃO PREPARADOS" (anel repete a frase + ✦) · "PARA A" "10ª" "GINCANA?" · "TÁ CHEGANDO," "HEIN?" · selo GINCANA / Solidária / PAFIES / 10ª EDIÇÃO. Nenhum outro texto. |
| Acentos | Í, Ã, Á, ª, Ç/Ã do selo corretos nas duas versões |
| Leitura ≥ 1 s (frase inteira) | E AÍ, 45–119 (2,5 s) · ESTÃO PREPARADOS de frente 210–297 (2,9 s) · PARA A 10ª GINCANA? 420–479 (2 s) · TÁ CHEGANDO, HEIN? 540–599 (2 s) · selo completo 662–719 (1,9 s) |
| Bordas | Nada cortado nos planos de leitura. "10ª" passa da borda só nos 1–2 f do slam (390–391, intencional) |
| Personagem | Recortes f00–f04 fiéis ao GIF, sem halo verde (≤ 41 px esverdeados por quadro em 1600×1200, invisíveis). A sola reta na base é o corte do próprio GIF (câmera baixa) — não é defeito de recorte |
| Cortes de cor | Secos exatamente no quadro do cue: 120, 300, 390, 480, 600 (medido no MP4 final) |
| Quadros vazios | Só f0 (laranja chapado, 1 f antes da linha) e f599→600 smear — intencionais |
| Sincronia (onsets do WAV e do AAC final × cues) | 30, 45, 120, 225, 300, 390, 480, 540, 600, 660: 0 a −0,2 f · 405: +1,0 f (clap+stab empilhados; dentro de ±1 f) · silêncio 386–389 = −180 dBFS no WAV |
| Antecipação de texto | "E AÍ," / "GINCANA?" / "HEIN?" aparecem 4–5 f antes do cue (pré-roll do `pop-word`/`slam`) e POUSAM no cue — por design |

## Correções feitas
1. **Glitch no anel 3D (V2, 120–299) no render final** — com `concurrency=4` o Chromium (swangle) perdia
   faces do `AnelFrase` em quadros aleatórios (anel "vazado", só contornos; visto em f150, 190–210, 255, 285).
   Os stills (1 aba) saíam certos. Teste A/B 140–299: concurrency 4 falha, 1 estável. Correção:
   `--concurrency=1` em `render:teaser` e `render:teaser:vertical` (`package.json`). MP4 final comparado com os
   71 stills de QA por versão: diferença média ≤ 6/255 em todos os quadros.
2. **Vertical V4 — vazio embaixo após a travessia (560–599)** — bloco de texto subiu demais (TÁ/CHEGANDO/HEIN?
   na metade de cima, só a poça embaixo). Em `src/scenes-v2/V4Chegando.tsx` (só `isV`): `chegY` 500→660,
   `heinY` 880→1060 e a linha-arco acompanhou (+180/+160 px). Composição agora centrada; a travessia continua
   passando por trás do texto e a pisada na poça segue no f540.

## Pendências / observações
- Os scripts `render:teaser*` ainda gravam `out/pafies-teaser-v2*.mp4` em yuvj420p; o passo de reconversão
  para yuv420p + renomeação para `pafies-teaser-10-edicao*.mp4` foi manual (comando acima).
- Render com `--concurrency=1` leva ~2–3 min por versão nesta máquina.
- O flux de onset do f405 fica em +1 f; se quiserem 0 f, adiantar o clap da trilha em ~1 f (`gerar_trilha.py`).
