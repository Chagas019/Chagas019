# Design System

Fonte de verdade: `src/styles/globals.css` (`@theme`). Espelho TS: `src/design-system/tokens.ts`. Vitrine viva: rota `/design-system`.

## Cores
- **Azul-marinho `#101C35`** (navy-900): marca, texto principal, botão primário.
- **Dourado `#D6AE62`** (gold-500): destaque, botão dourado, ícones sobre azul. **Nunca como texto sobre fundo claro** (2,08:1). Para texto dourado use `text-accent-ink` (`#8C6A2A`, 4,99:1).
- Neutros quentes `sand-*`; canvas `#FBFAF7`.
- Estados: sucesso `#1F7A4D`, erro `#B42318`, aviso `#B54708`, informação `#2E5AAC` (todos ≥ 5,3:1 sobre branco).

Todos os pares de texto são verificados automaticamente em `tests/unit/design-tokens.test.ts` (WCAG AA ≥ 4,5:1).

## Tipografia
Fraunces (títulos, serifada elegante, eixo óptico) + Inter (interface). Auto-hospedadas via `next/font` (CSP só permite fontes do próprio domínio).

## Componentes
`Button`/`ButtonLink` (primary, gold, outline, ghost, danger, link, onDark; loading acessível), `Field` (rótulo + dica + erro ligados por `aria-describedby`), `Input`, `Textarea`, `Select`, `ChoiceGroup` (chips com inputs nativos), `Checkbox`, `Card`, `Badge`, `Alert` (live regions), `Avatar`, `Spinner`, `Skeleton`, `StatePanel` (vazio, erro, sucesso, sem permissão, backend não configurado), `SubmitButton`/`FormMessage` (Server Actions).

## Acessibilidade
Link "pular para o conteúdo", foco visível dourado, alvos ≥ 40px, `prefers-reduced-motion`, idioma do documento dinâmico, formulários sem dependência de JS para envio, axe-core sem violações WCAG 2.2 AA nas páginas públicas (desktop, tablet e mobile).
