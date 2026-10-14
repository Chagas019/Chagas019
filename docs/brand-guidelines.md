# DISANTOS — Brand Guidelines v1.0

> Última atualização: 2026-10-14
> Status: Rascunho para revisão. Cores e tipografia são as usadas no motion `disantos-motion/`.

## Quick Reference

| Element | Value |
|---------|-------|
| Primary Color | #0B1C34 (azul-marinho) |
| Secondary Color | #C9A66B (dourado discreto) |
| Primary Font | Cormorant Garamond (títulos) |
| Text Font | Manrope (legendas, rótulos) |
| Voice | Contemplativa, forte, respeitosa, próxima |

---

## 1. Color Palette

### Primary Colors

| Name | Hex | RGB | Usage |
|------|-----|-----|-------|
| Navy | #0B1C34 | rgb(11,28,52) | Fundo principal, painéis |
| Navy Mid | #13294B | rgb(19,41,75) | Gradientes, profundidade |
| Navy Deep | #06101F | rgb(6,16,31) | Sombras e fundo de texto |

### Secondary Colors

| Name | Hex | RGB | Usage |
|------|-----|-----|-------|
| Gold | #C9A66B | rgb(201,166,107) | Linhas, acentos, cruz e rótulos |
| Accent Blue Light | #6E9FE0 | rgb(110,159,224) | Luz e transições |

### Neutral Palette

| Name | Hex | RGB | Usage |
|------|-----|-----|-------|
| Black | #030406 | rgb(3,4,6) | Fundo de abertura e encerramento |
| Ivory | #F3EEE3 | rgb(243,238,227) | Texto principal sobre escuro |
| Ivory 72% | rgba(243,238,227,0.72) | — | Subtítulos e legendas secundárias |
| Gold 60% | rgba(201,166,107,0.6) | — | Não usar para texto (ver Acessibilidade) |

### Accessibility

Contraste medido com WCAG 2.1 (texto normal exige 4,5:1; elementos gráficos, 3:1):

| Par | Contraste | Resultado |
|-----|-----------|-----------|
| Ivory sobre Navy | 14,76:1 | AAA |
| Ivory sobre Black | 17,73:1 | AAA |
| Ivory 72% sobre Navy | 8,12:1 | AAA |
| Gold sobre Navy | 7,44:1 | AAA |
| Blue Light sobre Black | 7,52:1 | AAA |
| Navy sobre branco (selo da logo) | 17,07:1 | AAA |
| Gold 60% sobre Navy | 3,48:1 | **Reprovado** — usar Gold sólido |

**Regra:** texto sempre em Ivory ou Gold sólido sobre Navy ou Black. Nunca usar Gold ou Ivory transparente para texto pequeno.

---

## 2. Typography

### Font Stack

```css
--font-display: 'Cormorant Garamond', 'Times New Roman', serif;
--font-text: 'Manrope', 'Helvetica Neue', Arial, sans-serif;
```

### Type Scale (vídeo, 1080×1920)

| Element | Size | Weight | Uso |
|---------|------|--------|-----|
| Título de cena | 92–116px | 400 itálico / 500 | Frases principais |
| Palavra-carimbo | 104–150px | 500 caixa alta | Fé, Memória, História, Identidade |
| Subtítulo | 56–60px | 400 itálico | Assinatura e frases secundárias |
| Rótulo | 24–26px | 400–600, caixa alta, espaçamento 0,22–0,36em | Capítulos, kicker |

Fontes via `@fontsource` (licença SIL OFL).

---

## 3. Logo Usage

- Logo oficial em `disantos-motion/public/marca/logo.png`, com fundo transparente. Não recolorir, recortar nem distorcer.
- Apresentar sobre o círculo branco do selo, como no perfil.
- Área de respiro: mínimo de um terço da altura do selo ao redor.
- Não criar símbolo, cruz ou variação da logo que não esteja no arquivo oficial.

---

## 4. Voice & Tone

### Brand Personality

- **Contemplativa:** ritmo lento, pausas, respeito à história.
- **Forte:** convicção sem agressividade.
- **Próxima:** fala de fé e pertencimento, não de vendas.

### Frases de marca (aprovadas no briefing)

- "Vestir a fé com memória."
- "A fé que vestimos. A história que carregamos."
- "Algumas histórias nunca deixam de viver."
- "Não é apenas uma camiseta. É fé. É história. É identidade."
- "Vista a fé. Carregue a história."

### Prohibited Terms

- Promessas comerciais sem comprovação (prazo, preço, quantidade).
- Números, depoimentos ou produtos que não existam nos arquivos oficiais.
- Linguagem de urgência ("últimas peças", "só hoje").

---

## 5. Imagery Guidelines

- Macro de estampa e tecido, com luz rasante e sombras marcantes.
- Fundo escuro com luz volumétrica azul ou dourada.
- Uso de pessoas só com autorização de uso de imagem.
- Sem imagens geradas por IA apresentadas como fotos do produto.

---

## 6. Motion

- 30 FPS, 1080×1920, 20 s (ver `disantos-motion/README.md`).
- Transições motivadas pela história: flash de luz, varredura, íris e máscara circular.
- Sem glitch e sem transição aleatória.
- Textos dentro da zona segura do Reels.

---

## Changelog

- v1.0 (2026-10-14): versão inicial a partir das cores e tipografia do projeto de motion.
