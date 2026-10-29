# Virtual Office AI — agência de marketing com funcionários de IA

Uma agência de marketing que roda num servidor e tem 31 funcionários de IA. Cada um tem cargo, superior direto, instruções próprias, ferramentas que pode usar, limites de custo e rotina de trabalho. O proprietário dirige a empresa pelo CEO virtual e pode conversar diretamente com qualquer funcionário.

## Começar

Requer **Node 22.13 ou mais novo** (usa o SQLite que vem com o Node; a única dependência externa é o SDK da Anthropic).

```bash
cd virtual-office-ai
npm install
npm run setup     # cria o banco, cadastra a empresa, gera o token do proprietário e mostra o que está conectado
# edite .env e defina ANTHROPIC_API_KEY=...
npm start         # http://localhost:3210  (entre com o OWNER_TOKEN do .env)
npm test          # 25 testes, com um provedor de IA simulado (sem custo)
```

O `npm run setup` pode ser executado quantas vezes você quiser. Ele não duplica nada e não apaga o histórico.

## O que é cadastrado

| Item | Quantidade |
|---|---|
| Funcionários | 31 (registros completos no banco: nome, avatar, cargo, departamento, sala, superior, missão, objetivos, responsabilidades, competências, instruções de sistema, ferramentas, ações que podem pedir, tipos de tarefa, critérios de qualidade, regras de delegação, limites de custo, rotina, indicadores, estado, modelo de IA) |
| Departamentos | 7: Diretoria Executiva, Marketing, Comercial, Atendimento e Projetos, Tecnologia, Financeiro, Administrativo e Qualidade |
| Salas | 12 salas do escritório visual |
| Rotinas | 3: início do expediente, acompanhamento do meio do dia e fim do expediente |
| Fluxos | 3: `pacote_social`, `campanha_completa`, `landing_page` |
| Tipos de tarefa | 37, cada um com critérios de conclusão próprios |

A fonte dos dados é `src/data/` e a gravação no banco é feita por `src/seed.js`, de forma idempotente (chave: `slug`). Se a definição de um cargo mudar no código, o registro é atualizado na próxima inicialização. O modelo escolhido por você, o estado e o histórico são preservados.

## Como uma tarefa é executada (`src/engine.js`)

1. **Valida** se o funcionário pode executar aquele tipo de tarefa. Diretores podem assumir tarefas *simples* do próprio departamento.
2. **Confere o orçamento**: o limite diário do funcionário e o orçamento diário da empresa.
3. **Carrega o contexto autorizado**: a tarefa, os critérios, o cliente e o projeto da tarefa, as entregas das dependências e o feedback de revisões anteriores. Nada de outros clientes entra.
4. **Escolhe as ferramentas**: as permitidas ao cargo e que estejam conectadas. As que faltam são informadas ao funcionário.
5. **Chama o modelo** configurado (Claude, pela API da Anthropic) em um loop com as ferramentas, respeitando o limite de iterações e de custo por tarefa.
6. **Processa as ferramentas** e confere a permissão de novo em cada chamada. Tudo fica em `tool_executions`.
7. **Valida a conclusão**. Texto solto não conclui tarefa: é preciso usar `entregar`, e a entrega passa pelos critérios do tipo (seções obrigatórias, links de fontes, arquivo ou briefing visual, tamanho mínimo). Afirmações como "publiquei" ou "enviei" sem uma ação aprovada e executada reprovam a entrega.
8. **Registra** o consumo (tokens e custo), os erros e a auditoria.
9. **Encaminha para revisão independente** quando o tipo exige. O revisor nunca é o autor; se for, a revisão sobe para o superior. Uma reprovação devolve a tarefa com o feedback. Depois de 2 reprovações, a tarefa é bloqueada e o superior é avisado.

Se houver falha do provedor, a tarefa ganha nova tentativa com espera crescente (até 3 tentativas) e depois é marcada como `falhou`, com aviso ao superior. Se o servidor reiniciar, as execuções interrompidas são marcadas e as tarefas voltam para a fila. O estado "trabalhando" de cada funcionário vem só de execuções reais em andamento.

## Aprovações do proprietário (`src/approvals.js`)

As ações abaixo só acontecem depois que você aprova:

- publicar campanha;
- enviar mensagem externa;
- enviar proposta definitiva;
- assinar contrato;
- fazer pagamento;
- contratar serviço;
- alterar orçamento de anúncios;
- excluir arquivo permanentemente;
- publicar em produção;
- alterar configuração crítica.

Cada funcionário só pode *pedir* as ações do seu cargo. O CEO também não pode aprovar. Depois da aprovação, a ação é executada pela integração correspondente. Se ela não estiver conectada, a aprovação fica como `aprovada_sem_integracao`, e nada é dado como feito. A auditoria guarda quem pediu, quem autorizou, quem executou e qual aprovação valeu.

## Rotinas no servidor (`src/scheduler.js`)

- **Agendador**: roda dentro do servidor e não depende do navegador. Cada rotina executa no máximo uma vez por dia, garantido por `UNIQUE(routine_id, data)`. As rotinas de início do dia e de acompanhamento não gastam IA. O relatório executivo do CEO só é pedido se houve atividade no dia.
- **Fila persistente**: as tarefas ficam no banco e cada uma é reservada com um bloqueio antes de executar. A fila trabalha só no expediente, executa no máximo `VOA_MAX_CONCURRENT` tarefas ao mesmo tempo e dá uma tarefa por funcionário de cada vez.

## Integrações (`src/tools/integrations.js`)

| Integração | Como conecta |
|---|---|
| IA (raciocínio e geração) | `ANTHROPIC_API_KEY` |
| Pesquisa web | Pesquisa do próprio Claude (ligada com a chave; `VOA_WEB_SEARCH=0` desliga) |
| Arquivos, CRM, livro-caixa | Internos, sempre ligados |
| Imagens, vídeo, CI, deploy, e-mail, calendário, redes sociais, anúncios, analytics, pagamentos, assinatura | Webhook HTTP: `IMAGE_WEBHOOK_URL`, `VIDEO_WEBHOOK_URL`, `CI_WEBHOOK_URL`, `DEPLOY_WEBHOOK_URL`, `EMAIL_WEBHOOK_URL`, `CALENDAR_WEBHOOK_URL`, `SOCIAL_WEBHOOK_URL`, `ADS_WEBHOOK_URL`, `ANALYTICS_WEBHOOK_URL`, `FINANCE_WEBHOOK_URL`, `SIGN_WEBHOOK_URL` (e `*_WEBHOOK_TOKEN` opcional) |

Como funciona o webhook:

- O sistema faz um `POST` com `{"acao": "...", "dados": {...}}` e `Authorization: Bearer <token>`, e espera JSON de volta.
- Para devolver arquivos, a resposta pode trazer `base64`, `mime` e `nome`, ou uma `url`.
- Funciona com n8n, Make, Zapier ou uma função própria que fale com o serviço real (Instagram, Meta Ads, Gmail etc.).

## Outras configurações (`.env`)

| Variável | Para que serve | Padrão |
|---|---|---|
| `PORT` | Porta do servidor | `3210` |
| `VOA_TIMEZONE` | Fuso horário | `America/Sao_Paulo` |
| `VOA_WORK_START` / `VOA_WORK_END` | Início e fim do expediente | `08:30` / `18:00` |
| `VOA_WORK_DAYS` | Dias de trabalho | `1,2,3,4,5` |
| `VOA_WORK_OUTSIDE_HOURS=1` | Trabalhar fora do expediente | desligado |
| `VOA_DAILY_BUDGET_USD` | Orçamento diário da empresa | `5` |
| `VOA_MAX_CONCURRENT` | Execuções ao mesmo tempo | `2` |
| `VOA_DEFAULT_MODEL` | Modelo usado no cadastro inicial | `claude-opus-5-5` |
| `PRICE_*` | Preço por milhão de tokens, para recalcular custos | — |

Modelo, esforço e limites de cada funcionário podem ser ajustados no perfil dele, na interface.

## Interface

A interface tem estas telas:

- **Escritório**: salas com o estado ao vivo de cada funcionário.
- **Organograma**.
- **Equipe**, com o perfil de cada um: competências, ferramentas, tarefas atuais e concluídas, execuções, qualidade, consumo e prompt de sistema.
- **Tarefas**: criar tarefas e iniciar fluxos.
- **Aprovações**.
- **Conversas** com qualquer funcionário, com contexto separado por cliente.
- **Clientes**.
- **Rotinas** e relatórios do dia.
- **Integrações**.
- **Custos**.
- **Auditoria**.
