import { describe, expect, it } from 'vitest';
import { normalizeLiturgia } from '../../../lib/normalize.js';
import { addDays, addMonths, monthGrid, msUntilNextDay, todayISO } from '../dates';
import { streak } from '../progress';
import { buildIcs, googleCalendarUrl } from '../reminder';

describe('normalizeLiturgia', () => {
  it('lê o formato v2 (leituras em listas)', () => {
    const l = normalizeLiturgia({
      data: '16/10/2026',
      liturgia: 'Sexta-feira da 28ª Semana do Tempo Comum',
      cor: 'Verde',
      leituras: {
        primeiraLeitura: [{ referencia: 'Ef 1,11-14', titulo: 'Leitura', texto: 'Irmãos…' }],
        salmo: [{ referencia: 'Sl 32', refrao: 'R. Feliz o povo', texto: '…' }],
        segundaLeitura: [],
        evangelho: [{ referencia: 'Lc 12,1-7', titulo: 'Evangelho', texto: 'Naquele tempo…' }],
      },
    });
    expect(l.data).toBe('2026-10-16');
    expect(l.evangelho.referencia).toBe('Lc 12,1-7');
    expect(l.salmo?.refrao).toBe('Feliz o povo');
    expect(l.segundaLeitura).toBeNull();
  });

  it('lê o formato antigo e usa a data pedida', () => {
    const l = normalizeLiturgia(
      { segundaLeitura: 'Não há segunda leitura hoje!', evangelho: { referencia: 'Mt 5,1-12', texto: 'x' } },
      '2026-11-01',
    );
    expect(l.data).toBe('2026-11-01');
    expect(l.segundaLeitura).toBeNull();
    expect(l.evangelho.referencia).toBe('Mt 5,1-12');
  });

  it('recusa resposta sem Evangelho', () => {
    expect(() => normalizeLiturgia({ cor: 'Verde' })).toThrow();
  });
});

describe('datas', () => {
  it('usa o dia de Brasília', () => {
    expect(todayISO(new Date('2026-10-17T02:30:00Z'))).toBe('2026-10-16');
    expect(todayISO(new Date('2026-10-17T03:00:00Z'))).toBe('2026-10-17');
  });
  it('soma dias e meses virando mês e ano', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(addMonths('2026-12-15', 1)).toBe('2027-01-01');
  });
  it('monta o mês de domingo a sábado', () => {
    const weeks = monthGrid('2026-10-01'); // 1º de outubro de 2026 é quinta
    expect(weeks[0]).toEqual([null, null, null, null, '2026-10-01', '2026-10-02', '2026-10-03']);
    expect(weeks.flat().filter(Boolean)).toHaveLength(31);
    expect(weeks.every((w) => w.length === 7)).toBe(true);
  });
  it('calcula a próxima meia-noite de Brasília', () => {
    expect(msUntilNextDay(new Date('2026-10-17T02:59:00Z'))).toBe(60_000);
  });
});

describe('sequência', () => {
  it('conta até hoje, ou até ontem se hoje ainda falta', () => {
    const feitos = new Set(['2026-10-13', '2026-10-14', '2026-10-15']);
    expect(streak(feitos, '2026-10-16')).toBe(3);
    expect(streak(new Set([...feitos, '2026-10-16']), '2026-10-16')).toBe(4);
    expect(streak(feitos, '2026-10-17')).toBe(0);
  });
});

describe('lembrete', () => {
  const now = new Date('2026-10-16T12:00:00Z');
  it('gera .ics diário no fuso de Brasília', () => {
    const ics = buildIcs('06:30', 'https://exemplo.com', now);
    expect(ics).toContain('DTSTART;TZID=America/Sao_Paulo:20261016T063000');
    expect(ics).toContain('RRULE:FREQ=DAILY');
    expect(ics.split('\r\n')[0]).toBe('BEGIN:VCALENDAR');
  });
  it('gera link do Google Agenda com repetição', () => {
    const u = new URL(googleCalendarUrl('23:50', 'https://exemplo.com', now));
    expect(u.searchParams.get('dates')).toBe('20261016T235000/20261017T001000');
    expect(u.searchParams.get('recur')).toBe('RRULE:FREQ=DAILY');
  });
});
