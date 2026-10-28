---
name: design-system-tokens
description: Cria e mantém design tokens de cores, tipografia, espaçamentos, raios, sombras e movimento, além de componentes com variantes e temas claro/escuro. Use ao criar um sistema visual, padronizar estilos, adicionar dark mode ou eliminar valores fixos espalhados.
---

# Design System & Tokens

## Três camadas
1. **Primitivos**: valores crus (`--blue-500`, `--space-4`, `--font-size-lg`).
2. **Semânticos**: intenção (`--color-bg`, `--color-text`, `--color-primary`, `--color-border`, `--color-danger`).
3. **Componentes**: específicos (`--button-bg`, `--card-radius`), só quando necessário.
Componentes usam tokens semânticos, nunca primitivos nem valores fixos.

## Onde definir
- CSS variables no `:root` + override em `[data-theme="dark"]` e/ou `@media (prefers-color-scheme: dark)`.
- Com Tailwind: mapeie as variables em `theme.extend` (`colors: { bg: 'rgb(var(--color-bg) / <alpha-value>)' }`).

## Escalas
- Espaço: 0, 2, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128.
- Tipo: escala modular (1.2 ou 1.25), de 12px a 72px+, com line-height e tracking por nível.
- Raio: none, sm (4), md (8), lg (12–16), full. Sombra: 3–4 níveis de elevação.
- Movimento: duração (fast 150ms, base 250ms, slow 400ms) e curvas nomeadas.

## Tema escuro
- Não é inverter cores: fundos não totalmente pretos (#0b0b0f–#121218), elevação com fundo mais claro em vez de sombra, saturação menor nas cores de marca.
- Verifique contraste AA nos dois temas.

## Componentes e variantes
- Defina variantes (`primary | secondary | ghost | danger`), tamanhos (`sm | md | lg`) e estados.
- Uma fonte da verdade (ex.: `cva`/função de classes) por componente.
- Documente cada componente com exemplo de uso e o que não fazer.

## Auditoria
Busque hex, rgb e px soltos no código (`grep -rE "#[0-9a-fA-F]{3,6}|[0-9]+px"`) e substitua pelos tokens.
