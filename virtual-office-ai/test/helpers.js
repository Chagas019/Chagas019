import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createApp } from '../src/app.js';
import { getConfig } from '../src/config.js';
import { scriptedProvider, toolUse, text } from '../src/providers/index.js';
import { TASK_TYPES, normalize } from '../src/data/taskTypes.js';

export function tmpEnv(extra = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'voa-test-'));
  return { VOA_DATA_DIR: dir, OWNER_TOKEN: 'segredo-de-teste', VOA_WORK_OUTSIDE_HOURS: '1', VOA_DAILY_BUDGET_USD: '100', ...extra };
}

export function makeApp({ env = tmpEnv(), provider = smartProvider(), fetchImpl } = {}) {
  const app = createApp({ env, config: getConfig(env), provider, fetchImpl });
  return { ...app, env };
}

// Gera um texto que contém todos os elementos exigidos pelo tipo de tarefa
export function validContent(tipo) {
  const tt = TASK_TYPES[tipo];
  const parts = [];
  for (const s of tt.secoes) {
    const re = new RegExp(s.padrao);
    const cands = [normalize(s.nome), ...s.padrao.split('|').filter((a) => !/[()[\]]/.test(a))];
    const sample = cands.find((c) => re.test(c)) || normalize(s.nome);
    parts.push(`## ${s.nome} (${sample})\nConteúdo detalhado sobre ${sample}.`);
  }
  if (tt.requerUrl) parts.push('Fonte: https://exemplo.org/relatorio (acessado em 2026-10-01). Fato verificado vs. hipótese.');
  if (tt.arquivoOuSecao) parts.push('## Briefing visual\nLayout descrito; roteiro de edicao incluso.');
  let out = parts.join('\n\n');
  while (out.length < tt.minChars + 20) out += '\nDetalhamento adicional da entrega com informações registradas.';
  return out;
}

function taskTypeFromPrompt(req) {
  const first = typeof req.messages[0].content === 'string' ? req.messages[0].content : '';
  return first.match(/^Tipo: (\w+)/m)?.[1];
}

// Provedor simulado: entrega conteúdo válido para o tipo ou aprova revisões
export function smartProvider(overrides = {}) {
  return scriptedProvider((req, i) => {
    const tipo = taskTypeFromPrompt(req);
    if (overrides[tipo]) return overrides[tipo](req, i);
    const last = req.messages[req.messages.length - 1];
    if (Array.isArray(last.content) && last.content[0]?.type === 'tool_result') return { stop_reason: 'end_turn', content: [text('ok')] };
    if (!tipo) return { stop_reason: 'end_turn', content: [text('Resposta do funcionário.')] };
    if (tipo === 'revisao_qualidade') return { stop_reason: 'tool_use', content: [toolUse('revisar_entrega', { decisao: 'aprovar', motivos: ['Critérios atendidos'] })] };
    return { stop_reason: 'tool_use', content: [toolUse('entregar', { titulo: `Entrega ${tipo}`, conteudo: validContent(tipo) })] };
  });
}

export { toolUse, text, scriptedProvider };
