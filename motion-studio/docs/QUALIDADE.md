# Critérios de aprovação (checklist do agente REVISÃO)

Severidade: **BLOQUEANTE** impede aprovação · **IMPORTANTE** corrigir antes da entrega · **POLIMENTO** opcional.

## Técnico (BLOQUEANTE)
- [ ] `npx tsc --noEmit` sem erros · `npm run qa` sem erros · `npm run compositions` lista a composição
- [ ] 60 FPS, dimensões corretas por formato, duração = `duracaoTotal(plano)`
- [ ] Nenhum `Math.random`, timer ou CSS animation; todos os assets existem

## Layout
- [ ] Nenhum texto cortado, fora da área segura ou sobreposto a outro elemento importante (BLOQUEANTE)
- [ ] Vertical: nada essencial nos 20% inferiores (interface das redes) nem nos 10% superiores
- [ ] Tamanho mínimo de texto legível no celular: corpo ≥ 34px, legenda ≥ 48px em 1080 de largura (IMPORTANTE)
- [ ] Hierarquia clara: 1 foco por momento

## Sincronia
- [ ] Destaque de palavra começa no `startMs` da palavra (±1 frame)
- [ ] SFX alinhados ao evento visual (whoosh começa ~6 frames antes do corte do whip)
- [ ] Impactos/clímax da voz coincidem com um evento visual

## Movimento
- [ ] Sem saltos (pops) indesejados entre frames consecutivos; transições sem frame preto/vazio
- [ ] Easing coerente (nada linear em entrada/saída de elementos, exceto intencional)

## Cor
- [ ] Contraste texto/fundo ≥ 4.5:1 (`contraste()` em `src/cor/tema.ts`)
- [ ] Paleta consistente entre cenas; grão sutil (≤ 0.08)

## Áudio
- [ ] Narração dominante; SFX não mascaram fala; sem clipping (pico ≤ -1 dBTP)
