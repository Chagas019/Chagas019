---
name: qa-testing
description: Testa fluxos, formulários, links, estados vazios, erros e responsividade, com testes automatizados (Vitest, Testing Library, Playwright) e verificação manual guiada. Use depois de implementar uma feature, antes de publicar ou quando pedirem para testar ou escrever testes.
---

# QA & Testing

## Estratégia
- **Unitário** (Vitest): funções puras, regras de negócio, hooks.
- **Componente** (Testing Library): comportamento visível ao usuário. Busque por papel e texto (`getByRole`, `getByLabelText`), não por classe.
- **E2E** (Playwright): 3–5 fluxos críticos de ponta a ponta (cadastro, compra, contato, navegação principal).
- Use o que o projeto já tem; não adicione framework novo sem avisar.

## O que verificar em cada feature
- **Caminho feliz** funciona do começo ao fim.
- **Formulários**: campos obrigatórios, formatos inválidos, limites, mensagens de erro claras, envio duplo bloqueado, sucesso confirmado, teclado (Enter/Tab).
- **Estados**: carregando, vazio, erro de rede/servidor, sem permissão, lista longa, texto muito longo.
- **Links e navegação**: nenhum link quebrado, botão voltar funciona, rotas inexistentes mostram 404.
- **Responsividade**: 360px, 768px, 1280px e 1920px (ver `responsive-layout`).
- **Navegadores**: Chrome, Safari (iOS) e Firefox para fluxos críticos.
- **Console** sem erros nem warnings novos.

## Boas práticas de teste
- Um comportamento por teste, com nome descritivo ("mostra erro quando o e-mail é inválido").
- Arrange / Act / Assert. Sem dependência de ordem entre testes.
- Mock só nas bordas (rede, tempo, aleatoriedade).
- Teste que falha intermitente é bug: corrija a causa; nunca desabilite para passar.

## Entregável
Liste o que foi testado, o que passou, o que falhou (com passos para reproduzir) e o que não foi coberto.
