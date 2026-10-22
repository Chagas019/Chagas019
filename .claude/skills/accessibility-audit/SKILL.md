---
name: accessibility-audit
description: Avalia e corrige acessibilidade (WCAG 2.2 AA) - navegação por teclado, contraste, foco visível, leitores de tela, semântica HTML, ARIA, formulários e movimento. Use ao criar componentes, revisar páginas antes de publicar ou quando pedirem acessibilidade/a11y.
---

# Accessibility Audit

## Semântica
- HTML nativo primeiro: `button` para ações, `a` para navegação, `nav`, `main`, `header`, `footer`, `section` com título.
- Um `h1` por página e níveis de título sem pular.
- `lang` correto no `<html>` (`pt-BR`).
- ARIA só quando o HTML não resolve; ARIA errado é pior que nenhum.

## Teclado
- Tudo que é clicável é alcançável com Tab, na ordem visual, e ativável com Enter/Espaço.
- Foco visível sempre (`:focus-visible` com contraste ≥ 3:1); nunca `outline: none` sem substituto.
- Modais: prendem o foco, fecham com Esc e devolvem o foco ao gatilho.
- Link "Pular para o conteúdo" no topo.

## Contraste e cor
- Texto: 4.5:1 (3:1 para texto ≥ 24px ou ≥ 19px negrito). Ícones e bordas de interface: 3:1.
- Nunca use só cor para transmitir informação (erro, status, gráfico).

## Imagens e mídia
- `alt` descritivo em imagens com conteúdo; `alt=""` nas decorativas.
- Ícones-botão com `aria-label`. Vídeos com legenda; áudio com transcrição.

## Formulários
- Todo campo com `<label>` associado; instruções e erros ligados com `aria-describedby`.
- Erros com texto claro, anunciados (`aria-live` ou foco no resumo) e sem apagar o que foi digitado.
- `autocomplete` nos campos pessoais.

## Movimento e layout
- Respeite `prefers-reduced-motion`. Nada pisca mais de 3 vezes por segundo.
- Zoom de 200% e largura de 320px sem perda de conteúdo. Alvos de toque ≥ 24px (ideal 44px).

## Como auditar
1. Navegue a página inteira só com teclado.
2. Rode axe/Lighthouse e corrija os erros.
3. Teste com leitor de tela (NVDA, VoiceOver) nos fluxos principais.
4. Liste os problemas com o critério WCAG, o local e a correção.
