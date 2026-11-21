// Estrutura da agência: 7 departamentos e 12 salas do escritório visual.
// `diretor` é o slug do responsável pelo departamento; `dep` liga cada sala ao seu departamento.

export const DEPARTMENTS = [
  { id: 'diretoria', nome: 'Diretoria Executiva', diretor: 'ceo', descricao: 'Direção geral da agência: estratégia, prioridades, coordenação entre departamentos e relatórios ao proprietário.' },
  { id: 'marketing', nome: 'Marketing', diretor: 'diretor-marketing', descricao: 'Estratégia, pesquisa, conteúdo, criação, vídeo, branding, SEO, tráfego pago e análise de dados para os clientes.' },
  { id: 'comercial', nome: 'Comercial', diretor: 'diretor-comercial', descricao: 'Prospecção, vendas, propostas e gestão das contas de clientes.' },
  { id: 'atendimento', nome: 'Atendimento e Projetos', diretor: 'diretor-atendimento', descricao: 'Relacionamento com o cliente, briefings, planejamento e acompanhamento dos projetos até a entrega.' },
  { id: 'tecnologia', nome: 'Tecnologia', diretor: 'diretor-tecnologia', descricao: 'Sites, landing pages, automações, integrações e testes de qualidade de software.' },
  { id: 'financeiro', nome: 'Financeiro', diretor: 'diretor-financeiro', descricao: 'Livro-caixa, orçamentos de projetos, contas a pagar e receber e controle dos custos de IA.' },
  { id: 'administrativo', nome: 'Administrativo e Qualidade', diretor: 'diretor-administrativo', descricao: 'Rotinas administrativas, documentos, contratos e revisão independente de qualidade das entregas.' },
];

export const ROOMS = [
  { id: 'sala-diretoria', nome: 'Sala da Diretoria', dep: 'diretoria', descricao: 'CEO e gerência de operações' },
  { id: 'sala-estrategia', nome: 'Sala de Estratégia', dep: 'marketing', descricao: 'Planejamento, pesquisa e dados' },
  { id: 'estudio-conteudo', nome: 'Estúdio de Conteúdo', dep: 'marketing', descricao: 'Redes sociais e redação' },
  { id: 'estudio-criacao', nome: 'Estúdio de Criação', dep: 'marketing', descricao: 'Design, direção de arte e branding' },
  { id: 'estudio-video', nome: 'Estúdio de Vídeo', dep: 'marketing', descricao: 'Roteiro, gravação e edição' },
  { id: 'sala-performance', nome: 'Sala de Performance', dep: 'marketing', descricao: 'SEO e tráfego pago' },
  { id: 'sala-comercial', nome: 'Sala Comercial', dep: 'comercial', descricao: 'Pré-vendas, vendas e contas' },
  { id: 'central-atendimento', nome: 'Central de Atendimento', dep: 'atendimento', descricao: 'Relacionamento com clientes' },
  { id: 'sala-projetos', nome: 'Sala de Projetos', dep: 'atendimento', descricao: 'Planejamento e acompanhamento de entregas' },
  { id: 'laboratorio-tecnologia', nome: 'Laboratório de Tecnologia', dep: 'tecnologia', descricao: 'Desenvolvimento, automações e QA' },
  { id: 'sala-financeiro', nome: 'Sala do Financeiro', dep: 'financeiro', descricao: 'Caixa, orçamentos e custos' },
  { id: 'sala-administrativo', nome: 'Administrativo e Qualidade', dep: 'administrativo', descricao: 'Documentos, contratos e revisão de qualidade' },
];
