# AGENTS.md — Chagas Color · FotoPreset

Guia rápido para quem (pessoa ou agente) for mexer neste projeto.

- Marca: **Chagas Color**. Mantenha o nome, o monograma (`src/components/Logo.tsx`) e a
  paleta escura com dourado (`src/styles.css`, variáveis em `:root`).
- Antes de enviar mudanças rode, dentro de `fotopreset/`:
  `npm test && npm run typecheck && npm run build`.
- `src/engine/pipeline.ts` é puro (sem DOM) e coberto por testes; qualquer mudança no motor
  precisa manter os testes de identidade (ajustes neutros e intensidade 0% não alteram pixels)
  e de faixas (processar em faixas = processar inteiro).
- Novos presets entram em `src/presets/presets.ts` e precisam passar em `validatePreset`.
- Não envie fotos para serviços externos e não guarde fotos em `localStorage`/IndexedDB.
- Não afirme que presets equivalem aos do Lightroom nem que o app nativo foi compilado sem
  isso ter sido feito de verdade.
- Textos da interface em português do Brasil, linguagem simples.
