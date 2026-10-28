import { CalendarClock, MapPin, PartyPopper } from 'lucide-react';
import { useMemo, useState } from 'react';
import { RespondButtons } from '@/components/schedule/RespondButtons';
import { SlotStatusBadge } from '@/components/schedule/parts';
import { useScheduleDetail } from '@/components/schedule/ScheduleDetail';
import { Badge, Button, Card, EmptyState, Item, PageHeader, RoleIcon, Segmented, Stagger } from '@/components/ui';
import { useStore } from '@/lib/store';
import { capitalize, fmt, fmtDateLong, PERIOD_LABEL, toISODate, WEEKDAYS } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

export default function MySchedules() {
  const { schedules, roles, me, members } = useStore();
  const detail = useScheduleDetail();
  const nav = useNavigate();
  const [tab, setTab] = useState<'proximas' | 'historico'>('proximas');
  const today = toISODate(new Date());

  const mine = useMemo(
    () => schedules.flatMap((s) => s.slots.filter((x) => x.memberId === me.id).map((slot) => ({ s, slot }))).sort((a, b) => (a.s.date + a.s.start).localeCompare(b.s.date + b.s.start)),
    [schedules, me.id],
  );
  const upcoming = mine.filter((x) => x.s.date >= today);
  const past = mine.filter((x) => x.s.date < today).reverse();
  const pending = upcoming.filter((x) => x.slot.status === 'pendente').length;
  const list = tab === 'proximas' ? upcoming : past;
  const coordName = (id: string) => members.find((m) => m.id === id)?.name;

  return (
    <div>
      <PageHeader title="Minhas escalas" subtitle={`Olá, ${me.name.split(' ')[0]}! ${pending ? `Você tem ${pending} escala(s) aguardando sua resposta.` : 'Tudo respondido por aqui.'}`} />

      <Card className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm">
          <p className="font-medium">Minha disponibilidade</p>
          <p className="text-ink-muted">
            {me.availability.weekdays.map((d) => WEEKDAYS[d]).join(', ') || 'Nenhum dia'} · {me.availability.periods.map((p) => PERIOD_LABEL[p]).join(', ') || 'nenhum período'}
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => nav('/configuracoes#disponibilidade')}>Atualizar disponibilidade</Button>
      </Card>

      <Segmented className="mb-5" value={tab} onChange={setTab} options={[{ value: 'proximas', label: `Próximas (${upcoming.length})` }, { value: 'historico', label: `Histórico (${past.length})` }]} />

      {list.length === 0 ? (
        <EmptyState icon={PartyPopper} title={tab === 'proximas' ? 'Nenhuma escala futura' : 'Sem histórico ainda'} body={tab === 'proximas' ? 'Quando a coordenação escalar você, ela aparece aqui para você confirmar.' : 'Suas participações confirmadas vão aparecer aqui.'} />
      ) : (
        <Stagger className="grid gap-3 lg:grid-cols-2">
          {list.map(({ s, slot }) => {
            const r = roles.find((x) => x.id === slot.roleId);
            return (
              <Item key={slot.id}>
                <Card className="h-full p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {r && <RoleIcon icon={r.icon} color={r.color} size={18} boxed />}
                      <div>
                        <p className="text-xs text-ink-muted">{r?.name}</p>
                        <button className="text-left font-semibold hover:text-neon" onClick={() => detail.open(s.id)}>{s.title}</button>
                      </div>
                    </div>
                    <SlotStatusBadge status={slot.status} />
                  </div>
                  <div className="mt-3 space-y-1 text-sm text-ink-muted">
                    <p className="flex items-center gap-2"><CalendarClock className="h-4 w-4" />{capitalize(fmtDateLong(s.date))} · {s.start}–{s.end}</p>
                    <p className="flex items-center gap-2"><MapPin className="h-4 w-4" />{s.location}</p>
                    {s.notes && <p className="pt-1 text-ink">{s.notes}</p>}
                    <p className="pt-1 text-xs">Responsável: {coordName(s.coordinatorId)}</p>
                  </div>
                  {tab === 'proximas' ? (
                    <div className="mt-4 border-t border-line/60 pt-4"><RespondButtons scheduleId={s.id} slot={slot} /></div>
                  ) : (
                    <p className="mt-4 text-xs text-ink-muted">{slot.status === 'confirmado' ? <Badge tone="neon">Participou</Badge> : 'Não participou'} · {fmt(s.date, 'dd/MM/yyyy')}</p>
                  )}
                </Card>
              </Item>
            );
          })}
        </Stagger>
      )}
    </div>
  );
}
