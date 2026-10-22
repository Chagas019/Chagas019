---
name: clean-components
description: Escreve componentes pequenos, código tipado, reutilizável e com separação de responsabilidades. Use ao criar ou refatorar componentes React/TypeScript, quebrar arquivos grandes ou padronizar a forma de escrever UI.
---

# Clean Components

## Regras
- **Uma responsabilidade**: se o nome precisa de "e" (`ListaEFiltro`), divida.
- **Tamanho**: acima de ~150 linhas ou mais de 3 níveis de JSX aninhado, extraia partes.
- **Dados fora da UI**: busca, transformação e regra de negócio vão em hooks (`useX`) ou `services/`; o componente só renderiza.
- **Props tipadas e mínimas**: sem `any`; opcionais com default; evite mais de ~7 props.
- **Composição** em vez de flags: `<Card><Card.Header/>…</Card>` em vez de `showHeader`, `headerVariant`, `isCompact`...
- **Sem duplicação**: na segunda cópia, avalie; na terceira, extraia.
- **Nomes claros**: componentes em PascalCase com substantivo (`PriceTag`), handlers `handleX`/props `onX`, booleanos `isX`/`hasX`.

## Padrão de arquivo
```tsx
type PriceTagProps = { value: number; currency?: string };

export function PriceTag({ value, currency = 'BRL' }: PriceTagProps) {
  const formatted = formatCurrency(value, currency);
  return <span className="tabular-nums">{formatted}</span>;
}
```

## Evite
- `useEffect` para derivar estado (calcule durante o render).
- Estado duplicado de props.
- Lógica dentro do JSX (ternários aninhados): extraia para variáveis ou subcomponentes.
- Estilos inline espalhados quando o projeto usa Tailwind/tokens.
- Exportar tudo "por via das dúvidas".

## Ao refatorar
Mantenha o comportamento idêntico, rode testes e typecheck, e faça mudanças em passos pequenos.
