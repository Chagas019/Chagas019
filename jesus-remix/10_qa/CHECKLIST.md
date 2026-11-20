# Checklist QA — Diretor de Pós-produção
Cada peça precisa passar em TODOS os itens antes de ir para `99_entregas`.

## Técnico
- [ ] Resolução exata (1080×1920 / 1080×1080 / 1920×1080 / capa 3000×3000)
- [ ] Vídeo: H.264 High, yuv420p, 30 fps constante, CRF ≤ 18, AAC 320k quando houver áudio
- [ ] Áudio: original intacto (hash SHA-256 do trecho conferido), sem clipping, loudness -14 LUFS só no mix de SFX
- [ ] Sem banding visível em gradientes (grão aplicado), sem quadros pretos/duplicados

## Visual
- [ ] Cores dentro dos tokens (amostragem ±4 por canal)
- [ ] Texto dentro da safe zone (stories/reels: 250 px topo e base livres)
- [ ] Título sem colisão com o rosto; "remix" sem cortar em nenhum formato
- [ ] Nenhum texto inventado (apenas: JESUS, remix, ANDRÉ × CASTRO, 15.12.2026, lançamento, nas plataformas digitais)

## Movimento / sync
- [ ] Curvas conforme IDENTIDADE.md; nada linear exceto loop do tabuleiro
- [ ] Impactos caem no beat (desvio ≤ 1 quadro) — só após áudio real
- [ ] Shake ≤ 6 px; flashes ≤ 2 quadros
