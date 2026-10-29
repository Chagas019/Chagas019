import { addDays, differenceInMinutes, endOfMonth, parseISO, startOfMonth } from 'date-fns';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, CalendarPlus, Check } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { checkAssignment, isOpenSlot, scheduleStatus } from '@/lib/domain';
import { useStore } from '@/lib/store';
import type { Member, Schedule, Slot } from '@/lib/types';
import { capitalize, cn, fmt, toISODate } from '@/lib/utils';
import { useScheduleDetail } from '../schedule/ScheduleDetail';
import { useScheduleEditor } from '../schedule/ScheduleEditor';
import { Avatar } from '../ui';

/* ------------------------------------------------------------------ */
/* Missões — lista estilo "Planner" que esmaece no fim                 */
/* ------------------------------------------------------------------ */
export function MissionsWidget() {
  const { schedules, roles, me, respond, can } = useStore();
  const detail = useScheduleDetail();
  const editor = useScheduleEditor();
  const today = toISODate(new Date());

  const items = useMemo(() => {
    const mine = schedules
      .filter((s) => s.date >= today)
      .flatMap((s) => s.slots.filter((x) => x.memberId === me.id).map((slot) => ({ s, slot })));
    if (mine.length) return mine.sort((a, b) => (a.s.date + a.s.start).localeCompare(b.s.date + b.s.start)).slice(0, 5);
    // Sem escalas próprias (ex.: admin): mostra as próximas celebrações.
    return schedules
      .filter((s) => s.date >= today)
      .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))
      .slice(0, 5)
      .map((s) => ({ s, slot: undefined as Slot | undefined }));
  }, [schedules, me.id, today]);

  return (
    <div className="card flex h-full flex-col overflow-hidden p-4 sm:p-5">
      <p className="mb-4 px-1 text-[26px] font-medium tracking-tight">
        Missões<sup className="ml-1 align-super text-[11px] text-ink-muted">({items.length})</sup>
      </p>
      <ul className="relative flex-1 space-y-2 [mask-image:linear-gradient(180deg,#000_55%,transparent)]">
        {items.map(({ s, slot }, i) => {
          const done = slot ? slot.status === 'confirmado' : scheduleStatus(s) === 'completa';
          const role = slot ? roles.find((r) => r.id === slot.roleId)?.name : `${s.slots.length} funções`;
          return (
            <li key={(slot?.id ?? '') + s.id}>
              <div
                className={cn(
                  'flex items-center gap-3 rounded-[20px] border px-4 py-3 transition-colors',
                  i === 0 ? 'glass border-white/15' : 'border-white/[0.05] bg-white/[0.03]',
                )}
              >
                <button className="min-w-0 flex-1 text-left" onClick={() => detail.open(s.id)}>
                  <span className="block truncate text-[15px]">{s.title}</span>
                  <span className="block truncate text-[13px] text-ink-muted">
                    {role} · {capitalize(fmt(s.date, 'EEE dd/MM'))} {s.start}
                  </span>
                </button>
                <button
                  disabled={!slot || done}
                  aria-label={done ? 'Confirmado' : 'Confirmar presença'}
                  onClick={() => {
                    if (!slot) return;
                    respond(s.id, slot.id, 'confirmado');
                    toast.success('Presença confirmada! Obrigado por servir. 🙏');
                  }}
                  className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-all',
                    done ? 'bg-neon text-bg shadow-[0_0_14px_-2px_#5BFF9A]' : 'border border-white/25 bg-white/[0.05] enabled:hover:border-neon',
                  )}
                >
                  {done && <Check className="h-4 w-4" strokeWidth={3} />}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      {items.length === 0 && (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-[20px] border border-dashed border-white/10 px-4 py-8 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-neon/10 text-neon"><CalendarPlus className="h-5 w-5" /></span>
          <p className="text-sm text-ink-muted">
            {can('manage:schedules') ? 'Nenhuma missão ainda. Crie a primeira escala e ela aparece aqui.' : 'Quando você for escalado, sua missão aparece aqui.'}
          </p>
          {can('manage:schedules') && (
            <button onClick={() => editor.open()} className="rounded-full bg-neon/15 px-4 py-2 text-sm font-medium text-neon hover:bg-neon/25">Criar escala</button>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Calendário em matriz de pontos                                      */
/* ------------------------------------------------------------------ */
export function DotCalendarWidget() {
  const { schedules, can } = useStore();
  const detail = useScheduleDetail();
  const editor = useScheduleEditor();
  const now = new Date();
  const today = toISODate(now);
  const start = startOfMonth(now);
  const lead = (start.getDay() + 6) % 7; // semana começa na segunda
  const days = endOfMonth(now).getDate();

  const byDate = useMemo(() => {
    const m = new Map<string, Schedule[]>();
    schedules.forEach((s) => m.set(s.date, [...(m.get(s.date) ?? []), s]));
    return m;
  }, [schedules]);

  return (
    <div className="card relative flex h-full flex-col overflow-hidden p-5">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-neon/[0.10] via-transparent to-electric/[0.10]" />
      <div className="relative flex items-start justify-between">
        <span className="text-[56px] font-light leading-none tracking-tight">{now.getDate()}</span>
        <span className="pt-2 text-lg font-medium uppercase tracking-wide">{fmt(today, 'MMM').replace('.', '')}</span>
      </div>
      <div className="relative mt-5 grid grid-cols-7 gap-x-2 gap-y-2.5">
        {Array.from({ length: lead }).map((_, i) => (
          <span key={`l${i}`} className="mx-auto h-[18px] w-[18px] rounded-full bg-white/[0.06]" />
        ))}
        {Array.from({ length: days }).map((_, i) => {
          const iso = toISODate(addDays(start, i));
          const list = byDate.get(iso) ?? [];
          const past = iso < today;
          const st = list.length ? (list.some((s) => scheduleStatus(s) === 'precisa') ? 'precisa' : list.every((s) => scheduleStatus(s) === 'completa') ? 'completa' : 'aguardando') : null;
          const color = st === 'precisa' ? '#FF6B7A' : st === 'aguardando' ? '#FFC857' : st === 'completa' ? '#5BFF9A' : null;
          return (
            <button
              key={iso}
              title={`${fmt(iso, 'dd/MM')}${list.length ? ` · ${list.map((s) => s.title).join(', ')}` : ''}`}
              aria-label={`${fmt(iso, 'd MMMM')}: ${list.length} escala(s)`}
              onClick={() => (list.length ? detail.open(list[0].id) : can('manage:schedules') && editor.open({ date: iso }))}
              className={cn(
                'mx-auto h-[18px] w-[18px] rounded-full transition-transform hover:scale-125',
                !color && (past ? 'bg-white/10' : 'bg-black/60 shadow-[inset_0_1px_1px_rgba(0,0,0,0.6)]'),
                iso === today && 'ring-2 ring-white/70 ring-offset-2 ring-offset-transparent',
                past && color && 'opacity-40',
              )}
              style={color ? { background: color, boxShadow: past ? undefined : `0 0 10px -1px ${color}` } : undefined}
            />
          );
        })}
      </div>
      <div className="relative mt-auto flex flex-wrap gap-x-3 gap-y-1 pt-5 text-[11px] text-ink-muted">
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-neon" />Completa</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-warn" />Aguardando</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-danger" />Vaga aberta</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Relógio digital + contagem até a próxima celebração                 */
/* ------------------------------------------------------------------ */
export function ClockWidget() {
  const { schedules } = useStore();
  const detail = useScheduleDetail();
  const reduce = useReducedMotion();
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const next = useMemo(
    () =>
      schedules
        .map((s) => ({ s, at: parseISO(`${s.date}T${s.start}`) }))
        .filter((x) => x.at > now)
        .sort((a, b) => a.at.getTime() - b.at.getTime())[0],
    // recalcula por minuto, não por segundo
    [schedules, now.getMinutes()],
  );
  const mins = next ? differenceInMinutes(next.at, now) : 0;
  const countdown = mins >= 60 * 24 ? `${Math.floor(mins / 1440)}d ${String(Math.floor((mins % 1440) / 60)).padStart(2, '0')}h` : `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');

  return (
    <div className="card flex items-stretch gap-3 rounded-[30px] p-2.5">
      <button
        onClick={() => next && detail.open(next.s.id)}
        className="glass flex w-[84px] shrink-0 flex-col items-center justify-between rounded-[24px] border border-white/10 py-3"
        aria-label={next ? `Próxima celebração: ${next.s.title} em ${countdown}` : 'Sem próximas celebrações'}
      >
        <span className="relative flex h-8 w-8 items-center justify-center">
          {!reduce && <motion.span className="absolute inset-0 rounded-full border border-neon/50" animate={{ scale: [1, 1.5], opacity: [0.8, 0] }} transition={{ duration: 2, repeat: Infinity }} />}
          <span className="h-5 w-5 rounded-full bg-neon shadow-[0_0_14px_#5BFF9A]" />
        </span>
        <span className="text-center">
          <span className="block font-mono text-[15px]">{next ? countdown : '--:--'}</span>
          <span className="block text-[9px] uppercase tracking-widest text-ink-muted">para a missa</span>
        </span>
      </button>
      <div className="flex min-w-0 flex-1 items-center justify-between gap-2 pr-3">
        <span className="digital text-[64px] leading-none sm:text-[76px]" aria-label={`${hh}:${mm}`}>
          {hh}
          <motion.span animate={reduce ? undefined : { opacity: [1, 0.25, 1] }} transition={{ duration: 1, repeat: Infinity }}>:</motion.span>
          {mm}
        </span>
        <span className="text-right text-[11px] uppercase leading-5 tracking-widest text-ink-muted">
          <span className="block text-ink">{fmt(toISODate(now), 'EEE').replace('.', '')}</span>
          <span className="block">{fmt(toISODate(now), 'dd/MM')}</span>
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Troca líquida: quem pediu substituição ⟶ quem pode assumir          */
/* ------------------------------------------------------------------ */
export function LiquidSwap({ schedule, slot, from, to }: { schedule: Schedule; slot: Slot; from: Member; to?: Member }) {
  const { assign, roles } = useStore();
  const reduce = useReducedMotion();
  const role = roles.find((r) => r.id === slot.roleId);
  const id = `goo-${slot.id}`;

  return (
    <div className="flex flex-col items-center">
      <div className="relative h-[112px] w-[300px] max-w-full">
        <svg viewBox="0 0 300 112" className="absolute inset-0 h-full w-full" aria-hidden>
          <defs>
            <filter id={id}>
              <feGaussianBlur in="SourceGraphic" stdDeviation="9" result="b" />
              <feColorMatrix in="b" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -10" />
            </filter>
            <linearGradient id={`${id}-g`} x1="0" x2="1">
              <stop offset="0" stopColor="#F5F7FA" stopOpacity="0.16" />
              <stop offset="1" stopColor="#55B8FF" stopOpacity="0.22" />
            </linearGradient>
          </defs>
          <g filter={`url(#${id})`} fill={`url(#${id}-g)`}>
            <circle cx="56" cy="56" r="52" />
            <circle cx="152" cy="56" r="34" />
            <rect x="60" y="38" width="90" height="36" rx="18" />
            <motion.circle
              cy="56"
              r="16"
              initial={{ cx: 150 }}
              animate={reduce ? undefined : { cx: [150, 212, 150] }}
              transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
            />
          </g>
          <circle cx="244" cy="56" r="52" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.14)" />
        </svg>
        <span className="absolute left-[8px] top-[8px]"><Avatar name={from.name} photo={from.photo} size={96} /></span>
        <span className="absolute left-[143px] top-1/2 flex -translate-y-1/2 items-center gap-1.5 text-ink">
          <span className="h-2 w-2 rounded-full bg-ink" />
          <ArrowRight className="h-5 w-5" />
        </span>
        <span className="absolute right-[8px] top-[8px]">
          {to ? <Avatar name={to.name} photo={to.photo} size={96} /> : <span className="flex h-24 w-24 items-center justify-center rounded-full text-xs text-ink-muted">ninguém livre</span>}
        </span>
      </div>
      <div className="mt-3 flex w-[300px] max-w-full justify-between">
        <span className="glass glass-pill flex items-center gap-2 border border-white/10 py-1.5 pl-3.5 pr-1.5 text-sm">
          {from.name.split(' ')[0]}
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-danger">{slot.status === 'recusado' ? 'não vai' : 'troca'}</span>
        </span>
        {to && (
          <button
            onClick={() => {
              assign(schedule.id, slot.id, to.id);
              toast.success(`${to.name.split(' ')[0]} designado(a) para ${role?.name}.`, { description: 'Aguardando a confirmação da nova pessoa.' });
            }}
            className="flex items-center gap-2 rounded-full bg-neon py-1.5 pl-3.5 pr-1.5 text-sm font-medium text-bg shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] transition-transform active:scale-95"
          >
            {to.name.split(' ')[0]}
            <span className="rounded-full bg-bg px-2 py-0.5 text-xs text-neon">designar</span>
          </button>
        )}
      </div>
      <p className="mt-2 text-center text-xs text-ink-muted">
        {role?.name} · {schedule.title} · {fmt(schedule.date, 'dd/MM')} {schedule.start}
      </p>
    </div>
  );
}

/** Lista de pedidos de troca com a melhor sugestão para cada vaga. */
export function SwapsWidget() {
  const { schedules, members, roles } = useStore();
  const today = toISODate(new Date());
  const ctx = { schedules, members, roles };
  const swaps = schedules
    .filter((s) => s.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .flatMap((s) => s.slots.filter((x) => x.memberId && isOpenSlot(x)).map((slot) => ({ s, slot })))
    .slice(0, 3)
    .map(({ s, slot }) => {
      const from = members.find((m) => m.id === slot.memberId)!;
      const to = members.find(
        (m) => m.status === 'ativo' && m.id !== from.id && m.roleIds.includes(slot.roleId) && checkAssignment(s, slot.id, m.id, ctx).every((c) => c.severity !== 'alerta'),
      );
      return { s, slot, from, to };
    });

  if (!swaps.length) return null;
  return (
    <div className="card p-5 sm:p-6">
      <p className="eyebrow mb-1">Substituições</p>
      <p className="mb-6 text-sm text-ink-muted">Quem não pode ir e quem está livre para assumir. Nada muda sem você clicar em designar.</p>
      <div className="flex flex-wrap justify-center gap-x-12 gap-y-8 sm:justify-start">
        {swaps.map((x) => <LiquidSwap key={x.slot.id} schedule={x.s} slot={x.slot} from={x.from} to={x.to} />)}
      </div>
    </div>
  );
}
