// Adaptadores de integração. Cada um declara as variáveis de ambiente que o conectam.
// Integrações "internas" funcionam sempre (banco e disco locais). As externas usam um webhook HTTP
// (n8n, Make, Zapier, função própria etc.) que recebe {acao, dados} e responde JSON.
export const INTEGRATIONS = [
  { id: 'ia', nome: 'Provedor de IA (Anthropic Claude)', tipo: 'ia', env: ['ANTHROPIC_API_KEY'], alt: ['ANTHROPIC_AUTH_TOKEN'], uso: 'Raciocínio e geração de conteúdo de todos os funcionários.' },
  { id: 'pesquisa_web', nome: 'Pesquisa web', tipo: 'ia', env: ['ANTHROPIC_API_KEY'], alt: ['ANTHROPIC_AUTH_TOKEN'], desligavel: 'VOA_WEB_SEARCH', uso: 'Ferramenta de busca do próprio provedor de IA, com fontes e links.' },
  { id: 'armazenamento', nome: 'Armazenamento de arquivos (disco local)', tipo: 'interno', env: [], uso: 'Salvar entregas, layouts, código e documentos por cliente.' },
  { id: 'crm', nome: 'CRM interno', tipo: 'interno', env: [], uso: 'Leads, etapas do funil e histórico comercial.' },
  { id: 'financeiro', nome: 'Livro-caixa interno', tipo: 'interno', env: [], uso: 'Lançamentos, contas a pagar/receber e custos de IA.' },
  { id: 'imagem', nome: 'Geração de imagens', tipo: 'webhook', env: ['IMAGE_WEBHOOK_URL'], uso: 'Designer e diretor de arte geram arquivos gráficos reais.' },
  { id: 'video', nome: 'Edição/renderização de vídeo', tipo: 'webhook', env: ['VIDEO_WEBHOOK_URL'], uso: 'Editor de vídeo renderiza vídeos.' },
  { id: 'ci', nome: 'Desenvolvimento e testes (CI)', tipo: 'webhook', env: ['CI_WEBHOOK_URL'], uso: 'Rodar testes e publicar em homologação.' },
  { id: 'deploy', nome: 'Publicação em produção', tipo: 'webhook', env: ['DEPLOY_WEBHOOK_URL'], uso: 'Publicar sites em produção (sempre com aprovação).' },
  { id: 'email', nome: 'E-mail', tipo: 'webhook', env: ['EMAIL_WEBHOOK_URL'], uso: 'Enviar mensagens e propostas (sempre com aprovação).' },
  { id: 'calendario', nome: 'Calendário', tipo: 'webhook', env: ['CALENDAR_WEBHOOK_URL'], uso: 'Consultar e marcar reuniões.' },
  { id: 'social', nome: 'Publicação em redes sociais', tipo: 'webhook', env: ['SOCIAL_WEBHOOK_URL'], uso: 'Publicar posts e campanhas (sempre com aprovação).' },
  { id: 'anuncios', nome: 'Plataformas de anúncios', tipo: 'webhook', env: ['ADS_WEBHOOK_URL'], uso: 'Ativar campanhas e alterar orçamentos (sempre com aprovação).' },
  { id: 'analytics', nome: 'Analytics', tipo: 'webhook', env: ['ANALYTICS_WEBHOOK_URL'], uso: 'Métricas reais de sites, redes e campanhas.' },
  { id: 'pagamentos', nome: 'Sistema financeiro externo / pagamentos', tipo: 'webhook', env: ['FINANCE_WEBHOOK_URL'], uso: 'Pagamentos e contratações (sempre com aprovação).' },
  { id: 'assinatura', nome: 'Assinatura de contratos', tipo: 'webhook', env: ['SIGN_WEBHOOK_URL'], uso: 'Assinatura eletrônica (sempre com aprovação).' },
];

export function integrationStatus(env = process.env) {
  return INTEGRATIONS.map((i) => {
    let conectado = i.tipo === 'interno' || i.env.every((v) => env[v]) || (i.alt && i.alt.every((v) => env[v]));
    if (i.desligavel && env[i.desligavel] === '0') conectado = false;
    return { ...i, conectado, faltando: conectado ? [] : i.env };
  });
}

export const isConnected = (id, env = process.env) => !!integrationStatus(env).find((i) => i.id === id && i.conectado);

// Chamada real ao webhook de uma integração externa.
export async function callWebhook(id, acao, dados, env = process.env, fetchImpl = fetch) {
  const integ = INTEGRATIONS.find((i) => i.id === id);
  if (!integ || integ.tipo !== 'webhook') throw new Error(`integração ${id} não é externa`);
  if (!isConnected(id, env)) return { ok: false, nao_conectado: true, erro: `Integração "${integ.nome}" não conectada. Configure ${integ.env.join(', ')}.` };
  const url = env[integ.env[0]];
  const token = env[integ.env[0].replace('_URL', '_TOKEN')];
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 60000);
  try {
    const res = await fetchImpl(url, {
      method: 'POST', signal: ctrl.signal,
      headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ acao, dados }),
    });
    const text = await res.text();
    let body; try { body = JSON.parse(text); } catch { body = { texto: text.slice(0, 2000) }; }
    return res.ok ? { ok: true, resposta: body } : { ok: false, erro: `HTTP ${res.status}`, resposta: body };
  } catch (e) {
    return { ok: false, erro: e.name === 'AbortError' ? 'tempo esgotado' : e.message };
  } finally { clearTimeout(timer); }
}
