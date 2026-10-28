import { describe, expect, it } from 'vitest';
import { buildDemoData } from './demo-data';
import { checkAssignment, coverage, scheduleStatus } from './domain';
import type { Schedule } from './types';

const data = buildDemoData(new Date('2026-10-28T12:00:00'));
const ctx = { schedules: data.schedules, members: data.members, roles: data.roles };
const base = (slots: Schedule['slots']): Schedule => ({
  id: 'x', title: 'Teste', eventType: 'Missa', date: '2026-11-01', start: '19:00', end: '20:00', location: 'Matriz',
  coordinatorId: 'm1', notes: '', createdAt: '', slots,
});

describe('status da escala', () => {
  it('vaga sem pessoa = precisa de voluntário', () => {
    expect(scheduleStatus(base([{ id: 'a', roleId: 'foto', memberId: null, status: 'pendente' }]))).toBe('precisa');
  });
  it('recusa reabre a vaga', () => {
    const s = base([{ id: 'a', roleId: 'foto', memberId: 'm2', status: 'recusado' }]);
    expect(scheduleStatus(s)).toBe('precisa');
    expect(coverage(s).open).toBe(1);
  });
  it('todas confirmadas = completa; alguma pendente = aguardando', () => {
    expect(scheduleStatus(base([{ id: 'a', roleId: 'foto', memberId: 'm2', status: 'confirmado' }]))).toBe('completa');
    expect(scheduleStatus(base([{ id: 'a', roleId: 'foto', memberId: 'm2', status: 'pendente' }]))).toBe('aguardando');
  });
});

describe('conflitos', () => {
  it('alerta funções incompatíveis na mesma celebração', () => {
    const s = base([
      { id: 'a', roleId: 'foto', memberId: 'm2', status: 'pendente' },
      { id: 'b', roleId: 'video', memberId: 'm2', status: 'pendente' },
    ]);
    expect(checkAssignment(s, 'b', 'm2', ctx).some((c) => c.kind === 'mesma-escala')).toBe(true);
  });
  it('permite funções compatíveis (Stories + Social media)', () => {
    const s = base([
      { id: 'a', roleId: 'stories', memberId: 'm3', status: 'pendente' },
      { id: 'b', roleId: 'social', memberId: 'm3', status: 'pendente' },
    ]);
    expect(checkAssignment(s, 'b', 'm3', ctx).some((c) => c.kind === 'mesma-escala')).toBe(false);
  });
  it('alerta choque de horário com outra escala', () => {
    const other = data.schedules.find((s) => s.slots.some((x) => x.memberId && x.status !== 'recusado'))!;
    const slot = other.slots.find((x) => x.memberId && x.status !== 'recusado')!;
    const s = { ...base([{ id: 'a', roleId: slot.roleId, memberId: slot.memberId, status: 'pendente' as const }]), date: other.date, start: other.start, end: other.end };
    expect(checkAssignment(s, 'a', slot.memberId!, ctx).some((c) => c.kind === 'horario')).toBe(true);
  });
});
