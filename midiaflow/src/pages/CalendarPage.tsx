import { addDays, addMonths, addWeeks, endOfMonth, endOfWeek, isSameMonth, startOfMonth, startOfWeek, subMonths, subWeeks } from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, CalendarDays, ChevronLeft, ChevronRight, List, Plus, Rows3 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ScheduleStatusBadge } from '@/components/schedule/parts';
import { useScheduleDetail } from '@/components/schedule/ScheduleDetail';
import { useScheduleEditor } from '@/components/schedule/ScheduleEditor';
import { Button, Card, EmptyState, PageHeader, Segmented, Select } from '@/components/ui';
import { coverage, isOpenSlot, scheduleStatus } from '@/lib/domain';
import { useStore } from '@/lib/store';
import type { EventType } from '@/lib/types';
import { capitalize, cn, fmt, toISODate } from '@/lib/utils';

export const TYPE_COLOR: Record<EventType, string> = {
  Missa: '#5BFF9A',
  Adoração: '#FFC857',
  Retiro: '#B98BFF',
  'Festa paroquial': '#FF8BD1',
  Procissão: '#55B8FF',
  'Encontro de jovens': '#7CF5FF',
  Formação: '#A6FF5B',
  'Campanha solidária': '#FF9F5B',
  'Evento especial': '#F5F7FA',
};

type CalItem = { id: string; kind: 'escala' | 'evento'; title: string; date: string; start: string; end: string; type: EventType; uncovered: boolean; pct?: number };
type View = 'mes' | 'semana' | 'lista';

export default function CalendarPage() {
  const { schedules, events, roles, members, can } = useStore();
  const detail = useScheduleDetail();
  const editor = useScheduleEditor();
  const nav = useNavigate();
  const [view, setView] = useState<View>('mes');
  const [cursor, setCursor] = useState(new Date());
  const [role, setRole] = useState('');
  const [member, setMember] = useState('');
  const [onlyUncovered, setOnlyUncovered] = useState(false);
  const [dir, setDir] = useState(0);
  const today = toISODate(new Date());

  const items = useMemo<CalItem[]>(() => {
    const sc: CalItem[] = schedules
      .filter((s) => !role || s.slots.some((x) => x.roleId === role))
      .filter((s) => !member || s.slots.some((x) => x.memberId === member && !isOpenSlot(x)))
      .map((s) => ({ id: s.id, kind: 'escala', title: s.title, date: s.date, start: s.start, end: s.end, type: s.eventType, uncovered: s.slots.some(isOpenSlot), pct: coverage(s).pct }));
    const ev: CalItem[] = member ? [] : events
      .filter((e) => !role || e.requiredRoleIds.includes(role))
      .filter((e) => !schedules.some((s) => s.eventId === e.id))
      .map((e) => ({ id: e.id, kind: 'evento', title: e.title, date: e.date, start: e.start, end: e.end, type: e.type, uncovered: true }));
    return [...sc, ...ev].filter((i) => !onlyUncovered || i.uncovered).sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
  }, [schedules, events, role, member, onlyUncovered]);

  const byDate = useMemo(() => {
    const m = new Map<string, CalItem[]>();
    items.forEach((i) => m.set(i.date, [...(m.get(i.date) ?? []), i]));
    return m;
  }, [items]);

  const move = (n: number) => {
    setDir(n);
    setCursor((c) => (view === 'semana' ? (n > 0 ? addWeeks(c, 1) : subWeeks(c, 1)) : n > 0 ? addMonths(c, 1) : subMonths(c, 1)));
  };
  const openItem = (i: CalItem) => (i.kind === 'escala' ? detail.open(i.id) : nav(`/eventos?id=${i.id}`));

  const monthDays = useMemo(() => {
    const s = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 });
    const e = endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 });
    const out: Date[] = [];
    for (let d = s; d <= e; d = addDays(d, 1)) out.push(d);
    return out;
  }, [cursor]);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(cursor, { weekStartsOn: 1 }), i)), [cursor]);
  const label = view === 'semana'
    ? `${fmt(toISODate(weekDays[0]), "d MMM")} – ${fmt(toISODate(weekDays[6]), "d MMM yyyy")}`
    : capitalize(fmt(toISODate(cursor), "MMMM 'de' yyyy"));
  const listItems = items.filter((i) => (view === 'lista' ? i.date >= toISODate(startOfMonth(cursor)) && i.date <= toISODate(endOfMonth(cursor)) : true));

  const Chip = ({ i }: { i: CalItem }) => (
    <button
      onClick={(e) => { e.stopPropagation(); openItem(i); }}
      className="group flex w-full items-center gap-1.5 truncate rounded-lg px-1.5 py-1 text-left text-[11px] transition-colors hover:bg-white/5"
      style={{ background: `${TYPE_COLOR[i.type]}12` }}
      title={`${i.start} ${i.title}${i.uncovered ? ' — sem cobertura completa' : ''}`}
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: TYPE_COLOR[i.type] }} />
      <span className="hidden text-ink-muted sm:inline">{i.start}</span>
      <span className="truncate">{i.title}</span>
      {i.uncovered && <AlertCircle className="ml-auto h-3 w-3 shrink-0 text-danger" />}
    </button>
  );

  return (
    <div>
      <PageHeader title="Calendário" subtitle="Celebrações, eventos e cobertura da equipe" actions={can('manage:schedules') && <Button variant="primary" icon={Plus} onClick={() => editor.open()}>Criar escala</Button>} />

      <Card className="mb-4 flex flex-col gap-3 p-3 sm:p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2">
          <Button size="icon" variant="ghost" aria-label="Anterior" onClick={() => move(-1)} className="bg-surface"><ChevronLeft className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" aria-label="Próximo" onClick={() => move(1)} className="bg-surface"><ChevronRight className="h-4 w-4" /></Button>
          <h2 className="ml-1 min-w-[150px] text-lg font-semibold tracking-tight">{label}</h2>
          <Button size="sm" variant="ghost" onClick={() => { setDir(0); setCursor(new Date()); }}>Hoje</Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select aria-label="Filtrar por função" value={role} onChange={(e) => setRole(e.target.value)} className="h-10 w-auto rounded-full text-[13px]">
            <option value="">Todas as funções</option>
            {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </Select>
          <Select aria-label="Filtrar por integrante" value={member} onChange={(e) => setMember(e.target.value)} className="h-10 w-auto rounded-full text-[13px]">
            <option value="">Toda a equipe</option>
            {members.filter((m) => m.status === 'ativo').map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </Select>
          <label className="flex h-10 cursor-pointer items-center gap-2 rounded-full border border-line bg-surface px-3 text-[13px]">
            <input type="checkbox" checked={onlyUncovered} onChange={(e) => setOnlyUncovered(e.target.checked)} className="accent-[#5BFF9A]" />
            Sem cobertura
          </label>
          <Segmented value={view} onChange={setView} options={[{ value: 'mes', label: 'Mês', icon: CalendarDays }, { value: 'semana', label: 'Semana', icon: Rows3 }, { value: 'lista', label: 'Lista', icon: List }]} />
        </div>
      </Card>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={`${view}-${label}`} initial={{ opacity: 0, x: dir * 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: dir * -24 }} transition={{ duration: 0.22 }}>
          {view === 'mes' && (
            <Card className="p-2 sm:p-4">
              <div className="grid grid-cols-7 pb-2 text-center text-[11px] font-medium uppercase tracking-wider text-ink-muted">
                {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((d) => <div key={d}>{d}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
                {monthDays.map((d) => {
                  const iso = toISODate(d);
                  const list = byDate.get(iso) ?? [];
                  const inMonth = isSameMonth(d, cursor);
                  return (
                    <div
                      key={iso}
                      role={can('manage:schedules') ? 'button' : undefined}
                      tabIndex={can('manage:schedules') ? 0 : undefined}
                      aria-label={can('manage:schedules') ? `Criar escala em ${fmt(iso, 'dd/MM')}` : undefined}
                      onClick={() => can('manage:schedules') && editor.open({ date: iso })}
                      onKeyDown={(e) => { if (e.key === 'Enter' && can('manage:schedules')) editor.open({ date: iso }); }}
                      className={cn(
                        'group relative min-h-[64px] rounded-xl border p-1 text-left transition-colors sm:min-h-[108px] sm:rounded-2xl sm:p-1.5',
                        inMonth ? 'border-line/50 bg-surface/40' : 'border-transparent opacity-40',
                        can('manage:schedules') && 'cursor-pointer hover:border-neon/30',
                        iso === today && 'border-neon/50 bg-neon/[0.04]',
                      )}
                    >
                      <div className="flex items-center justify-between px-0.5">
                        <span className={cn('text-xs font-medium sm:text-sm', iso === today && 'text-neon')}>{d.getDate()}</span>
                        {can('manage:schedules') && <Plus className="hidden h-3.5 w-3.5 text-ink-muted opacity-0 transition-opacity group-hover:opacity-100 sm:block" />}
                      </div>
                      {/* celular: pontinhos; desktop: chips */}
                      <div className="mt-1 flex flex-wrap gap-0.5 sm:hidden">
                        {list.slice(0, 4).map((i) => <span key={i.id} className="h-1.5 w-1.5 rounded-full" style={{ background: i.uncovered ? '#FF6B7A' : TYPE_COLOR[i.type] }} />)}
                      </div>
                      <div className="mt-1 hidden space-y-0.5 sm:block">
                        {list.slice(0, 3).map((i) => <Chip key={i.id} i={i} />)}
                        {list.length > 3 && <p className="px-1.5 text-[10px] text-ink-muted">+{list.length - 3} mais</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="mt-3 px-1 text-xs text-ink-muted sm:hidden">Toque em “Lista” para ver os detalhes de cada dia.</p>
            </Card>
          )}

          {view === 'semana' && (
            <div className="grid gap-3 md:grid-cols-7">
              {weekDays.map((d) => {
                const iso = toISODate(d);
                const list = byDate.get(iso) ?? [];
                return (
                  <Card key={iso} className={cn('min-h-[140px] p-3', iso === today && 'border-neon/40')}>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm">
                        <span className="text-ink-muted">{capitalize(fmt(iso, 'EEE').replace('.', ''))} </span>
                        <span className={cn('font-semibold', iso === today && 'text-neon')}>{d.getDate()}</span>
                      </span>
                      {can('manage:schedules') && <button aria-label={`Criar escala em ${fmt(iso, 'dd/MM')}`} onClick={() => editor.open({ date: iso })} className="rounded-full p-1 text-ink-muted hover:bg-white/5 hover:text-neon"><Plus className="h-4 w-4" /></button>}
                    </div>
                    <div className="space-y-1.5">
                      {list.length === 0 && <p className="text-xs text-ink-muted/60">Livre</p>}
                      {list.map((i) => (
                        <button key={i.id} onClick={() => openItem(i)} className="w-full rounded-xl border-l-2 bg-surface/70 p-2 text-left text-xs transition-colors hover:bg-surface" style={{ borderColor: TYPE_COLOR[i.type] }}>
                          <p className="font-medium">{i.title}</p>
                          <p className="text-ink-muted">{i.start}–{i.end}</p>
                          {i.uncovered && <p className="mt-1 text-danger">{i.kind === 'evento' ? 'Sem escala' : 'Vaga aberta'}</p>}
                        </button>
                      ))}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {view === 'lista' && (
            listItems.length === 0 ? <EmptyState title="Nada neste mês" body="Nenhuma celebração com os filtros atuais." /> : (
              <div className="space-y-2">
                {listItems.map((i) => {
                  const s = i.kind === 'escala' ? schedules.find((x) => x.id === i.id) : undefined;
                  return (
                    <button key={i.id} onClick={() => openItem(i)} className={cn('card flex w-full items-center gap-4 p-3.5 text-left transition-colors hover:border-neon/30 sm:p-4', i.date < today && 'opacity-60')}>
                      <span className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl" style={{ background: `${TYPE_COLOR[i.type]}14`, color: TYPE_COLOR[i.type] }}>
                        <span className="text-[10px] uppercase">{fmt(i.date, 'EEE').replace('.', '')}</span>
                        <span className="text-lg font-bold leading-none">{fmt(i.date, 'dd')}</span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{i.title}</span>
                        <span className="text-xs text-ink-muted">{i.type} · {i.start}–{i.end}</span>
                      </span>
                      {s ? <ScheduleStatusBadge status={scheduleStatus(s)} /> : <span className="text-xs text-danger">Evento sem escala</span>}
                    </button>
                  );
                })}
              </div>
            )
          )}
        </motion.div>
      </AnimatePresence>

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-ink-muted">
        {(Object.keys(TYPE_COLOR) as EventType[]).map((t) => (
          <span key={t} className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: TYPE_COLOR[t] }} />{t}</span>
        ))}
        <span className="flex items-center gap-1.5"><AlertCircle className="h-3 w-3 text-danger" />Sem cobertura completa</span>
      </div>
    </div>
  );
}
