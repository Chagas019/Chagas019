// Fluxos de trabalho entre departamentos. Cada etapa vira uma tarefa encadeada por dependências
// (src/tasks.js → startWorkflow). As revisões do fluxo são etapas do tipo revisao_qualidade cujos
// alvos são as dependências diretas.

export const WORKFLOWS = {
  pacote_social: {
    nome: 'Pacote de post para redes sociais',
    descricao: 'Social media define a pauta → designer cria a arte → diretora de arte revisa → copywriter escreve o texto → revisor de qualidade confere texto e arte → gerente de projetos valida contra o briefing → CEO dá o aval final.',
    etapas: [
      { chave: 'pauta', titulo: 'Pauta e objetivo do post', tipo: 'post_social', responsavel: 'social-media', criterios: ['Objetivo, formato, legenda-base e CTA definidos a partir do briefing'] },
      { chave: 'arte', titulo: 'Arte do post', tipo: 'design_peca', responsavel: 'designer-grafico', depende: ['pauta'], criterios: ['Formato adequado à rede', 'Arquivo ou briefing visual completo'] },
      { chave: 'revisao_arte', titulo: 'Revisão da arte (direção de arte)', tipo: 'revisao_qualidade', responsavel: 'diretor-arte', depende: ['arte'], criterios: ['Arte coerente com a marca e com a pauta'] },
      { chave: 'texto', titulo: 'Texto e legenda final', tipo: 'copy', responsavel: 'copywriter', depende: ['revisao_arte'], criterios: ['Texto alinhado à arte aprovada', 'CTA claro'] },
      { chave: 'revisao_texto', titulo: 'Revisão de texto e consistência com a arte', tipo: 'revisao_qualidade', responsavel: 'revisor-qualidade', depende: ['arte', 'texto'], criterios: ['Sem erros de português', 'Texto e arte consistentes'] },
      { chave: 'revisao_final', titulo: 'Validação do pacote contra o briefing', tipo: 'revisao_qualidade', responsavel: 'gerente-projetos', depende: ['revisao_arte', 'revisao_texto'], criterios: ['Pacote atende ao briefing e ao prazo'] },
      { chave: 'aprovacao_ceo', titulo: 'Aval final do CEO', tipo: 'revisao_qualidade', responsavel: 'ceo', depende: ['revisao_final'], criterios: ['Pacote pronto para pedir aprovação de publicação ao proprietário'] },
    ],
  },
  campanha_completa: {
    nome: 'Campanha completa',
    descricao: 'Pesquisa → plano de campanha → copy, peças, roteiro de vídeo e plano de tráfego em paralelo → revisão de qualidade → revisão da diretora de marketing → aval do CEO.',
    etapas: [
      { chave: 'pesquisa', titulo: 'Pesquisa de mercado e público', tipo: 'pesquisa_mercado', responsavel: 'pesquisador-mercado', criterios: ['Fontes verificáveis com links', 'Fatos separados de hipóteses'] },
      { chave: 'plano', titulo: 'Plano da campanha', tipo: 'plano_campanha', responsavel: 'estrategista-marketing', depende: ['pesquisa'], criterios: ['Objetivo, público, mensagem, canais, orçamento e KPIs'] },
      { chave: 'copy', titulo: 'Textos da campanha', tipo: 'copy', responsavel: 'copywriter', depende: ['plano'], criterios: ['Headlines e CTAs por canal'] },
      { chave: 'pecas', titulo: 'Peças gráficas da campanha', tipo: 'design_peca', responsavel: 'designer-grafico', depende: ['plano'], criterios: ['Peças nos formatos dos canais do plano'] },
      { chave: 'video', titulo: 'Roteiro do vídeo da campanha', tipo: 'roteiro_video', responsavel: 'videomaker-roteirista', depende: ['plano'], criterios: ['Gancho nos primeiros segundos', 'CTA'] },
      { chave: 'trafego', titulo: 'Plano de mídia paga', tipo: 'plano_trafego', responsavel: 'especialista-trafego', depende: ['plano'], criterios: ['Orçamento proposto (alteração só com aprovação do proprietário)'] },
      { chave: 'revisao_criativos', titulo: 'Revisão de qualidade dos criativos', tipo: 'revisao_qualidade', responsavel: 'revisor-qualidade', depende: ['copy', 'pecas', 'video'], criterios: ['Criativos consistentes entre si e com o plano'] },
      { chave: 'revisao_cmo', titulo: 'Revisão da diretora de marketing', tipo: 'revisao_qualidade', responsavel: 'diretor-marketing', depende: ['revisao_criativos', 'trafego'], criterios: ['Campanha coerente com a estratégia do cliente'] },
      { chave: 'aprovacao_ceo', titulo: 'Aval final do CEO', tipo: 'revisao_qualidade', responsavel: 'ceo', depende: ['revisao_cmo'], criterios: ['Campanha pronta para pedir aprovação de publicação ao proprietário'] },
    ],
  },
  landing_page: {
    nome: 'Landing page',
    descricao: 'Briefing → copy e layout → SEO → desenvolvimento → testes de QA → revisão do diretor de tecnologia.',
    etapas: [
      { chave: 'briefing', titulo: 'Briefing da landing page', tipo: 'briefing_cliente', responsavel: 'gerente-projetos', criterios: ['Objetivo, público, oferta e prazos definidos'] },
      { chave: 'copy', titulo: 'Textos da landing page', tipo: 'copy', responsavel: 'copywriter', depende: ['briefing'], criterios: ['Headline, benefícios, prova e CTA'] },
      { chave: 'layout', titulo: 'Layout da landing page', tipo: 'layout_web', responsavel: 'designer-grafico', depende: ['briefing'], criterios: ['Versão desktop e mobile descritas'] },
      { chave: 'seo', titulo: 'SEO da landing page', tipo: 'seo', responsavel: 'especialista-seo', depende: ['copy'], criterios: ['Palavras-chave, título e meta descrição'] },
      { chave: 'desenvolvimento', titulo: 'Desenvolvimento da landing page', tipo: 'desenvolvimento_web', responsavel: 'desenvolvedor-web', depende: ['copy', 'layout', 'seo'], criterios: ['Página responsiva, acessível e rápida', 'Publicação em produção só com aprovação'] },
      { chave: 'testes', titulo: 'Testes da landing page', tipo: 'teste_qa', responsavel: 'qa', depende: ['desenvolvimento'], criterios: ['Formulários, links, responsividade e desempenho testados'] },
      { chave: 'revisao_final', titulo: 'Revisão técnica final', tipo: 'revisao_qualidade', responsavel: 'diretor-tecnologia', depende: ['testes'], criterios: ['Pronta para pedir aprovação de publicação ao proprietário'] },
    ],
  },
};
