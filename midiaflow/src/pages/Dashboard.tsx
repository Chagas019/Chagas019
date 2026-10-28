import { addDays, formatDistanceToNow, parseISO, startOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { ArrowRight, CalendarCheck2, CalendarClock, Clock, MapPin, Megaphone, Pin, Plus, UserCheck, UserPlus, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { toast } from 'sonner';
import { useScheduleDetail } from '@/components/schedule/ScheduleDetail';
import { useScheduleEditor } from '@/components/schedule/ScheduleEditor';
import { ScheduleStatusBadge } from '@/components/schedule/parts';
import { ClockWidget, DotCalendarWidget, MissionsWidget, SwapsWidget } from '@/components/widgets';
import { Avatar, Badge, Button, Card, EmptyState, Field, Input, Item, Modal, ProgressRing, RoleIcon, SectionTitle, Stagger, Textarea } from '@/components/ui';
import { coverage, isOpenSlot, scheduleStatus } from '@/lib/domain';
import { periodRange, usePeriod } from '@/lib/period';
import { useStore } from '@/lib/store';
import { capitalize, cn, fmt, fmtDateLong, greeting, toISODate } from '@/lib/utils';

const KEY_ROLES = ['foto', 'video', 'stories', 'social', 'projecao', 'live'];

export default function Dashboard() {
  const store = useStore();
  const { schedules, roles, members, events, announcements, audit, can } = store;
  const editor = useScheduleEditor();
  const detail = useScheduleDetail();
  const { period } = usePeriod();
  const today = toISODate(new Date());
  const [selectedDay, setSelectedDay] = useState(today);
  const [annOpen, setAnnOpen] = useState(false);

  const upcoming = useMemo(() => schedules.filter((s) => s.date >= today).sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start)), [schedules, today]);
  const range = periodRange(period);
  const inPeriod = schedules.filter((s) => s.date >= range.from && s.date <= range.to);
  const next = upcoming[0];

  const stats = [
    { label: 'Próximas escalas', value: upcoming.filter((s) => s.date <= toISODate(addDays(new Date(), 14))).length, hint: 'nos próximos 14 dias', icon: CalendarClock, color: '#5BFF9A' },
    { label: 'Integrantes confirmados', value: upcoming.reduce((a, s) => a + coverage(s).confirmed, 0), hint: 'em escalas futuras', icon: UserCheck, color: '#55B8FF' },
    { label: 'Vagas em aberto', value: upcoming.reduce((a, s) => a + coverage(s).open, 0), hint: 'precisam de voluntário', icon: UserPlus, color: '#FF6B7A' },
    { label: 'Eventos do mês', value: events.filter((e) => e.date.slice(0, 7) === today.slice(0, 7)).length + schedules.filter((s) => s.date.slice(0, 7) === today.slice(0, 7)).length, hint: 'celebrações e eventos', icon: CalendarCheck2, color: '#FFC857' },
  ];

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const week = Array.from({ length: 7 }, (_, i) => toISODate(addDays(weekStart, i)));
  const weekSchedules = schedules.filter((s) => week.includes(s.date)).sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
  const dayList = weekSchedules.filter((s) => s.date === selectedDay);

  const chart = useMemo(() => {
    const byDate = new Map<string, { filled: number; total: number }>();
    for (const s of [...inPeriod].sort((a, b) => a.date.localeCompare(b.date))) {
      const c = coverage(s);
      const cur = byDate.get(s.date) ?? { filled: 0, total: 0 };
      byDate.set(s.date, { filled: cur.filled + c.filled, total: cur.total + c.total });
    }
    return [...byDate.entries()].map(([d, v]) => ({ dia: fmt(d, 'dd/MM'), cobertura: v.total ? Math.round((v.filled / v.total) * 100) : 0 }));
  }, [inPeriod]);

  const parishLine = `${store.parish.name} · ${store.parish.pascomName}`;
  const name = (id: string | null) => members.find((m) => m.id === id)?.name.split(' ')[0];

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="card relative overflow-hidden rounded-[2rem] p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-electric/20 blur-[90px]" />
        <div className="pointer-events-none absolute -bottom-24 right-40 h-60 w-60 rounded-full bg-neon/15 blur-[90px]" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Badge tone="neon" dot>{capitalize(fmtDateLong(today))}</Badge>
            <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
              {greeting()}, <span className="text-gradient">equipe!</span>
            </motion.h1>
            <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="mt-2 text-ink-muted">
              Vamos organizar a próxima missão.
            </motion.p>
          </div>
          <div className="flex flex-wrap gap-2">
            {can('manage:schedules') && <Button variant="primary" icon={Plus} onClick={() => editor.open()}>Criar escala</Button>}
            <Link to="/calendario"><Button icon={CalendarClock}>Ver calendário</Button></Link>
          </div>
        </div>
      </section>

      {/* KPIs */}
      <Stagger className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {stats.map((s) => (
          <Item key={s.label}>
            <Card hover className="h-full p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl" style={{ background: `${s.color}14`, color: s.color }}>
                  <s.icon className="h-5 w-5" />
                </span>
              </div>
              <p className="mt-4 text-3xl font-bold tracking-tight">{s.value}</p>
              <p className="mt-1 text-sm font-medium">{s.label}</p>
              <p className="text-xs text-ink-muted">{s.hint}</p>
            </Card>
          </Item>
        ))}
      </Stagger>

      {/* Painel em vidro: missões, calendário em pontos e relógio */}
      <section aria-label="Painel da missão">
        <p className="eyebrow mb-3 px-1">Painel da missão</p>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1.25fr]">
          <div className="md:row-span-2 xl:row-span-1"><MissionsWidget /></div>
          <DotCalendarWidget />
          <div className="flex flex-col gap-4 md:col-start-2 xl:col-start-auto">
            <ClockWidget />
            <div className="card relative flex flex-1 flex-col justify-end overflow-hidden p-5">
              <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-electric/25 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-12 left-6 h-32 w-32 rounded-full bg-neon/20 blur-3xl" />
              <p className="relative text-sm text-ink-muted">{parishLine}</p>
              <p className="relative mt-1 text-lg font-semibold leading-snug">Evangelizar com criatividade, uma celebração por vez.</p>
              <span className="relative mt-4 w-fit rounded-full bg-neon px-3.5 py-1.5 text-sm font-medium text-bg shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">PASCOM</span>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        {/* Próxima celebração */}
        {next ? (
          <Card className="relative overflow-hidden p-0">
            <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-neon/[0.07] to-transparent" />
            <div className="relative grid gap-6 p-6 sm:grid-cols-[1fr_auto]">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-neon">Próxima celebração</p>
                <h2 className="mt-2 text-2xl font-bold tracking-tight">{next.title}</h2>
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-ink-muted">
                  <span className="flex items-center gap-1.5"><CalendarClock className="h-4 w-4" />{capitalize(fmtDateLong(next.date))}</span>
                  <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" />{next.start} – {next.end}</span>
                  <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" />{next.location}</span>
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  {next.slots.map((sl) => {
                    const r = roles.find((x) => x.id === sl.roleId)!;
                    const open = isOpenSlot(sl);
                    return (
                      <span key={sl.id} className={cn('inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs', open ? 'border-danger/30 text-danger' : 'border-line text-ink')}>
                        <RoleIcon icon={r?.icon ?? 'Sparkles'} color={open ? '#FF6B7A' : r?.color ?? '#fff'} size={13} />
                        {r?.name}{!open && sl.memberId ? ` · ${name(sl.memberId)}` : ''}
                      </span>
                    );
                  })}
                </div>
                <div className="mt-6 flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => detail.open(next.id)}>Ver detalhes <ArrowRight className="h-4 w-4" /></Button>
                </div>
              </div>
              <div className="flex flex-col items-center justify-center gap-2">
                <ProgressRing value={coverage(next).pct} size={128} stroke={10} label={<span className="text-center"><span className="block text-2xl font-bold">{coverage(next).pct}%</span><span className="text-[11px] font-normal text-ink-muted">cobertura</span></span>} />
                <ScheduleStatusBadge status={scheduleStatus(next)} />
              </div>
            </div>
          </Card>
        ) : (
          <EmptyState title="Nenhuma celebração futura" body="Crie a primeira escala para ver aqui a próxima missão da equipe." action={can('manage:schedules') && <Button variant="primary" icon={Plus} onClick={() => editor.open()}>Criar escala</Button>} />
        )}

        {/* Gráfico */}
        <Card>
          <SectionTitle title="Cobertura das escalas" subtitle="% de vagas preenchidas por dia no período · dados demonstrativos" />
          {chart.length ? (
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chart} margin={{ left: -24, right: 4, top: 6 }}>
                  <defs>
                    <linearGradient id="cov" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0" stopColor="#5BFF9A" stopOpacity={0.35} />
                      <stop offset="1" stopColor="#55B8FF" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#252F3C" strokeDasharray="3 6" vertical={false} />
                  <XAxis dataKey="dia" tick={{ fill: '#96A3B5', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fill: '#96A3B5', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: '#10151D', border: '1px solid #252F3C', borderRadius: 14, fontSize: 12 }} formatter={(v) => [`${v}%`, 'Cobertura']} />
                  <Area type="monotone" dataKey="cobertura" stroke="#5BFF9A" strokeWidth={2.5} fill="url(#cov)" animationDuration={900} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="py-16 text-center text-sm text-ink-muted">Sem escalas no período selecionado.</p>
          )}
        </Card>
      </div>

      {/* Escalas desta semana */}
      <Card className="p-4 sm:p-6">
        <SectionTitle title="Escalas desta semana" subtitle="Toque em um dia para filtrar" action={<Link to="/escalas" className="text-sm text-neon hover:underline">Ver todas</Link>} />
        <div className="-mx-1 mb-5 grid grid-cols-7 gap-1.5 sm:gap-2">
          {week.map((d) => {
            const list = weekSchedules.filter((s) => s.date === d);
            const sel = d === selectedDay;
            return (
              <button key={d} onClick={() => setSelectedDay(d)} aria-pressed={sel}
                className={cn('relative flex flex-col items-center rounded-2xl border py-2.5 transition-all sm:py-3', sel ? 'glass border-neon/70 shadow-glow' : 'border-white/[0.05] bg-white/[0.03] hover:border-white/15', d === today && !sel && 'border-line')}>
                <span className="flex h-2 items-center gap-0.5">
                  {list.slice(0, 3).map((s) => {
                    const st = scheduleStatus(s);
                    return <span key={s.id} className={cn('h-1.5 w-1.5 rounded-full', st === 'completa' ? 'bg-neon' : st === 'aguardando' ? 'bg-warn' : 'bg-danger')} />;
                  })}
                </span>
                <span className="mt-2 text-[11px] text-ink-muted sm:text-xs">{capitalize(fmt(d, 'EEE')).slice(0, 3)}</span>
                <span className={cn('text-base font-semibold sm:text-lg', sel && 'text-neon')}>{fmt(d, 'd')}</span>
              </button>
            );
          })}
        </div>

        {dayList.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line py-8 text-center text-sm text-ink-muted">Nenhuma escala neste dia.</p>
        ) : (
          <>
            {/* Tabela desktop */}
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-ink-muted">
                    <th className="pb-3 font-medium">Celebração</th>
                    {KEY_ROLES.map((r) => <th key={r} className="pb-3 font-medium">{roles.find((x) => x.id === r)?.name}</th>)}
                    <th className="pb-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {dayList.map((s) => (
                    <tr key={s.id} onClick={() => detail.open(s.id)} className="cursor-pointer border-t border-line/60 transition-colors hover:bg-white/[0.02]">
                      <td className="py-3 pr-3">
                        <p className="font-medium">{s.title}</p>
                        <p className="text-xs text-ink-muted">{s.start}–{s.end}</p>
                      </td>
                      {KEY_ROLES.map((rid) => {
                        const sl = s.slots.find((x) => x.roleId === rid);
                        if (!sl) return <td key={rid} className="py-3 text-ink-muted/50">—</td>;
                        const open = isOpenSlot(sl);
                        return (
                          <td key={rid} className="py-3 pr-2">
                            {open ? <span className="text-xs text-danger">Vaga aberta</span> : (
                              <span className="flex items-center gap-1.5">
                                <span className={cn('h-1.5 w-1.5 rounded-full', sl.status === 'confirmado' ? 'bg-neon' : 'bg-warn')} />
                                {name(sl.memberId)}
                              </span>
                            )}
                          </td>
                        );
                      })}
                      <td className="py-3"><ScheduleStatusBadge status={scheduleStatus(s)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Cards mobile */}
            <div className="space-y-2.5 lg:hidden">
              {dayList.map((s) => (
                <button key={s.id} onClick={() => detail.open(s.id)} className="w-full rounded-2xl border border-line bg-surface/50 p-4 text-left">
                  <div className="flex items-start justify-between gap-2">
                    <div><p className="font-medium">{s.title}</p><p className="text-xs text-ink-muted">{s.start}–{s.end}</p></div>
                    <ScheduleStatusBadge status={scheduleStatus(s)} />
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                    {s.slots.map((sl) => (
                      <div key={sl.id} className="flex justify-between gap-2">
                        <dt className="text-ink-muted">{roles.find((x) => x.id === sl.roleId)?.name}</dt>
                        <dd className={cn('truncate', isOpenSlot(sl) ? 'text-danger' : sl.status === 'confirmado' ? 'text-neon' : 'text-warn')}>{isOpenSlot(sl) ? 'Aberta' : name(sl.memberId)}</dd>
                      </div>
                    ))}
                  </dl>
                </button>
              ))}
            </div>
          </>
        )}
        <div className="mt-4 flex flex-wrap gap-3 text-xs text-ink-muted">
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-neon" />Confirmado / completa</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-warn" />Aguardando confirmação</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-danger" />Precisa de voluntário</span>
        </div>
      </Card>

      {can('manage:schedules') && <SwapsWidget />}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Próximas celebrações */}
        <Card>
          <SectionTitle title="Próximas celebrações" />
          <ul className="space-y-1">
            {upcoming.slice(0, 5).map((s) => {
              const c = coverage(s);
              return (
                <li key={s.id}>
                  <button onClick={() => detail.open(s.id)} className="flex w-full items-center gap-3 rounded-2xl p-2 text-left transition-colors hover:bg-white/[0.03]">
                    <span className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-2xl bg-surface">
                      <span className="text-[10px] uppercase text-ink-muted">{fmt(s.date, 'MMM').replace('.', '')}</span>
                      <span className="text-base font-bold leading-none">{fmt(s.date, 'dd')}</span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{s.title}</span>
                      <span className="text-xs text-ink-muted">{capitalize(fmt(s.date, 'EEEE'))} · {s.start}</span>
                    </span>
                    <span className={cn('text-xs font-semibold', c.pct === 100 ? 'text-neon' : c.pct >= 70 ? 'text-warn' : 'text-danger')}>{c.pct}%</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>

        {/* Atividades recentes */}
        <Card>
          <SectionTitle title="Atividades recentes" />
          <ol className="space-y-3.5">
            {audit.slice(0, 5).map((a) => (
              <li key={a.id} className="flex gap-3">
                <Avatar name={a.actor} size={30} />
                <div className="min-w-0">
                  <p className="text-sm leading-snug">{a.summary}</p>
                  <p className="mt-0.5 text-xs text-ink-muted">{a.actor.split(' ')[0]} · {formatDistanceToNow(parseISO(a.at), { locale: ptBR, addSuffix: true })}</p>
                </div>
              </li>
            ))}
          </ol>
        </Card>

        {/* Avisos */}
        <Card>
          <SectionTitle title="Avisos da equipe" action={can('manage:team') && <Button size="sm" variant="ghost" icon={Megaphone} onClick={() => setAnnOpen(true)}>Novo</Button>} />
          {announcements.length === 0 ? <p className="text-sm text-ink-muted">Sem avisos por enquanto.</p> : (
            <ul className="space-y-3">
              {announcements.slice(0, 4).map((a) => (
                <li key={a.id} className="rounded-2xl border border-line bg-surface/50 p-3.5">
                  <p className="flex items-center gap-1.5 text-sm font-medium">{a.pinned && <Pin className="h-3.5 w-3.5 text-neon" />}{a.title}</p>
                  <p className="mt-1 text-sm text-ink-muted">{a.body}</p>
                  <p className="mt-2 text-[11px] text-ink-muted">{a.author} · {formatDistanceToNow(parseISO(a.createdAt), { locale: ptBR, addSuffix: true })}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="flex flex-col items-start justify-between gap-4 bg-gradient-to-r from-neon/[0.10] via-transparent to-electric/[0.08] sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-neon text-bg"><Users className="h-5 w-5" /></span>
          <div>
            <p className="font-semibold">{members.filter((m) => m.status === 'ativo').length} integrantes ativos</p>
            <p className="text-sm text-ink-muted">Encontre quem está disponível para a próxima celebração.</p>
          </div>
        </div>
        <Link to={can('manage:team') ? '/equipe' : '/minhas-escalas'}><Button variant="outline">{can('manage:team') ? 'Consultar disponibilidade' : 'Ver minhas escalas'}</Button></Link>
      </Card>

      <AnnouncementModal open={annOpen} onOpenChange={setAnnOpen} />
    </div>
  );
}

function AnnouncementModal({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { addAnnouncement } = useStore();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [err, setErr] = useState('');
  const submit = () => {
    if (title.trim().length < 3 || body.trim().length < 3) return setErr('Preencha título e mensagem.');
    addAnnouncement({ title: title.trim(), body: body.trim() });
    toast.success('Aviso publicado para a equipe.');
    setTitle(''); setBody(''); setErr(''); onOpenChange(false);
  };
  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Novo aviso" size="sm"
      footer={<><Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button><Button variant="primary" onClick={submit}>Publicar</Button></>}>
      <div className="space-y-4">
        <Field label="Título" error={err && !title.trim() ? err : undefined}><Input value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
        <Field label="Mensagem" error={err && title.trim() ? err : undefined}><Textarea value={body} onChange={(e) => setBody(e.target.value)} /></Field>
      </div>
    </Modal>
  );
}
