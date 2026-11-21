// Tipos de tarefa da agência e seus critérios de conclusão.
// Cada tipo declara:
//   nome            — rótulo exibido
//   secoes          — elementos obrigatórios da entrega; `padrao` é uma expressão regular testada
//                     sobre o texto normalizado (minúsculas, sem acentos — veja normalize)
//   minChars        — tamanho mínimo do conteúdo entregue
//   requerUrl       — exige fontes verificáveis com link http(s)
//   arquivoOuSecao  — exige arquivo anexado OU uma seção descritiva (ex.: briefing visual)
//   revisor         — slug do revisor independente padrão (null = sem revisão obrigatória)
//   conversa        — conversa direta com o proprietário (não passa por validação)

// Texto em minúsculas e sem acentos, para comparar critérios sem depender de grafia
export function normalize(s) {
  return String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

// Afirmações de ação externa/irreversível. Só valem se houver aprovação executada na tarefa.
// Testada sobre o texto normalizado.
export const EXTERNAL_CLAIMS = new RegExp([
  'publiquei', 'publicamos', 'foi publicad[oa]s?', 'publicad[oa]s? com sucesso', 'ja (esta|estao) no ar', 'publicad[oa]s? em producao',
  'enviei', 'enviamos', 'foi enviad[oa]s?', 'enviad[oa]s? com sucesso', 'e-?mail enviado', 'mensagem enviada', 'proposta enviada',
  'paguei', 'pagamos', 'pagamento (foi )?(efetuado|realizado|feito)',
  'assinei', 'assinamos', 'contrato (foi )?assinado',
  'contratei', 'contratamos', 'servico (foi )?contratado',
  'ativei a campanha', 'campanha (foi )?(ativada|publicada|no ar)', 'orcamento (foi )?(alterado|aumentado|reduzido) na plataforma',
  'deploy (foi )?(feito|realizado)', 'subi para producao', 'site (foi )?publicado',
  'arquivo (foi )?excluido permanentemente',
].map((p) => `\\b${p}\\b`).join('|'));

const s = (nome, padrao) => ({ nome, padrao });
const VISUAL = { nome: 'briefing visual descrito (layout, cores, tipografia)', padrao: 'briefing visual|especificacao visual|layout descrito' };
const EDICAO = { nome: 'roteiro de edição descrito (cortes, trilha, legendas)', padrao: 'roteiro de edicao|decupagem|briefing visual' };

const T = (nome, secoes, opts = {}) => ({ nome, secoes, minChars: 400, requerUrl: false, arquivoOuSecao: null, revisor: 'revisor-qualidade', ...opts });

export const TASK_TYPES = {
  // ─── Gerais ───
  conversa: T('Conversa direta com o proprietário', [], { minChars: 0, revisor: null, conversa: true }),
  tarefa_geral: T('Tarefa geral', [s('Resumo', 'resumo'), s('Resultado', 'resultado'), s('Próximos passos', 'proximos passos')], { minChars: 300 }),
  revisao_qualidade: T('Revisão de qualidade', [], { minChars: 0, revisor: null }),

  // ─── Diretoria executiva ───
  relatorio_executivo: T('Relatório executivo', [s('Resumo do dia', 'resumo'), s('Entregas concluídas', 'concluid|entregas'), s('Pendências e riscos', 'pendencia|risco'), s('Próximos passos', 'proximos passos')], { minChars: 500, revisor: null }),
  plano_estrategico: T('Plano estratégico da empresa', [s('Diagnóstico', 'diagnostico'), s('Objetivos', 'objetivo'), s('Iniciativas', 'iniciativa'), s('Responsáveis e prazos', 'responsave|prazo'), s('Indicadores', 'indicador|kpi')], { minChars: 800, revisor: null }),
  plano_operacional: T('Plano operacional', [s('Prioridades', 'prioridade'), s('Alocação da equipe', 'alocacao|equipe'), s('Cronograma', 'cronograma|prazo'), s('Riscos e gargalos', 'risco|gargalo')], { minChars: 600, revisor: 'ceo' }),

  // ─── Marketing ───
  estrategia_marketing: T('Estratégia de marketing', [s('Diagnóstico', 'diagnostico'), s('Público-alvo', 'publico'), s('Posicionamento', 'posicionamento'), s('Canais', 'canai|canal'), s('Metas e indicadores', 'meta|indicador|kpi'), s('Cronograma', 'cronograma')], { minChars: 900, revisor: 'diretor-marketing' }),
  plano_campanha: T('Plano de campanha', [s('Objetivo da campanha', 'objetivo'), s('Público-alvo', 'publico'), s('Mensagem central', 'mensagem'), s('Canais e formatos', 'canai|formato'), s('Orçamento estimado', 'orcamento'), s('Indicadores de sucesso', 'indicador|kpi')], { minChars: 800, revisor: 'diretor-marketing' }),
  pesquisa_mercado: T('Pesquisa de mercado', [s('Objetivo da pesquisa', 'objetivo'), s('Metodologia', 'metodologia'), s('Principais achados', 'achado'), s('Fontes', 'fonte'), s('Fatos e hipóteses', 'fato|hipotese')], { minChars: 800, requerUrl: true }),
  analise_concorrencia: T('Análise de concorrência', [s('Concorrentes analisados', 'concorrente'), s('Pontos fortes e fracos', 'forte|fraco'), s('Oportunidades', 'oportunidade'), s('Fontes', 'fonte')], { minChars: 700, requerUrl: true }),
  calendario_editorial: T('Calendário editorial', [s('Período', 'periodo'), s('Datas e horários', 'data|horario'), s('Formatos', 'formato'), s('Temas e pautas', 'tema|pauta'), s('Legendas', 'legenda'), s('Hashtags', 'hashtag')], { minChars: 600, revisor: 'diretor-marketing' }),
  post_social: T('Pauta de post para redes sociais', [s('Objetivo do post', 'objetivo'), s('Formato', 'formato'), s('Legenda', 'legenda'), s('Chamada para ação (CTA)', 'cta|chamada para acao')], { minChars: 400 }),
  copy: T('Copy / redação publicitária', [s('Público-alvo', 'publico'), s('Headline', 'headline|titulo'), s('Texto principal', 'texto principal|corpo do texto'), s('Chamada para ação (CTA)', 'cta|chamada para acao')], { minChars: 500 }),
  roteiro_video: T('Roteiro de vídeo', [s('Objetivo do vídeo', 'objetivo'), s('Gancho inicial', 'gancho'), s('Cenas', 'cena'), s('Falas e narração', 'fala|narracao'), s('Chamada para ação (CTA)', 'cta|chamada para acao')], { minChars: 600 }),
  design_peca: T('Peça gráfica', [s('Formato e dimensões', 'formato|dimens'), s('Composição', 'composicao'), s('Paleta de cores', 'paleta|cores'), s('Tipografia', 'tipografia')], { minChars: 400, arquivoOuSecao: VISUAL, revisor: 'diretor-arte' }),
  direcao_arte: T('Direção de arte', [s('Conceito visual', 'conceito'), s('Referências', 'referencia'), s('Paleta de cores', 'paleta|cores'), s('Diretrizes de aplicação', 'diretriz')], { minChars: 600, arquivoOuSecao: VISUAL, revisor: 'diretor-marketing' }),
  edicao_video: T('Edição de vídeo', [s('Formato e duração', 'formato|duracao'), s('Estrutura de cortes', 'corte'), s('Trilha e áudio', 'trilha|audio'), s('Legendas', 'legenda')], { minChars: 400, arquivoOuSecao: EDICAO, revisor: 'diretor-arte' }),
  branding: T('Branding / identidade de marca', [s('Propósito e valores', 'proposito|valores'), s('Personalidade da marca', 'personalidade'), s('Tom de voz', 'tom de voz'), s('Identidade visual', 'identidade visual'), s('Aplicações', 'aplicac')], { minChars: 800, revisor: 'diretor-arte' }),
  seo: T('SEO', [s('Palavras-chave', 'palavras?-chave|palavra chave'), s('Intenção de busca', 'intencao de busca'), s('Recomendações on-page', 'on-page|on page'), s('Estrutura de conteúdo', 'estrutura'), s('Prioridades', 'prioridade')], { minChars: 600 }),
  plano_trafego: T('Plano de tráfego pago', [s('Objetivo', 'objetivo'), s('Plataformas', 'plataforma'), s('Segmentação', 'segmentacao'), s('Orçamento proposto', 'orcamento'), s('Criativos', 'criativo'), s('Métricas de acompanhamento', 'metrica|kpi')], { minChars: 700, revisor: 'diretor-marketing' }),
  relatorio_desempenho: T('Relatório de desempenho', [s('Período analisado', 'periodo'), s('Fonte dos dados', 'fonte'), s('Métricas', 'metrica'), s('Análise', 'analise'), s('Recomendações', 'recomendac')], { minChars: 600, revisor: 'diretor-marketing' }),

  // ─── Comercial ───
  prospeccao: T('Prospecção de leads', [s('Perfil de cliente ideal', 'perfil|cliente ideal'), s('Leads encontrados', 'lead'), s('Qualificação', 'qualificacao'), s('Fontes', 'fonte'), s('Abordagem sugerida', 'abordagem')], { minChars: 500, requerUrl: true, revisor: 'diretor-comercial' }),
  proposta_comercial: T('Proposta comercial (rascunho)', [s('Contexto do cliente', 'contexto'), s('Escopo', 'escopo'), s('Investimento', 'investimento'), s('Prazos', 'prazo'), s('Condições', 'condic')], { minChars: 700, revisor: 'diretor-comercial' }),
  plano_conta: T('Plano de conta', [s('Situação da conta', 'situacao'), s('Objetivos do cliente', 'objetivo'), s('Oportunidades de expansão', 'oportunidade|expansao'), s('Riscos', 'risco'), s('Plano de ação', 'plano de acao')], { minChars: 600, revisor: 'diretor-comercial' }),
  plano_comercial: T('Plano comercial', [s('Metas comerciais', 'meta'), s('Funil de vendas', 'funil'), s('Segmentos prioritários', 'segmento'), s('Ações', 'acoes|acao'), s('Indicadores', 'indicador|kpi')], { minChars: 700, revisor: 'ceo' }),

  // ─── Atendimento e projetos ───
  atendimento_cliente: T('Atendimento ao cliente', [s('Solicitação do cliente', 'solicitacao'), s('Resposta proposta', 'resposta'), s('Encaminhamentos', 'encaminhamento'), s('Prazo de retorno', 'prazo')], { minChars: 300, revisor: 'diretor-atendimento' }),
  briefing_cliente: T('Briefing do cliente', [s('Contexto', 'contexto'), s('Objetivos', 'objetivo'), s('Público-alvo', 'publico'), s('Entregáveis', 'entregave'), s('Prazos', 'prazo'), s('Restrições', 'restric')], { minChars: 500, revisor: 'diretor-atendimento' }),
  plano_projeto: T('Plano de projeto', [s('Escopo', 'escopo'), s('Etapas', 'etapa'), s('Responsáveis', 'responsave'), s('Cronograma', 'cronograma'), s('Riscos', 'risco')], { minChars: 600, revisor: 'diretor-atendimento' }),

  // ─── Tecnologia ───
  arquitetura_tecnica: T('Arquitetura técnica', [s('Requisitos', 'requisito'), s('Arquitetura proposta', 'arquitetura'), s('Tecnologias', 'tecnologia'), s('Segurança', 'seguranca'), s('Riscos técnicos', 'risco')], { minChars: 700, revisor: 'qa' }),
  layout_web: T('Layout de página web', [s('Estrutura da página', 'estrutura'), s('Seções e hierarquia', 'secoes|hierarquia'), s('Versão mobile', 'mobile'), s('Componentes', 'componente')], { minChars: 500, arquivoOuSecao: VISUAL, revisor: 'diretor-arte' }),
  desenvolvimento_web: T('Desenvolvimento web', [s('Requisitos atendidos', 'requisito'), s('Implementação', 'implementacao'), s('Como testar', 'como testar|teste'), s('Pendências', 'pendencia')], { minChars: 600, revisor: 'qa' }),
  automacao: T('Automação', [s('Processo automatizado', 'processo'), s('Gatilhos', 'gatilho'), s('Fluxo de dados', 'fluxo'), s('Tratamento de erros', 'tratamento de erro|erros'), s('Como testar', 'como testar|teste')], { minChars: 600, revisor: 'qa' }),
  teste_qa: T('Testes de qualidade (QA)', [s('Escopo testado', 'escopo'), s('Casos de teste', 'casos? de teste'), s('Resultados', 'resultado'), s('Defeitos encontrados', 'defeito|bug'), s('Recomendação', 'recomendac')], { minChars: 500, revisor: 'diretor-tecnologia' }),

  // ─── Financeiro ───
  relatorio_financeiro: T('Relatório financeiro', [s('Período', 'periodo'), s('Receitas', 'receita'), s('Despesas', 'despesa'), s('Resultado', 'resultado'), s('Observações', 'observac')], { minChars: 500, revisor: 'diretor-financeiro' }),
  orcamento_projeto: T('Orçamento de projeto', [s('Escopo orçado', 'escopo'), s('Custos', 'custo'), s('Margem', 'margem'), s('Premissas', 'premissa')], { minChars: 500, revisor: 'diretor-financeiro' }),

  // ─── Administrativo e qualidade ───
  rotina_administrativa: T('Rotina administrativa', [s('Atividades realizadas', 'atividade'), s('Documentos', 'documento'), s('Pendências', 'pendencia')], { minChars: 300, revisor: 'diretor-administrativo' }),
  processo_qualidade: T('Processo de qualidade', [s('Objetivo do processo', 'objetivo'), s('Etapas', 'etapa'), s('Checklist', 'checklist'), s('Responsáveis', 'responsave'), s('Indicadores', 'indicador|kpi')], { minChars: 600, revisor: 'ceo' }),
};
