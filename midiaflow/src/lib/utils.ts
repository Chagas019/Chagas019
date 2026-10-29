import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const uid = (prefix = 'id') =>
  `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-3)}`;

export const toISODate = (d: Date) => format(d, 'yyyy-MM-dd');

export const fmt = (iso: string, pattern: string) => format(parseISO(iso), pattern, { locale: ptBR });

export const fmtDateLong = (iso: string) => fmt(iso, "EEEE, d 'de' MMMM");
export const fmtDateShort = (iso: string) => fmt(iso, "dd/MM");
export const fmtWeekday = (iso: string) => fmt(iso, 'EEE');

export const timeToMin = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

export const overlaps = (aStart: string, aEnd: string, bStart: string, bEnd: string) =>
  timeToMin(aStart) < timeToMin(bEnd) && timeToMin(bStart) < timeToMin(aEnd);

export const initials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

export const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function greeting(d = new Date()) {
  const h = d.getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

export function periodOf(time: string): 'manha' | 'tarde' | 'noite' {
  const m = timeToMin(time);
  if (m < 12 * 60) return 'manha';
  if (m < 18 * 60) return 'tarde';
  return 'noite';
}

export const PERIOD_LABEL = { manha: 'Manhã', tarde: 'Tarde', noite: 'Noite' } as const;
export const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
