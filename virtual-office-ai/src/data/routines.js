// Rotinas diárias executadas pelo agendador do servidor (src/scheduler.js).
// `fase` define o que a rotina faz: inicio (planos do dia), durante (acompanhamento), fim (relatórios).
// `horario` é a hora local (VOA_TIMEZONE) a partir da qual a rotina roda, no máximo uma vez por dia.
// `usa_ia` = 1 permite pedir o relatório executivo ao CEO (só quando houve atividade no dia).

export const ROUTINES = [
  {
    id: 'inicio-expediente', nome: 'Início do expediente', fase: 'inicio', horario: '08:30', usa_ia: 0,
    descricao: 'Monta o plano do dia de cada funcionário (prioridades, atrasadas e bloqueadas) e avisa a gerência de operações sobre atrasos. Não usa IA.',
  },
  {
    id: 'acompanhamento', nome: 'Acompanhamento do meio do dia', fase: 'durante', horario: '13:00', usa_ia: 0,
    descricao: 'Verifica tarefas bloqueadas, aguardando informação, com falha ou atrasadas e avisa os superiores e a gerência de operações. Não usa IA.',
  },
  {
    id: 'fim-expediente', nome: 'Fim do expediente', fase: 'fim', horario: '18:00', usa_ia: 1,
    descricao: 'Registra o relatório do dia de cada funcionário (concluídas, pendentes, custo) e, se houve atividade, pede ao CEO o relatório executivo para o proprietário.',
  },
];
