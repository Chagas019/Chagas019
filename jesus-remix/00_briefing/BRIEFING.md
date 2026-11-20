# JESUS Remix — André Castro
Lançamento: **15.12.2026** · Campanha visual + motion

## Status das fases
| Fase | Status |
|---|---|
| 1. Estrutura, equipe, identidade, proposta visual | ✅ aprovada (fonte A) |
| 2. Produção completa (estáticos + motion sem áudio) | 🔄 em produção |
| 3. Sincronização com a música | ⏳ aguarda arquivo de áudio |
| 4. QA final + entregas | ⏳ |

## Regras invioláveis
- Não inventar letra, trechos ou informações do artista.
- Áudio original preservado (somente leitura em `09_audio/original`).
- Sincronização final só após análise da música real (BPM, estrutura, impactos).
- Nada sai de `99_entregas` sem passar pelo QA (`10_qa`).

## Ferramentas reais deste ambiente (verificado)
| Ferramenta pedida | Disponível? | Substituto usado |
|---|---|---|
| After Effects | ❌ | HTML/CSS/JS + GSAP renderizado quadro a quadro (Chromium/Playwright) → FFmpeg |
| Premiere Pro | ❌ | FFmpeg (montagem, cortes, encode H.264) |
| Photoshop | ❌ | Python/PIL + ImageMagick; recorte com IA (rembg / BRIA RMBG 2.0) |
| Illustrator | ❌ | SVG escrito à mão (vetores editáveis) |
| Blender | ❌ | Profundidade 2.5D/3D via CSS 3D transforms + parallax em camadas |
| DaVinci Resolve | ❌ | Grade via FFmpeg (curves/eq) + tokens de cor fixos |
| Análise de áudio | ✅ | librosa (BPM, beats, onsets, seções) |

Todos os projetos-fonte (HTML/SVG/Python) ficam editáveis em `05_motion/src` e `02_identidade`.
