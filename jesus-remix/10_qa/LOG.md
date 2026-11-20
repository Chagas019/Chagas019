# LOG do estúdio
- 2026-11-20 Fase 1: estrutura, agentes, identidade, recorte do artista (rembg/BRIA RMBG 2.0). Designer e Motion produzindo proposta em paralelo.
- 2026-11-20 Proposta fase 1 entregue: 5 estáticos + abertura 10s. QA: OK técnico (1080², 30fps, H.264 yuv420p, 10.0s). Pendência: unificar fonte do título (A Dela × B Bungee); MP4 pesado (30 MB/10s por causa do grão) — ajustar bitrate no final.
- 2026-11-20 Cliente aprovou a proposta, fonte A (Dela Gothic One). Fase 2: Motion, Designer e Editor em paralelo.
- 2026-11-20 Cliente enviou referência de motion (showreel 3D/física/morph). Direção v2 repassada a Motion e Editor.
- 2026-11-20 QA estáticos fase 2 OK: 4 stories, 8 countdowns, capa Spotify 3000 (sRGB, 5,2 MB), thumb YouTube, feed 4:5. Dimensões (identify) e safe zones 250px conferidas. story_data movido para stories/story_03.
- 2026-11-20 Música recebida (Corte_Jesus.wav, 29,5s). Análise: 133 BPM, drop 14,52s, clímax 27,15s. beatmap.json gerado.
- 2026-11-20 Motion v2 com música real: motion_principal 3 formatos 29,53 s (886 q) + AAC 320k do original; capa_animada/canvas loop 7,200 s (216 q) sem áudio. Impactos q436/q557/q814 (±0,5 q). Loop seek(DURATION)==seek(0).
- 2026-11-20 Editor/SD/VFX: teaser 3 formatos 29,53 s; reels 15,63 s; countdown 7/5/3/1 5 s; visualizer 16:9 e 9:16 29,53 s (energia do WAV real). Impactos ≤1 quadro. SHA-256 do WAV OK. Safe zone reels OK.
- 2026-11-20 QA Diretor de Pós: quadros-chave revisados (teaser, reels, motion), sem texto inventado, data correta no quadro final. Aprovado → 99_entregas. Decisões abertas com cliente: frase A só com esfera/palco; peso do grão (tamanho dos arquivos); thumb YouTube dedicado.
