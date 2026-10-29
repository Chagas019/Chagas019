import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Info, Plus, Sparkles, Trash2 } from 'lucide-react';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { checkAssignment, suggestMembers } from '@/lib/domain';
import { useStore } from '@/lib/store';
import type { EventType, Schedule, Slot } from '@/lib/types';
import { cn, timeToMin, toISODate, uid } from '@/lib/utils';
import { Button, Field, Input, Modal, RoleIcon, Select, Textarea } from '../ui';

export const EVENT_TYPES: EventType[] = [
  'Missa', 'Adoração', 'Retiro', 'Festa paroquial', 'Procissão', 'Encontro de jovens', 'Formação', 'Campanha solidária', 'Evento especial',
];

type OpenArg = { schedule?: Schedule; date?: string; eventId?: string };
const Ctx = createContext<{ open: (a?: OpenArg) => void }>({ open: () => {} });
export const useScheduleEditor = () => useContext(Ctx);

export function ScheduleEditorProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ open: boolean; arg: OpenArg; key: number }>({ open: false, arg: {}, key: 0 });
  const open = useCallback((arg: OpenArg = {}) => setState((s) => ({ open: true, arg, key: s.key + 1 })), []);
  return (
    <Ctx.Provider value={{ open }}>
      {children}
      <ScheduleEditor key={state.key} open={state.open} arg={state.arg} onOpenChange={(o) => setState((s) => ({ ...s, open: o }))} />
    </Ctx.Provider>
  );
}

function blank(date: string | undefined, coordinatorId: string): Schedule {
  return {
    id: uid('e'),
    title: '',
    eventType: 'Missa',
    date: date ?? toISODate(new Date()),
    start: '19:00',
    end: '20:15',
    location: '',
    coordinatorId,
    notes: '',
    createdAt: new Date().toISOString(),
    slots: ['foto', 'stories', 'projecao'].map((roleId) => ({ id: uid('s'), roleId, memberId: null, status: 'pendente' as const })),
  };
}

function ScheduleEditor({ open, onOpenChange, arg }: { open: boolean; onOpenChange: (o: boolean) => void; arg: OpenArg }) {
  const store = useStore();
  const { roles, members, schedules, events } = store;
  const editing = !!arg.schedule;
  const [draft, setDraft] = useState<Schedule>(() => {
    if (arg.schedule) return structuredClone(arg.schedule);
    const last = [...store.schedules].sort((x, y) => y.createdAt.localeCompare(x.createdAt))[0];
    // Sugere o último local usado: quase sempre é a mesma igreja.
    const b = { ...blank(arg.date, store.me.id), location: last?.location ?? '' };
    const ev = events.find((e) => e.id === arg.eventId);
    if (ev) {
      return {
        ...b, title: ev.title, eventType: ev.type, eventId: ev.id, date: ev.date, start: ev.start, end: ev.end, location: ev.location,
        slots: ev.requiredRoleIds.map((roleId) => ({ id: uid('s'), roleId, memberId: null, status: 'pendente' as const })),
      };
    }
    return b;
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [ackConflicts, setAckConflicts] = useState(false);
  const [newRole, setNewRole] = useState('');
  const [saving, setSaving] = useState(false);

  const ctx = useMemo(() => ({ schedules, members, roles }), [schedules, members, roles]);
  const set = <K extends keyof Schedule>(k: K, v: Schedule[K]) => {
    setDraft((d) => ({ ...d, [k]: v }));
    setAckConflicts(false);
  };
  const setSlot = (id: string, patch: Partial<Slot>) => {
    setDraft((d) => ({ ...d, slots: d.slots.map((s) => (s.id === id ? { ...s, ...patch } : s)) }));
    setAckConflicts(false);
  };

  const conflictsBySlot = useMemo(() => {
    const map: Record<string, ReturnType<typeof checkAssignment>> = {};
    for (const s of draft.slots) if (s.memberId) map[s.id] = checkAssignment(draft, s.id, s.memberId, ctx);
    return map;
  }, [draft, ctx]);
  const hardConflicts = Object.values(conflictsBySlot).flat().filter((c) => c.severity === 'alerta');

  const validate = () => {
    const e: Record<string, string> = {};
    if (draft.title.trim().length < 3) e.title = 'Informe o nome da celebração (mín. 3 letras).';
    if (!draft.date) e.date = 'Escolha a data.';
    if (!draft.start || !draft.end) e.time = 'Informe início e término.';
    else if (timeToMin(draft.end) <= timeToMin(draft.start)) e.time = 'O término precisa ser depois do início.';
    if (!draft.location.trim()) e.location = 'Informe o local.';
    if (draft.slots.length === 0) e.slots = 'Adicione pelo menos uma função.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const save = () => {
    if (!validate()) {
      toast.error('Revise os campos destacados.');
      return;
    }
    if (hardConflicts.length && !ackConflicts) {
      setAckConflicts(true);
      toast.warning('Há conflitos de horário ou de função. Revise e clique em “Salvar mesmo assim”.');
      return;
    }
    setSaving(true);
    // Ao trocar o responsável de uma vaga, a confirmação volta a ficar pendente.
    const original = arg.schedule;
    const slots = draft.slots.map((s) => {
      const before = original?.slots.find((o) => o.id === s.id);
      if (!s.memberId) return { ...s, status: 'pendente' as const, note: undefined };
      if (!before || before.memberId !== s.memberId) return { ...s, status: 'pendente' as const, note: undefined, respondedAt: undefined };
      return s;
    });
    store.saveSchedule({ ...draft, title: draft.title.trim(), location: draft.location.trim(), slots });
    setTimeout(() => {
      setSaving(false);
      onOpenChange(false);
      toast.success(editing ? 'Escala atualizada.' : 'Escala criada!', { description: `${draft.title} · ${draft.date.split('-').reverse().join('/')} às ${draft.start}` });
    }, 250);
  };

  const addCustomRole = () => {
    const name = newRole.trim();
    if (!name) return;
    const existing = roles.find((r) => r.name.toLowerCase() === name.toLowerCase());
    const id = existing?.id ?? uid('r');
    if (!existing) store.saveRole({ id, name, color: '#55B8FF', icon: 'Sparkles', description: 'Função personalizada.', compatibleWith: [] });
    setDraft((d) => ({ ...d, slots: [...d.slots, { id: uid('s'), roleId: id, memberId: null, status: 'pendente' }] }));
    setNewRole('');
  };

  const coordinators = members.filter((m) => m.access !== 'integrante' || m.roleIds.includes('coord'));

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title={editing ? 'Editar escala' : 'Criar escala'}
      description="Defina a celebração, as funções necessárias e quem vai servir em cada uma."
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button variant="primary" loading={saving} onClick={save}>
            {hardConflicts.length && ackConflicts ? 'Salvar mesmo assim' : editing ? 'Salvar alterações' : 'Criar escala'}
          </Button>
        </>
      }
    >
      <form onSubmit={(e) => { e.preventDefault(); save(); }} className="space-y-6" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nome da celebração" error={errors.title} className="sm:col-span-2">
            <Input autoFocus value={draft.title} invalid={!!errors.title} onChange={(e) => set('title', e.target.value)} placeholder="Ex.: Missa da Juventude" />
          </Field>
          <Field label="Tipo de evento">
            <Select value={draft.eventType} onChange={(e) => set('eventType', e.target.value as EventType)}>
              {EVENT_TYPES.map((t) => <option key={t}>{t}</option>)}
            </Select>
          </Field>
          <Field label="Data" error={errors.date}>
            <Input type="date" value={draft.date} invalid={!!errors.date} onChange={(e) => set('date', e.target.value)} />
          </Field>
          <Field label="Início" error={errors.time}>
            <Input type="time" value={draft.start} invalid={!!errors.time} onChange={(e) => set('start', e.target.value)} />
          </Field>
          <Field label="Término">
            <Input type="time" value={draft.end} invalid={!!errors.time} onChange={(e) => set('end', e.target.value)} />
          </Field>
          <Field label="Local" error={errors.location}>
            <Input value={draft.location} invalid={!!errors.location} onChange={(e) => set('location', e.target.value)} placeholder="Ex.: Igreja Matriz" />
          </Field>
          <Field label="Responsável pela escala">
            <Select value={draft.coordinatorId} onChange={(e) => set('coordinatorId', e.target.value)}>
              {coordinators.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </Select>
          </Field>
          <Field label="Observações" className="sm:col-span-2">
            <Textarea value={draft.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Orientações para a equipe (opcional)" />
          </Field>
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <span className="label mb-0">Funções e integrantes ({draft.slots.length})</span>
            <Select
              aria-label="Adicionar função"
              className="h-9 w-auto rounded-full text-[13px]"
              value=""
              onChange={(e) => {
                if (!e.target.value) return;
                setDraft((d) => ({ ...d, slots: [...d.slots, { id: uid('s'), roleId: e.target.value, memberId: null, status: 'pendente' }] }));
              }}
            >
              <option value="">+ Adicionar função</option>
              {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </Select>
          </div>
          {errors.slots && <p role="alert" className="mb-2 text-xs text-danger">{errors.slots}</p>}

          <div className="space-y-2.5">
            <AnimatePresence initial={false}>
              {draft.slots.map((slot) => {
                const role = roles.find((r) => r.id === slot.roleId);
                const suggestions = suggestMembers(draft, slot.id, ctx);
                const conflicts = conflictsBySlot[slot.id] ?? [];
                return (
                  <motion.div
                    key={slot.id}
                    layout
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className={cn('rounded-2xl border bg-surface/60 p-3', conflicts.some((c) => c.severity === 'alerta') ? 'border-warn/40' : 'border-line')}>
                      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
                        <div className="flex min-w-[170px] items-center gap-2.5">
                          {role && <RoleIcon icon={role.icon} color={role.color} boxed />}
                          <span className="text-sm font-medium">{role?.name ?? 'Função removida'}</span>
                        </div>
                        <div className="flex flex-1 items-center gap-2">
                          <Select
                            aria-label={`Integrante para ${role?.name}`}
                            value={slot.memberId ?? ''}
                            onChange={(e) => setSlot(slot.id, { memberId: e.target.value || null })}
                          >
                            <option value="">— Vaga aberta —</option>
                            {suggestions.map(({ member, conflicts: c }) => (
                              <option key={member.id} value={member.id}>
                                {c.some((x) => x.severity === 'alerta') ? '⚠ ' : member.roleIds.includes(slot.roleId) && c.length === 0 ? '✓ ' : ''}
                                {member.name}
                                {!member.roleIds.includes(slot.roleId) ? ' (outra função)' : ''}
                              </option>
                            ))}
                          </Select>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            aria-label="Sugerir disponível"
                            title="Sugerir alguém disponível"
                            onClick={() => {
                              const best = suggestions.find((s) => s.member.roleIds.includes(slot.roleId) && s.conflicts.length === 0);
                              if (best) setSlot(slot.id, { memberId: best.member.id });
                              else toast.info('Ninguém totalmente disponível para essa função neste horário.');
                            }}
                          >
                            <Sparkles className="h-4 w-4" />
                          </Button>
                          <Button type="button" size="icon" variant="ghost" aria-label="Remover função" onClick={() => setDraft((d) => ({ ...d, slots: d.slots.filter((s) => s.id !== slot.id) }))}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      {conflicts.length > 0 && (
                        <ul className="mt-2.5 space-y-1 border-t border-line/60 pt-2.5">
                          {conflicts.map((c, i) => (
                            <li key={i} className={cn('flex items-start gap-1.5 text-xs', c.severity === 'alerta' ? 'text-warn' : 'text-ink-muted')}>
                              {c.severity === 'alerta' ? <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" /> : <Info className="mt-px h-3.5 w-3.5 shrink-0" />}
                              {c.message}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          <div className="mt-3 flex gap-2">
            <Input value={newRole} onChange={(e) => setNewRole(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomRole(); } }} placeholder="Função personalizada (ex.: Drone)" className="h-10" />
            <Button type="button" size="sm" variant="outline" icon={Plus} onClick={addCustomRole} className="h-10 shrink-0">Criar</Button>
          </div>

          {hardConflicts.length > 0 && (
            <div className="mt-4 flex gap-2.5 rounded-2xl border border-warn/30 bg-warn/5 p-3 text-sm text-warn">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                {hardConflicts.length} alerta(s) de conflito. A escala pode ser salva, mas confirme com os integrantes antes.
              </span>
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
}
