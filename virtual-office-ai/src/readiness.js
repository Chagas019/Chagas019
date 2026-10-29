// Relatório de prontidão: quais funcionários estão operacionais e o que depende de credenciais.
import { P } from './db.js';
import { integrationStatus } from './tools/integrations.js';
import { TOOLS } from './tools/registry.js';

export function readiness(db, env = process.env) {
  const integ = integrationStatus(env);
  const conectado = (id) => id === 'interno' || !!integ.find((i) => i.id === id && i.conectado);
  const ia = conectado('ia');
  const funcionarios = db.prepare('SELECT numero, slug, nome, cargo, ferramentas, ativo FROM employees ORDER BY numero').all().map((e) => {
    const ferr = P(e.ferramentas, []);
    const faltando = ferr.filter((f) => TOOLS[f] && !conectado(TOOLS[f].integracao));
    return {
      numero: e.numero, slug: e.slug, nome: e.nome, cargo: e.cargo,
      operacional: ia && !!e.ativo,
      completo: ia && !!e.ativo && faltando.length === 0,
      ferramentas_sem_integracao: faltando,
    };
  });
  return { provedor_ia: ia, integracoes: integ.map(({ id, nome, conectado: c, faltando }) => ({ id, nome, conectado: c, faltando })), funcionarios };
}

export function printReadiness(r, log = console.log) {
  log(`\nProvedor de IA: ${r.provedor_ia ? 'CONECTADO' : 'NÃO CONECTADO — defina ANTHROPIC_API_KEY no .env para os funcionários trabalharem'}`);
  log('\nIntegrações:');
  for (const i of r.integracoes) log(`  ${i.conectado ? '✔' : '✘'} ${i.nome}${i.conectado ? '' : `  (configure ${i.faltando.join(', ')})`}`);
  log('\nFuncionários:');
  for (const f of r.funcionarios) {
    const st = !f.operacional ? 'aguardando provedor de IA' : f.completo ? 'operacional (todas as ferramentas)' : `operacional com limitações: sem ${f.ferramentas_sem_integracao.join(', ')}`;
    log(`  ${String(f.numero).padStart(2)}. ${f.nome} — ${f.cargo}: ${st}`);
  }
}
