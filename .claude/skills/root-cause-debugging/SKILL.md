---
name: root-cause-debugging
description: Investiga erros reais antes de alterar arquivos e evita correções improvisadas. Reproduz, isola, encontra a causa raiz e só então corrige e verifica. Use quando algo quebra, um teste falha, aparece erro no console, build ou deploy, ou o comportamento não é o esperado.
---

# Root-Cause Debugging

## Fluxo obrigatório
1. **Leia o erro inteiro**: mensagem, stack trace, arquivo e linha. Não pule para uma hipótese.
2. **Reproduza**: encontre o comando ou o passo que dispara o erro. Sem reprodução, não há como confirmar a correção.
3. **Isole**: o que mudou? (`git log`, `git diff`, versão de dependência, variável de ambiente). Reduza ao menor caso que falha.
4. **Hipótese → evidência**: formule uma causa e confirme com log, teste, leitura do código ou debugger antes de editar.
5. **Corrija a causa**, não o sintoma. A correção mínima que resolve.
6. **Verifique**: rode a reprodução de novo, os testes ligados e o build. Adicione um teste que falharia sem a correção, quando fizer sentido.
7. **Explique**: causa, correção e como foi verificado, em poucas linhas.

## Proibido
- Envolver em `try/catch` vazio, `// @ts-ignore`, `any`, `!` ou `?.` só para o erro sumir.
- Desabilitar, pular ou apagar teste para ficar verde.
- Mudar várias coisas ao mesmo tempo "para ver se resolve".
- Atualizar ou trocar dependência sem evidência de que é a causa.
- Declarar "corrigido" sem rodar a verificação.

## Dicas
- Erros de tipo: leia o tipo esperado vs. o recebido; a causa costuma estar um nível acima.
- "Funciona local, falha no deploy": compare versões do Node, variáveis de ambiente, maiúsculas/minúsculas em caminhos e build de produção.
- Intermitente: procure condição de corrida, dependência de ordem, cache, tempo ou rede.
