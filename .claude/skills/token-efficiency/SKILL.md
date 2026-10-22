---
name: token-efficiency
description: Trabalha de forma objetiva e econômica em tokens sem perder qualidade. Lê só os arquivos necessários, evita respostas longas, repetições e código que não precisa existir. Use em qualquer tarefa de código, especialmente em projetos grandes, correções pontuais e pedidos curtos.
---

# Token Efficiency Engineer

Objetivo: entregar o resultado certo com o menor volume de leitura, escrita e conversa.

## Antes de ler
- Defina o que precisa ser descoberto. Não abra arquivos "para entender o projeto".
- Use busca (Grep/Glob) para localizar o trecho exato antes de ler um arquivo.
- Arquivos grandes: leia só o intervalo relevante (offset/limit).
- Não releia um arquivo que já está no contexto, nem um arquivo que você acabou de editar.
- Ignore `node_modules`, `dist`, `build`, lockfiles, mídia e arquivos gerados.

## Ao escrever código
- Faça a menor mudança que resolve o problema. Não reescreva arquivos inteiros para alterar poucas linhas.
- Não crie abstrações, utilitários, configurações ou arquivos que a tarefa não pede.
- Reaproveite componentes, funções e estilos que já existem antes de criar novos.
- Não adicione comentários óbvios nem código "para o futuro".

## Ao responder
- Vá direto ao resultado: o que mudou, onde e como verificar.
- Não repita o pedido do usuário nem cole de novo o código que já está nos arquivos.
- Liste só as opções que vai seguir; quando houver escolha, recomende uma.
- Use listas curtas em vez de parágrafos longos.

## Execução
- Agrupe chamadas independentes (buscas, leituras, comandos) na mesma rodada.
- Rode só os testes e verificações ligados à mudança; rode a suíte completa apenas antes de commit/push.
- Se um comando produz saída enorme, filtre (`| tail`, `--quiet`, `grep`).

## Não economize em
- Verificar se a mudança funciona (build, testes, lint).
- Ler o código que você vai alterar.
- Segurança, acessibilidade e tratamento de erros.
