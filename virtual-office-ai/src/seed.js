// Seed idempotente: cria ou atualiza departamentos, salas, funcionários e rotinas sem duplicar.
// A chave natural de cada funcionário é o slug. O estado atual e o histórico nunca são sobrescritos.
import crypto from 'node:crypto';
import { tx, now, J } from './db.js';
import { DEPARTMENTS, ROOMS } from './data/org.js';
import { EMPLOYEES, LIMITS_BY_LEVEL, defaultRoutine } from './data/employees.js';
import { ROUTINES } from './data/routines.js';
import { TASK_TYPES } from './data/taskTypes.js';
import { buildSystemPrompt } from './prompts.js';
import { audit } from './audit.js';

export function validateSeedData() {
  const slugs = new Set(EMPLOYEES.map((e) => e.slug));
  const erros = [];
  if (EMPLOYEES.length !== 31) erros.push(`esperados 31 funcionários, há ${EMPLOYEES.length}`);
  if (slugs.size !== EMPLOYEES.length) erros.push('slugs duplicados');
  for (const e of EMPLOYEES) {
    if (e.superior && !slugs.has(e.superior)) erros.push(`${e.slug}: superior inexistente ${e.superior}`);
    for (const t of e.tipos) if (!TASK_TYPES[t]) erros.push(`${e.slug}: tipo inexistente ${t}`);
    for (const d of e.delega) if (d !== '*' && !slugs.has(d)) erros.push(`${e.slug}: delega para inexistente ${d}`);
    if (!DEPARTMENTS.find((d) => d.id === e.dep)) erros.push(`${e.slug}: departamento inexistente`);
    if (!ROOMS.find((r) => r.id === e.sala)) erros.push(`${e.slug}: sala inexistente`);
  }
  for (const [id, t] of Object.entries(TASK_TYPES)) {
    const r = t.revisor && EMPLOYEES.find((e) => e.slug === t.revisor);
    if (t.revisor && (!r || !r.tipos.includes('revisao_qualidade'))) erros.push(`tipo ${id}: revisor ${t.revisor} não recebe revisões`);
  }
  if (erros.length) throw new Error('Dados de seed inválidos: ' + erros.join('; '));
}

function initials(nome) {
  const p = nome.split(' ').filter((w) => w.length > 2 || /^[A-Z]/.test(w));
  return (p[0][0] + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
}

export function employeeRecord(e, config) {
  const superior = EMPLOYEES.find((x) => x.slug === e.superior);
  const lim = LIMITS_BY_LEVEL[e.nivel];
  return {
    slug: e.slug, numero: e.numero, nome: e.nome,
    avatar: J({ iniciais: initials(e.nome), cor: e.cor }),
    cargo: e.cargo, departamento_id: e.dep, sala_id: e.sala, superior_slug: e.superior, nivel: e.nivel,
    descricao: e.instrucao, missao: e.missao,
    objetivos: J([e.missao, `Entrega obrigatória: ${e.entrega}`]),
    responsabilidades: J(e.funcoes), competencias: J(e.competencias),
    system_prompt: buildSystemPrompt(e, superior ? `${superior.nome} (${superior.cargo})` : null),
    ferramentas: J(e.ferramentas), acoes_aprovacao: J(e.acoes), tipos_tarefa: J(e.tipos),
    criterios_qualidade: J([`Entrega obrigatória: ${e.entrega}`, ...e.restricoes, 'Sem informações inventadas', 'Critérios do tipo de tarefa atendidos']),
    regras_delegacao: J({ pode_delegar_para: e.delega, assume_tarefas_simples_do_departamento: e.nivel === 'diretor' || e.nivel === 'executivo', revisao_obrigatoria_nao_pode_ser_pulada: true }),
    limites_custo: J(lim), rotina: J(defaultRoutine(e.nivel)), kpis: J(e.kpis),
    modelo: config.defaultModel, esforco: e.esforco,
  };
}

const hash = (o) => crypto.createHash('sha256').update(JSON.stringify(o)).digest('hex').slice(0, 16);

export function seed(db, config) {
  validateSeedData();
  const stats = { departamentos: 0, salas: 0, funcionarios_criados: 0, funcionarios_atualizados: 0, rotinas: 0 };
  tx(db, () => {
    DEPARTMENTS.forEach((d, i) => {
      db.prepare(`INSERT INTO departments (id, nome, descricao, diretor_slug, ordem) VALUES (?,?,?,?,?)
        ON CONFLICT(id) DO UPDATE SET nome=excluded.nome, descricao=excluded.descricao, diretor_slug=excluded.diretor_slug, ordem=excluded.ordem`)
        .run(d.id, d.nome, d.descricao, d.diretor, i);
      stats.departamentos++;
    });
    ROOMS.forEach((r, i) => {
      db.prepare(`INSERT INTO rooms (id, nome, departamento_id, descricao, ordem) VALUES (?,?,?,?,?)
        ON CONFLICT(id) DO UPDATE SET nome=excluded.nome, departamento_id=excluded.departamento_id, descricao=excluded.descricao, ordem=excluded.ordem`)
        .run(r.id, r.nome, r.dep, r.descricao, i);
      stats.salas++;
    });
    for (const e of EMPLOYEES) {
      const rec = employeeRecord(e, config);
      const h = hash(rec);
      const existing = db.prepare('SELECT id, seed_hash, modelo FROM employees WHERE slug = ?').get(e.slug);
      const t = now();
      if (!existing) {
        const cols = Object.keys(rec);
        db.prepare(`INSERT INTO employees (${cols.join(',')}, estado, estado_desde, seed_hash, created_at, updated_at)
          VALUES (${cols.map(() => '?').join(',')}, 'disponivel', ?, ?, ?, ?)`).run(...cols.map((c) => rec[c]), t, h, t, t);
        stats.funcionarios_criados++;
      } else if (existing.seed_hash !== h) {
        // Atualiza a definição do cargo, mas preserva modelo escolhido pelo proprietário, estado e histórico
        const { modelo, ...upd } = rec;
        const cols = Object.keys(upd);
        db.prepare(`UPDATE employees SET ${cols.map((c) => `${c} = ?`).join(', ')}, seed_hash = ?, updated_at = ? WHERE slug = ?`)
          .run(...cols.map((c) => upd[c]), h, t, e.slug);
        stats.funcionarios_atualizados++;
      }
    }
    for (const r of ROUTINES) {
      db.prepare(`INSERT INTO routines (id, nome, fase, horario, descricao, usa_ia) VALUES (?,?,?,?,?,?)
        ON CONFLICT(id) DO UPDATE SET nome=excluded.nome, fase=excluded.fase, descricao=excluded.descricao, usa_ia=excluded.usa_ia`)
        .run(r.id, r.nome, r.fase, r.horario, r.descricao, r.usa_ia);
      stats.rotinas++;
    }
    db.prepare(`INSERT INTO meta (key, value) VALUES ('seeded_at', ?) ON CONFLICT(key) DO NOTHING`).run(now());
    if (stats.funcionarios_criados || stats.funcionarios_atualizados) audit(db, { ator: 'sistema', acao: 'seed', detalhes: stats });
  });
  return stats;
}
