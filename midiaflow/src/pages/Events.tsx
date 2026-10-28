import { CalendarPlus, CheckCircle2, Circle, Clock, MapPin, Pencil, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useScheduleDetail } from '@/components/schedule/ScheduleDetail';
import { EVENT_TYPES, useScheduleEditor } from '@/components/schedule/ScheduleEditor';
import { Badge, Bar, Button, Card, ConfirmDialog, EmptyState, Field, Input, Modal, PageHeader, RoleIcon, Segmented, Select, Textarea } from '@/components/ui';
import { coverage, scheduleStatus } from '@/lib/domain';
import { useStore } from '@/lib/store';
import type { EventType, ParishEvent } from '@/lib/types';
import { capitalize, cn, fmtDateLong, timeToMin, toISODate, uid } from '@/lib/utils';
import { ScheduleStatusBadge } from '@/components/schedule/parts';
import { TYPE_COLOR } from './CalendarPage';

const CHECKLIST = ['Fotografia', 'Vídeo', 'Stories', 'Entrevistas', 'Bastidores', 'Publicação', 'Organização dos arquivos'];

export default function Events() {
  const store = useStore();
  const { events, schedules, roles, can } = store;
  const editor = useScheduleEditor();
  const detail = useScheduleDetail();
  const [params] = useSearchParams();
  const [editing, setEditing] = useState<ParishEvent | null>(null);
  const [toDelete, setToDelete] = useState<ParishEvent | null>(null);
  const [when, setWhen] = useState<'proximos' | 'passados'>('proximos');
  const today = toISODate(new Date());
  const focus = params.get('id');

  useEffect(() => {
    if (focus) document.getElementById(focus)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [focus]);

  const list = events.filter((e) => (when === 'proximos' ? e.date >= today : e.date < today)).sort((a, b) => (when === 'proximos' ? 1 : -1) * a.date.localeCompare(b.date));
  const manage = can('manage:events');

  return (
    <div>
      <PageHeader title="Eventos e cobertura" subtitle="Festas, retiros, procissões e tudo o que a PASCOM precisa preparar"
        actions={manage && <Button variant="primary" icon={Plus} onClick={() => setEditing(blankEvent())}>Novo evento</Button>} />
      <Segmented className="mb-5" value={when} onChange={setWhen} options={[{ value: 'proximos', label: 'Próximos' }, { value: 'passados', label: 'Passados' }]} />

      {list.length === 0 ? (
        <EmptyState title="Nenhum evento" body={when === 'proximos' ? 'Cadastre o próximo evento da paróquia para organizar a cobertura.' : 'Nenhum evento passado.'}
          action={manage && when === 'proximos' && <Button variant="primary" icon={Plus} onClick={() => setEditing(blankEvent())}>Novo evento</Button>} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {list.map((e) => {
            const linked = schedules.find((s) => s.eventId === e.id);
            const done = e.checklist.filter((c) => c.done).length;
            const pending = e.checklist.filter((c) => !c.done);
            return (
              <Card key={e.id} id={e.id} className={cn('p-5', focus === e.id && 'border-neon/50 shadow-glow')}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Badge className="mb-2" tone="muted"><span className="h-1.5 w-1.5 rounded-full" style={{ background: TYPE_COLOR[e.type] }} />{e.type}</Badge>
                    <h3 className="text-lg font-semibold tracking-tight">{e.title}</h3>
                    <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-muted">
                      <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" />{capitalize(fmtDateLong(e.date))} · {e.start}–{e.end}</span>
                      <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" />{e.location}</span>
                    </div>
                  </div>
                  {manage && (
                    <div className="flex shrink-0 gap-1">
                      <Button size="icon" variant="ghost" className="h-9 w-9" aria-label="Editar evento" onClick={() => setEditing(e)}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" className="h-9 w-9" aria-label="Excluir evento" onClick={() => setToDelete(e)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  )}
                </div>
                {e.description && <p className="mt-3 text-sm text-ink-muted">{e.description}</p>}

                <div className="mt-4 flex flex-wrap gap-1.5">
                  {e.requiredRoleIds.map((rid) => {
                    const r = roles.find((x) => x.id === rid);
                    return r ? <span key={rid} className="inline-flex items-center gap-1.5 rounded-full border border-line px-2 py-0.5 text-[11px]"><RoleIcon icon={r.icon} color={r.color} size={12} />{r.name}</span> : null;
                  })}
                </div>

                <div className="mt-4 rounded-2xl border border-line/60 bg-surface/40 p-3">
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-medium">Cobertura da equipe</span>
                    {linked ? <ScheduleStatusBadge status={scheduleStatus(linked)} /> : <Badge tone="danger" dot>Sem escala</Badge>}
                  </div>
                  {linked ? (
                    <button className="w-full text-left" onClick={() => detail.open(linked.id)}>
                      <Bar value={coverage(linked).pct} />
                      <p className="mt-1.5 text-xs text-ink-muted">{coverage(linked).filled}/{coverage(linked).total} vagas preenchidas · ver escala</p>
                    </button>
                  ) : manage ? (
                    <Button size="sm" variant="outline" icon={CalendarPlus} onClick={() => editor.open({ eventId: e.id })}>Montar escala deste evento</Button>
                  ) : <p className="text-xs text-ink-muted">A coordenação ainda vai montar a escala.</p>}
                </div>

                <div className="mt-4">
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-medium">Checklist de produção</span>
                    <span className="text-xs text-ink-muted">{done}/{e.checklist.length}</span>
                  </div>
                  <Bar value={e.checklist.length ? (done / e.checklist.length) * 100 : 0} className="mb-3" />
                  <ul className="grid gap-1 sm:grid-cols-2">
                    {e.checklist.map((c) => (
                      <li key={c.id}>
                        <button disabled={!manage} onClick={() => store.toggleChecklist(e.id, c.id)} aria-pressed={c.done}
                          className={cn('flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left text-sm transition-colors enabled:hover:bg-white/5', c.done ? 'text-ink-muted line-through' : 'text-ink')}>
                          {c.done ? <CheckCircle2 className="h-4 w-4 shrink-0 text-neon" /> : <Circle className="h-4 w-4 shrink-0 text-ink-muted" />}
                          {c.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                  {pending.length > 0 && e.date >= today && <p className="mt-2 text-xs text-warn">Falta preparar: {pending.map((p) => p.label).join(', ')}.</p>}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {editing && <EventEditor event={editing} onClose={() => setEditing(null)} />}
      <ConfirmDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)} title="Excluir evento?" body={`“${toDelete?.title}” será removido. Escalas já criadas continuam existindo.`}
        onConfirm={() => { if (toDelete) { store.deleteEvent(toDelete.id); toast.success('Evento excluído.'); } }} />
    </div>
  );
}

const blankEvent = (): ParishEvent => ({
  id: uid('ev'), title: '', type: 'Evento especial', date: toISODate(new Date()), start: '19:00', end: '21:00', location: '', description: '',
  requiredRoleIds: ['foto', 'stories'], checklist: CHECKLIST.map((label) => ({ id: uid('ck'), label, done: false })),
});

function EventEditor({ event, onClose }: { event: ParishEvent; onClose: () => void }) {
  const { roles, events, saveEvent } = useStore();
  const [e, setE] = useState(structuredClone(event));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [item, setItem] = useState('');
  const isNew = !events.some((x) => x.id === event.id);
  const save = () => {
    const er: Record<string, string> = {};
    if (e.title.trim().length < 3) er.title = 'Informe o nome do evento.';
    if (!e.date) er.date = 'Escolha a data.';
    if (timeToMin(e.end) <= timeToMin(e.start)) er.time = 'O término precisa ser depois do início.';
    if (!e.location.trim()) er.location = 'Informe o local.';
    setErrors(er);
    if (Object.keys(er).length) return toast.error('Revise os campos destacados.');
    saveEvent({ ...e, title: e.title.trim(), location: e.location.trim() });
    toast.success(isNew ? 'Evento criado!' : 'Evento atualizado.');
    onClose();
  };
  return (
    <Modal open onOpenChange={(o) => !o && onClose()} title={isNew ? 'Novo evento' : 'Editar evento'} size="lg"
      footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button variant="primary" onClick={save}>Salvar</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome" error={errors.title} className="sm:col-span-2"><Input autoFocus value={e.title} invalid={!!errors.title} onChange={(x) => setE({ ...e, title: x.target.value })} /></Field>
        <Field label="Tipo"><Select value={e.type} onChange={(x) => setE({ ...e, type: x.target.value as EventType })}>{EVENT_TYPES.map((t) => <option key={t}>{t}</option>)}</Select></Field>
        <Field label="Data" error={errors.date}><Input type="date" value={e.date} onChange={(x) => setE({ ...e, date: x.target.value })} /></Field>
        <Field label="Início" error={errors.time}><Input type="time" value={e.start} onChange={(x) => setE({ ...e, start: x.target.value })} /></Field>
        <Field label="Término"><Input type="time" value={e.end} onChange={(x) => setE({ ...e, end: x.target.value })} /></Field>
        <Field label="Local" error={errors.location} className="sm:col-span-2"><Input value={e.location} invalid={!!errors.location} onChange={(x) => setE({ ...e, location: x.target.value })} /></Field>
        <Field label="Descrição" className="sm:col-span-2"><Textarea value={e.description} onChange={(x) => setE({ ...e, description: x.target.value })} /></Field>
      </div>
      <p className="label mt-6">Equipe necessária</p>
      <div className="flex flex-wrap gap-2">
        {roles.map((r) => {
          const on = e.requiredRoleIds.includes(r.id);
          return (
            <button key={r.id} type="button" aria-pressed={on} onClick={() => setE({ ...e, requiredRoleIds: on ? e.requiredRoleIds.filter((x) => x !== r.id) : [...e.requiredRoleIds, r.id] })}
              className={cn('inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs', on ? 'border-neon/50 bg-neon/10' : 'border-line text-ink-muted')}>
              <RoleIcon icon={r.icon} color={r.color} size={13} />{r.name}
            </button>
          );
        })}
      </div>
      <p className="label mt-6">Checklist de produção</p>
      <ul className="space-y-1.5">
        {e.checklist.map((c) => (
          <li key={c.id} className="flex items-center gap-2 rounded-xl border border-line bg-surface/50 px-3 py-2 text-sm">
            <span className="flex-1">{c.label}</span>
            <button type="button" aria-label={`Remover ${c.label}`} className="text-ink-muted hover:text-danger" onClick={() => setE({ ...e, checklist: e.checklist.filter((x) => x.id !== c.id) })}><Trash2 className="h-4 w-4" /></button>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex gap-2">
        <Input value={item} onChange={(x) => setItem(x.target.value)} placeholder="Novo item (ex.: Drone)" className="h-10"
          onKeyDown={(x) => { if (x.key === 'Enter' && item.trim()) { x.preventDefault(); setE({ ...e, checklist: [...e.checklist, { id: uid('ck'), label: item.trim(), done: false }] }); setItem(''); } }} />
        <Button type="button" size="sm" variant="outline" icon={Plus} className="h-10 shrink-0" onClick={() => { if (item.trim()) { setE({ ...e, checklist: [...e.checklist, { id: uid('ck'), label: item.trim(), done: false }] }); setItem(''); } }}>Adicionar</Button>
      </div>
    </Modal>
  );
}
