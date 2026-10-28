import { formatDistanceToNow, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AlertTriangle, CalendarClock, Copy, History, MapPin, Pencil, Repeat, Trash2, UserRound } from 'lucide-react';
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { checkAssignment, coverage, isOpenSlot, scheduleStatus, suggestMembers } from '@/lib/domain';
import { useStore } from '@/lib/store';
import { capitalize, cn, fmtDateLong } from '@/lib/utils';
import { Avatar, Button, ConfirmDialog, Modal, ProgressRing, RoleIcon, Select } from '../ui';
import { ScheduleStatusBadge, SlotStatusBadge } from './parts';
import { useScheduleEditor } from './ScheduleEditor';
import { RespondButtons } from './RespondButtons';

const Ctx = createContext<{ open: (id: string) => void }>({ open: () => {} });
export const useScheduleDetail = () => useContext(Ctx);

export function ScheduleDetailProvider({ children }: { children: ReactNode }) {
  const [id, setId] = useState<string | null>(null);
  const open = useCallback((x: string) => setId(x), []);
  return (
    <Ctx.Provider value={{ open }}>
      {children}
      <ScheduleDetail id={id} onClose={() => setId(null)} onOpenOther={setId} />
    </Ctx.Provider>
  );
}

function ScheduleDetail({ id, onClose, onOpenOther }: { id: string | null; onClose: () => void; onOpenOther: (id: string) => void }) {
  const store = useStore();
  const editor = useScheduleEditor();
  const [confirmDel, setConfirmDel] = useState(false);
  const s = store.schedules.find((x) => x.id === id);
  const canManage = store.can('manage:schedules');
  if (!s) return <Modal open={false} onOpenChange={() => {}} title="">{null}</Modal>;

  const cov = coverage(s);
  const coord = store.members.find((m) => m.id === s.coordinatorId);
  const history = store.audit.filter((a) => a.entityId === s.id).slice(0, 8);
  const ctx = { schedules: store.schedules, members: store.members, roles: store.roles };

  return (
    <>
      <Modal
        open={!!id}
        onOpenChange={(o) => !o && onClose()}
        size="lg"
        title={s.title}
        description={`${s.eventType} · ${capitalize(fmtDateLong(s.date))}`}
        footer={
          canManage ? (
            <>
              <Button variant="danger" size="sm" icon={Trash2} onClick={() => setConfirmDel(true)}>Excluir</Button>
              <Button size="sm" icon={Copy} onClick={() => {
                const c = store.duplicateSchedule(s.id);
                if (c) { toast.success('Escala duplicada.', { description: 'As confirmações da cópia começam pendentes.' }); onOpenOther(c.id); }
              }}>Duplicar</Button>
              <Button size="sm" variant="primary" icon={Pencil} onClick={() => { onClose(); editor.open({ schedule: s }); }}>Editar</Button>
            </>
          ) : undefined
        }
      >
        <div className="grid gap-5 sm:grid-cols-[1fr_auto]">
          <div className="space-y-1.5 text-sm text-ink-muted">
            <p className="flex items-center gap-2"><CalendarClock className="h-4 w-4 text-neon" />{s.start} – {s.end}</p>
            <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-electric" />{s.location}</p>
            <p className="flex items-center gap-2"><UserRound className="h-4 w-4" />Responsável: <span className="text-ink">{coord?.name ?? '—'}</span></p>
            {s.notes && <p className="mt-3 rounded-2xl border border-line bg-surface/60 p-3 text-ink">{s.notes}</p>}
            <div className="pt-2"><ScheduleStatusBadge status={scheduleStatus(s)} /></div>
          </div>
          <div className="flex items-center gap-4 sm:flex-col sm:items-end">
            <ProgressRing value={cov.pct} size={84} stroke={7} />
            <div className="text-xs text-ink-muted sm:text-right">
              <p><span className="text-ink">{cov.filled}</span> de {cov.total} vagas preenchidas</p>
              <p><span className="text-neon">{cov.confirmed}</span> confirmadas</p>
            </div>
          </div>
        </div>

        <h3 className="label mt-6">Equipe escalada</h3>
        <ul className="space-y-2">
          {s.slots.map((sl) => {
            const r = store.roles.find((x) => x.id === sl.roleId);
            const m = store.members.find((x) => x.id === sl.memberId);
            const open = isOpenSlot(sl);
            const mine = sl.memberId === store.me.id;
            const conflicts = sl.memberId ? checkAssignment(s, sl.id, sl.memberId, ctx).filter((c) => c.severity === 'alerta') : [];
            return (
              <li key={sl.id} className={cn('rounded-2xl border p-3', open ? 'border-danger/30 bg-danger/[0.04]' : 'border-line bg-surface/50')}>
                <div className="flex flex-wrap items-center gap-3">
                  {r && <RoleIcon icon={r.icon} color={r.color} boxed />}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-ink-muted">{r?.name}</p>
                    <p className="flex items-center gap-2 truncate text-sm font-medium">
                      {m ? <><Avatar name={m.name} size={20} />{m.name}</> : <span className="text-danger">Precisa de voluntário</span>}
                    </p>
                  </div>
                  <SlotStatusBadge status={sl.status} open={!sl.memberId} />
                </div>
                {sl.note && <p className="mt-2 text-xs text-ink-muted">“{sl.note}”</p>}
                {conflicts.map((c, i) => (
                  <p key={i} className="mt-2 flex items-start gap-1.5 text-xs text-warn"><AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" />{c.message}</p>
                ))}
                {mine && <div className="mt-3"><RespondButtons scheduleId={s.id} slot={sl} /></div>}
                {canManage && (open || sl.status === 'pendente') && (
                  <div className="mt-3 flex items-center gap-2">
                    <Repeat className="h-4 w-4 shrink-0 text-ink-muted" />
                    <Select
                      aria-label={`Designar integrante para ${r?.name}`}
                      className="h-9 text-[13px]"
                      value=""
                      onChange={(e) => {
                        const v = e.target.value;
                        if (!v) return;
                        const memberId = v === '__none' ? null : v;
                        const warn = memberId ? checkAssignment(s, sl.id, memberId, ctx).filter((c) => c.severity === 'alerta') : [];
                        store.assign(s.id, sl.id, memberId);
                        if (warn.length) toast.warning('Designado com alerta', { description: warn[0].message });
                        else toast.success(memberId ? 'Integrante designado. Aguardando confirmação.' : 'Vaga liberada.');
                      }}
                    >
                      <option value="">{open ? 'Escolher substituto…' : 'Trocar responsável…'}</option>
                      {sl.memberId && <option value="__none">Liberar vaga</option>}
                      {suggestMembers(s, sl.id, ctx)
                        .filter((x) => x.member.id !== sl.memberId && x.member.roleIds.includes(sl.roleId))
                        .map(({ member, conflicts: c }) => (
                          <option key={member.id} value={member.id}>
                            {c.some((x) => x.severity === 'alerta') ? '⚠ ' : c.length === 0 ? '✓ ' : ''}{member.name}
                          </option>
                        ))}
                    </Select>
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        <h3 className="label mt-6 flex items-center gap-1.5"><History className="h-3.5 w-3.5" />Histórico de alterações</h3>
        {history.length === 0 ? (
          <p className="text-sm text-ink-muted">Nenhuma alteração registrada nesta sessão.</p>
        ) : (
          <ol className="space-y-2 border-l border-line pl-4">
            {history.map((h) => (
              <li key={h.id} className="relative text-sm">
                <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-neon" />
                <span className="text-ink">{h.summary}</span>
                <span className="block text-xs text-ink-muted">{h.actor} · {formatDistanceToNow(parseISO(h.at), { locale: ptBR, addSuffix: true })}</span>
              </li>
            ))}
          </ol>
        )}
      </Modal>
      <ConfirmDialog
        open={confirmDel}
        onOpenChange={setConfirmDel}
        title="Excluir escala?"
        body={`“${s.title}” e todas as designações serão removidas. Essa ação não pode ser desfeita.`}
        onConfirm={() => { store.deleteSchedule(s.id); onClose(); toast.success('Escala excluída.'); }}
      />
    </>
  );
}

