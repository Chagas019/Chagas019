import { addDays, format } from 'date-fns';
import { describe, expect, it } from 'vitest';
import { buildEmptyData } from './demo-data';
import { buildSnapshot, decodeSnapshot, encodeSnapshot, toICS } from './servo';
import type { Member } from './types';

const day = (n: number) => format(addDays(new Date(), n), 'yyyy-MM-dd');

function data() {
  const d = buildEmptyData({ parish: 'Paróquia Santo Antônio', city: '', pascom: '', name: 'Joana' });
  const joana = d.members[0];
  joana.phone = '(31) 98888-7777';
  const pedro: Member = { ...joana, id: 'pedro', name: 'Pedro Fotógrafo', phone: '', access: 'integrante' };
  d.members.push(pedro);
  const base = { eventType: 'Missa' as const, end: '20:00', location: 'Igreja Matriz', coordinatorId: joana.id, notes: '', createdAt: '' };
  d.schedules = [
    { ...base, id: 's1', title: 'Missa de domingo', date: day(3), start: '19:00', slots: [{ id: 'a', roleId: 'foto', memberId: 'pedro', status: 'pendente' }, { id: 'b', roleId: 'stories', memberId: joana.id, status: 'confirmado' }] },
    { ...base, id: 's2', title: 'Missa passada', date: day(-3), start: '19:00', slots: [{ id: 'c', roleId: 'foto', memberId: 'pedro', status: 'confirmado' }] },
    { ...base, id: 's3', title: 'Recusada', date: day(5), start: '19:00', slots: [{ id: 'd', roleId: 'foto', memberId: 'pedro', status: 'recusado' }] },
  ];
  return d;
}

describe('link de escalas do servo', () => {
  it('leva só as escalas futuras e aceitas daquela pessoa', () => {
    const snap = buildSnapshot(data(), 'pedro');
    expect(snap.n).toBe('Pedro Fotógrafo');
    expect(snap.s.map((x) => x.t)).toEqual(['Missa de domingo']);
    expect(snap.s[0].c).toEqual(['Joana · Stories']);
    expect(snap.s[0].kp).toBe('5531988887777');
  });

  it('codifica e decodifica sem perder nada; link estragado é recusado', async () => {
    const snap = buildSnapshot(data(), 'pedro');
    const code = await encodeSnapshot(snap);
    expect(await decodeSnapshot(code)).toEqual(snap);
    expect(await decodeSnapshot(code.slice(0, 20))).toBeNull();
    expect(await decodeSnapshot('xabc')).toBeNull();
  });

  it('gera agenda .ics válida', () => {
    const ics = toICS(buildSnapshot(data(), 'pedro'));
    expect(ics).toMatch(/^BEGIN:VCALENDAR/);
    expect(ics).toContain('SUMMARY:Missa de domingo · Fotografia');
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(1);
  });
});
