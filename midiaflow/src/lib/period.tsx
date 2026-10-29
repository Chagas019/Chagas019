import { addDays, endOfMonth, startOfMonth, startOfWeek, subDays } from 'date-fns';
import { createContext, useContext, useState, type ReactNode } from 'react';
import { toISODate } from './utils';

export type PeriodKey = 'semana' | 'mes' | '30d' | '90d';

export const PERIODS: { value: PeriodKey; label: string }[] = [
  { value: 'semana', label: 'Esta semana' },
  { value: 'mes', label: 'Este mês' },
  { value: '30d', label: 'Últimos 30 dias' },
  { value: '90d', label: 'Últimos 90 dias' },
];

export function periodRange(p: PeriodKey, today = new Date()): { from: string; to: string } {
  switch (p) {
    case 'semana': {
      const s = startOfWeek(today, { weekStartsOn: 1 });
      return { from: toISODate(s), to: toISODate(addDays(s, 6)) };
    }
    case 'mes':
      return { from: toISODate(startOfMonth(today)), to: toISODate(endOfMonth(today)) };
    case '30d':
      return { from: toISODate(subDays(today, 30)), to: toISODate(today) };
    case '90d':
      return { from: toISODate(subDays(today, 90)), to: toISODate(today) };
  }
}

const Ctx = createContext<{ period: PeriodKey; setPeriod: (p: PeriodKey) => void }>({ period: 'mes', setPeriod: () => {} });

export function PeriodProvider({ children }: { children: ReactNode }) {
  const [period, setPeriod] = useState<PeriodKey>('mes');
  return <Ctx.Provider value={{ period, setPeriod }}>{children}</Ctx.Provider>;
}

export const usePeriod = () => useContext(Ctx);
