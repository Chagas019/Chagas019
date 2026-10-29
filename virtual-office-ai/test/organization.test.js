import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { getConfig } from '../src/config.js';
import { getEmployee } from '../src/tasks.js';
import { EMPLOYEES } from '../src/data/employees.js';
import { makeApp, tmpEnv } from './helpers.js';

test('cadastro automático dos 31 funcionários com todos os campos', () => {
  const { db } = makeApp();
  const rows = db.prepare('SELECT * FROM employees ORDER BY numero').all();
  assert.equal(rows.length, 31);
  assert.deepEqual(rows.map((r) => r.numero), Array.from({ length: 31 }, (_, i) => i + 1));
  for (const r of rows) {
    for (const k of ['nome', 'avatar', 'cargo', 'departamento_id', 'sala_id', 'descricao', 'objetivos', 'responsabilidades', 'competencias', 'system_prompt',
      'ferramentas', 'tipos_tarefa', 'criterios_qualidade', 'regras_delegacao', 'limites_custo', 'rotina', 'kpis', 'estado', 'modelo']) {
      assert.ok(r[k] !== null && r[k] !== '', `${r.slug}.${k} vazio`);
    }
    assert.equal(r.estado, 'disponivel');
  }
  assert.equal(db.prepare('SELECT COUNT(*) n FROM departments').get().n, 7);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM rooms').get().n, 12);
  // Todo funcionário aparece em uma sala e em um departamento existentes
  assert.equal(db.prepare('SELECT COUNT(*) n FROM employees e JOIN rooms r ON r.id=e.sala_id JOIN departments d ON d.id=e.departamento_id').get().n, 31);
});

test('reinicialização não duplica e preserva estado, modelo e histórico', () => {
  const env = tmpEnv();
  const a = createApp({ env, config: getConfig(env), provider: null });
  a.db.prepare(`UPDATE employees SET modelo='claude-haiku-5-5' WHERE slug='sdr'`).run();
  a.db.prepare(`INSERT INTO clients (nome, created_at) VALUES ('Cliente X', 'x')`).run();
  a.db.close();
  const b = createApp({ env, config: getConfig(env), provider: null });
  const c = createApp({ env, config: getConfig(env), provider: null });
  assert.equal(c.boot.seeded.funcionarios_criados, 0);
  assert.equal(c.db.prepare('SELECT COUNT(*) n FROM employees').get().n, 31);
  assert.equal(c.db.prepare('SELECT COUNT(*) n FROM departments').get().n, 7);
  assert.equal(c.db.prepare('SELECT COUNT(*) n FROM routines').get().n, 3);
  assert.equal(c.db.prepare(`SELECT modelo FROM employees WHERE slug='sdr'`).get().modelo, 'claude-haiku-5-5');
  assert.equal(c.db.prepare('SELECT COUNT(*) n FROM clients').get().n, 1);
  b.db.close();
});

test('hierarquia correta', () => {
  const { db } = makeApp();
  const sup = Object.fromEntries(db.prepare('SELECT slug, superior_slug FROM employees').all().map((r) => [r.slug, r.superior_slug]));
  assert.equal(sup.ceo, null);
  for (const d of ['gerente-operacoes', 'diretor-marketing', 'diretor-comercial', 'diretor-atendimento', 'diretor-tecnologia', 'diretor-financeiro', 'diretor-administrativo']) assert.equal(sup[d], 'ceo', d);
  for (const m of ['estrategista-marketing', 'pesquisador-mercado', 'social-media', 'copywriter', 'designer-grafico', 'diretor-arte', 'videomaker-roteirista', 'editor-video', 'especialista-branding', 'especialista-seo', 'especialista-trafego', 'analista-dados']) assert.equal(sup[m], 'diretor-marketing', m);
  for (const c of ['sdr', 'executivo-vendas', 'gerente-contas']) assert.equal(sup[c], 'diretor-comercial');
  for (const c of ['atendimento-cliente', 'gerente-projetos']) assert.equal(sup[c], 'diretor-atendimento');
  for (const c of ['desenvolvedor-web', 'desenvolvedor-automacoes', 'qa']) assert.equal(sup[c], 'diretor-tecnologia');
  assert.equal(sup['analista-financeiro'], 'diretor-financeiro');
  for (const c of ['assistente-administrativo', 'revisor-qualidade']) assert.equal(sup[c], 'diretor-administrativo');
  // Sem ciclos: todos chegam ao CEO
  for (const s of Object.keys(sup)) { let x = s; let n = 0; while (sup[x]) { x = sup[x]; assert.ok(++n < 10); } assert.equal(x, 'ceo'); }
});

test('prompts exclusivos e permissões por cargo', () => {
  const { db } = makeApp();
  const prompts = db.prepare('SELECT slug, nome, cargo, system_prompt FROM employees').all();
  assert.equal(new Set(prompts.map((p) => p.system_prompt)).size, 31);
  for (const p of prompts) {
    assert.ok(p.system_prompt.includes(p.nome) && p.system_prompt.includes(p.cargo));
    assert.ok(p.system_prompt.includes(EMPLOYEES.find((e) => e.slug === p.slug).instrucao));
  }
  const ceo = getEmployee(db, 'ceo');
  assert.ok(ceo.system_prompt.includes('nunca ultrapasse as permissões'));
  assert.ok(ceo.ferramentas.includes('iniciar_fluxo'));
  const copy = getEmployee(db, 'copywriter');
  assert.ok(!copy.ferramentas.includes('solicitar_aprovacao'));
  assert.ok(!copy.ferramentas.includes('pesquisa_web'));
  assert.deepEqual(copy.acoes_aprovacao, []);
  const traf = getEmployee(db, 'especialista-trafego');
  assert.ok(traf.acoes_aprovacao.includes('alterar_orcamento_anuncios'));
  assert.ok(getEmployee(db, 'pesquisador-mercado').system_prompt.includes('Nunca invente pesquisas'));
  assert.ok(getEmployee(db, 'social-media').system_prompt.includes('Nunca afirme que publicou'));
  assert.ok(getEmployee(db, 'analista-dados').system_prompt.includes('Nunca crie métricas fictícias'));
  assert.ok(getEmployee(db, 'revisor-qualidade').tipos_tarefa.includes('revisao_qualidade'));
});
