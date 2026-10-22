---
name: frontend-architect
description: Senior Frontend Architect. Define arquitetura, componentes reutilizáveis, TypeScript, organização de pastas, gerenciamento de estado e padrões de código para um frontend profissional, sustentável e fácil de evoluir. Use ao estruturar um projeto, criar features novas, refatorar ou decidir onde um código deve morar.
---

# Senior Frontend Architect

## Primeiro, siga o projeto
Leia a estrutura atual (`src/`, `package.json`, `tsconfig`) e siga as convenções existentes. Proponha mudanças de arquitetura; não as imponha no meio de outra tarefa.

## Organização sugerida (React + TS)
```
src/
  components/   # UI reutilizável e sem regra de negócio (Button, Card, Modal)
  features/     # ou pages/: telas e fluxos com a sua lógica
  hooks/        # hooks compartilhados
  services/     # acesso a APIs e integrações externas
  types/        # tipos de domínio compartilhados
  utils/        # funções puras
  data/         # constantes e conteúdo estático
```
Código usado por uma única feature fica dentro dela. Mova para pastas compartilhadas só quando houver um segundo uso.

## TypeScript
- `strict` ligado. Nada de `any`; use `unknown` + validação nas bordas.
- Tipos de domínio explícitos; props tipadas com `type`/`interface` ao lado do componente.
- Uniões discriminadas para estados (`{ status: 'loading' } | { status: 'error'; error } | { status: 'success'; data }`).

## Estado
- Comece local (`useState`). Suba para o pai em comum quando dois componentes precisarem.
- Estado do servidor: React Query/SWR, se o projeto usar; caso contrário, um hook de serviço único.
- Estado global (Context/Zustand) só para o que é realmente global: sessão, tema, idioma.
- Estado da URL (filtros, abas, página) vai na URL.

## Componentes
- Uma responsabilidade por componente; separe apresentação de dados.
- Composição (`children`, slots) em vez de muitas props booleanas.
- Exporte o mínimo; mantenha API pequena e estável.

## Qualidade
- Lint e typecheck passando antes de commit.
- Testes para regras de negócio, hooks e fluxos críticos.
- Nomes que dizem o que a coisa é; nada de `utils2`, `helpers` genéricos ou `data.ts` com tudo.
