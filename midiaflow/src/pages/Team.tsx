import { CalendarSearch, Lock, Mail, Pencil, Phone, Plus, Search, Send, UserPlus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useScheduleDetail } from '@/components/schedule/ScheduleDetail';
import { Avatar, Badge, Button, Card, EmptyState, Field, Input, Modal, PageHeader, RoleIcon, Select } from '@/components/ui';
import { isOpenSlot } from '@/lib/domain';
import { getInviteCode } from '@/lib/remote';
import { ACCESS_LABEL, useStore } from '@/lib/store';
import type { AccessLevel, Member, Period } from '@/lib/types';
import { capitalize, cn, fmt, overlaps, PERIOD_LABEL, periodOf, timeToMin, toISODate, uid, WEEKDAYS } from '@/lib/utils';
import { parseISO } from 'date-fns';

const STATUS_TONE = { ativo: 'neon', inativo: 'muted', convidado: 'electric' } as const;

export default function Team() {
  const store = useStore();
  const { members, roles, schedules, can } = store;
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get('q') ?? '');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('ativo');
  const [availDate, setAvailDate] = useState('');
  const [availTime, setAvailTime] = useState('19:00');
  const [editing, setEditing] = useState<Member | null>(null);
  const [viewing, setViewing] = useState<Member | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const today = toISODate(new Date());

  // Considera uma janela de 1h a partir do horário consultado.
  const busyAt = (m: Member, date: string, time: string) => {
    const end = Math.min(timeToMin(time) + 60, 23 * 60 + 59);
    const endStr = `${String(Math.floor(end / 60)).padStart(2, '0')}:${String(end % 60).padStart(2, '0')}`;
    return schedules.some((s) => s.date === date && overlaps(s.start, s.end, time, endStr) && s.slots.some((x) => x.memberId === m.id && x.status !== 'recusado'));
  };
  const isAvailable = (m: Member, date: string, time: string) => {
    const wd = parseISO(date).getDay();
    return m.availability.weekdays.includes(wd) && m.availability.periods.includes(periodOf(time)) && !m.availability.unavailableDates.includes(date) && !busyAt(m, date, time);
  };

  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return members
      .filter((m) => m.access !== 'admin')
      .filter((m) => !t || m.name.toLowerCase().includes(t))
      .filter((m) => !role || m.roleIds.includes(role))
      .filter((m) => !status || m.status === status)
      .filter((m) => !availDate || isAvailable(m, availDate, availTime))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [members, q, role, status, availDate, availTime, schedules]);

  const upcomingCount = (id: string) => schedules.filter((s) => s.date >= today && s.slots.some((x) => x.memberId === id && !isOpenSlot(x))).length;
  const pastCount = (id: string) => schedules.filter((s) => s.date < today && s.slots.some((x) => x.memberId === id && x.status === 'confirmado')).length;

  if (!can('manage:team')) {
    return <EmptyState icon={Lock} title="Acesso restrito" body="A área da equipe é visível apenas para coordenadores e administradores, para proteger os dados pessoais dos integrantes." />;
  }

  return (
    <div>
      <PageHeader
        title="Equipe"
        subtitle={`${members.filter((m) => m.status === 'ativo' && m.access !== 'admin').length} integrantes ativos na PASCOM`}
        actions={<>
          <Button icon={Send} onClick={() => setInviteOpen(true)}>Convidar</Button>
          <Button variant="primary" icon={UserPlus} onClick={() => setEditing(newMember())}>Cadastrar integrante</Button>
        </>}
      />

      <Card className="mb-5 space-y-3 p-3 sm:p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
            <Input value={q} onChange={(e) => { setQ(e.target.value); setParams(e.target.value ? { q: e.target.value } : {}, { replace: true }); }} placeholder="Pesquisar por nome" className="pl-10" aria-label="Pesquisar integrantes" />
          </div>
          <Select aria-label="Função" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="">Todas as funções</option>
            {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </Select>
          <Select aria-label="Situação" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Todas as situações</option>
            <option value="ativo">Ativos</option>
            <option value="convidado">Convidados</option>
            <option value="inativo">Inativos</option>
          </Select>
        </div>
        <div className="flex flex-col gap-2 rounded-2xl border border-line/60 bg-surface/40 p-3 sm:flex-row sm:items-center">
          <span className="flex items-center gap-2 text-sm font-medium"><CalendarSearch className="h-4 w-4 text-neon" />Quem está disponível?</span>
          <div className="flex flex-1 gap-2">
            <Input type="date" aria-label="Data" value={availDate} onChange={(e) => setAvailDate(e.target.value)} className="h-10" />
            <Input type="time" aria-label="Horário" value={availTime} onChange={(e) => setAvailTime(e.target.value)} className="h-10 w-32" />
            {availDate && <Button size="sm" variant="ghost" className="h-10" onClick={() => setAvailDate('')}>Limpar</Button>}
          </div>
        </div>
      </Card>

      {list.length === 0 ? (
        members.filter((m) => m.access !== 'admin').length === 0 ? (
          <EmptyState icon={UserPlus} title="Cadastre a sua equipe" body="Adicione fotógrafos, videomakers, stories, social media e quem mais serve na PASCOM. Depois é só escalar."
            action={<Button variant="primary" icon={UserPlus} onClick={() => setEditing(newMember())}>Cadastrar integrante</Button>} />
        ) : (
          <EmptyState icon={Search} title="Ninguém encontrado" body={availDate ? 'Nenhum integrante disponível nesse dia e horário com os filtros atuais.' : 'Ajuste os filtros ou cadastre um novo integrante.'} />
        )
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((m) => (
            <Card key={m.id} hover className="cursor-pointer p-4" onClick={() => setViewing(m)}>
              <div className="flex items-start gap-3">
                <Avatar name={m.name} photo={m.photo} size={46} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{m.name}</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <Badge tone={STATUS_TONE[m.status]}>{capitalize(m.status)}</Badge>
                    {m.access === 'coordenador' && <Badge tone="electric">Coordenador</Badge>}
                    {availDate && <Badge tone="neon" dot>Disponível</Badge>}
                  </div>
                </div>
                <Button size="icon" variant="ghost" className="h-9 w-9" aria-label={`Editar ${m.name}`} onClick={(e) => { e.stopPropagation(); setEditing(m); }}><Pencil className="h-4 w-4" /></Button>
              </div>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {m.roleIds.map((rid) => {
                  const r = roles.find((x) => x.id === rid);
                  return r ? <span key={rid} className="inline-flex items-center gap-1.5 rounded-full border border-line px-2 py-0.5 text-[11px]"><RoleIcon icon={r.icon} color={r.color} size={12} />{r.name}</span> : null;
                })}
              </div>
              <div className="mt-4 flex justify-between border-t border-line/60 pt-3 text-xs text-ink-muted">
                <span>{m.availability.weekdays.map((d) => WEEKDAYS[d]).join(', ') || 'Sem disponibilidade'}</span>
                <span><span className="text-ink">{upcomingCount(m.id)}</span> futuras · <span className="text-ink">{pastCount(m.id)}</span> realizadas</span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {editing && <MemberEditor member={editing} onClose={() => setEditing(null)} />}
      {viewing && <MemberProfile member={members.find((m) => m.id === viewing.id) ?? viewing} onClose={() => setViewing(null)} onEdit={() => { setEditing(viewing); setViewing(null); }} />}
      <InviteModal open={inviteOpen} onOpenChange={setInviteOpen} />
    </div>
  );
}

const newMember = (): Member => ({
  id: uid('m'),
  name: '',
  roleIds: [],
  availability: { weekdays: [0, 6], periods: ['manha', 'noite'], unavailableDates: [] },
  email: '',
  phone: '',
  status: 'ativo',
  access: 'integrante',
  joinedAt: toISODate(new Date()),
});

function MemberEditor({ member, onClose }: { member: Member; onClose: () => void }) {
  const store = useStore();
  const isNew = !store.members.some((m) => m.id === member.id);
  const [m, setM] = useState<Member>(structuredClone(member));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [newDate, setNewDate] = useState('');
  const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const save = () => {
    const e: Record<string, string> = {};
    if (m.name.trim().length < 3) e.name = 'Informe o nome completo.';
    if (m.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(m.email)) e.email = 'E-mail inválido.';
    if (m.phone && m.phone.replace(/\D/g, '').length < 10) e.phone = 'Telefone com DDD.';
    if (m.roleIds.length === 0) e.roles = 'Escolha ao menos uma função.';
    if (m.photo && !/^https:\/\//.test(m.photo)) e.photo = 'Use um link https.';
    setErrors(e);
    if (Object.keys(e).length) return toast.error('Revise os campos destacados.');
    store.saveMember({ ...m, name: m.name.trim(), email: m.email.trim() });
    toast.success(isNew ? 'Integrante cadastrado!' : 'Dados atualizados.');
    onClose();
  };

  return (
    <Modal open onOpenChange={(o) => !o && onClose()} title={isNew ? 'Cadastrar integrante' : `Editar ${member.name}`} size="lg"
      footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button variant="primary" onClick={save}>Salvar</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome" error={errors.name} className="sm:col-span-2"><Input autoFocus value={m.name} invalid={!!errors.name} onChange={(e) => setM({ ...m, name: e.target.value })} /></Field>
        <Field label="E-mail" error={errors.email} hint="Visível só para coordenação"><Input type="email" value={m.email} invalid={!!errors.email} onChange={(e) => setM({ ...m, email: e.target.value })} /></Field>
        <Field label="Telefone / WhatsApp" error={errors.phone}><Input inputMode="tel" value={m.phone} invalid={!!errors.phone} onChange={(e) => setM({ ...m, phone: e.target.value })} placeholder="(11) 90000-0000" /></Field>
        <Field label="Foto (opcional)" error={errors.photo} hint="Link https de uma imagem"><Input value={m.photo ?? ''} onChange={(e) => setM({ ...m, photo: e.target.value || undefined })} placeholder="https://…" /></Field>
        <Field label="Situação">
          <Select value={m.status} onChange={(e) => setM({ ...m, status: e.target.value as Member['status'] })}>
            <option value="ativo">Ativo</option><option value="convidado">Convidado</option><option value="inativo">Inativo</option>
          </Select>
        </Field>
        {store.can('manage:users') && (
          <Field label="Nível de acesso" hint="Somente administradores alteram">
            <Select value={m.access} onChange={(e) => setM({ ...m, access: e.target.value as AccessLevel })}>
              {(['integrante', 'coordenador', 'admin'] as AccessLevel[]).map((a) => <option key={a} value={a}>{ACCESS_LABEL[a]}</option>)}
            </Select>
          </Field>
        )}
      </div>

      <p className="label mt-6">Funções que pode exercer</p>
      {errors.roles && <p role="alert" className="mb-2 text-xs text-danger">{errors.roles}</p>}
      <div className="flex flex-wrap gap-2">
        {store.roles.map((r) => {
          const on = m.roleIds.includes(r.id);
          return (
            <button key={r.id} type="button" aria-pressed={on} onClick={() => setM({ ...m, roleIds: toggle(m.roleIds, r.id) })}
              className={cn('inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-all', on ? 'border-neon/50 bg-neon/10 text-ink' : 'border-line text-ink-muted hover:text-ink')}>
              <RoleIcon icon={r.icon} color={r.color} size={13} />{r.name}
            </button>
          );
        })}
      </div>

      <p className="label mt-6">Disponibilidade</p>
      <div className="flex flex-wrap gap-1.5">
        {WEEKDAYS.map((d, i) => {
          const on = m.availability.weekdays.includes(i);
          return (
            <button key={d} type="button" aria-pressed={on} onClick={() => setM({ ...m, availability: { ...m.availability, weekdays: toggle(m.availability.weekdays, i) } })}
              className={cn('h-10 w-12 rounded-xl border text-sm transition-colors', on ? 'border-neon/50 bg-neon/10 text-neon' : 'border-line text-ink-muted')}>{d}</button>
          );
        })}
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {(Object.keys(PERIOD_LABEL) as Period[]).map((p) => {
          const on = m.availability.periods.includes(p);
          return (
            <button key={p} type="button" aria-pressed={on} onClick={() => setM({ ...m, availability: { ...m.availability, periods: toggle(m.availability.periods, p) } })}
              className={cn('h-9 rounded-full border px-4 text-sm transition-colors', on ? 'border-electric/50 bg-electric/10 text-electric' : 'border-line text-ink-muted')}>{PERIOD_LABEL[p]}</button>
          );
        })}
      </div>
      <div className="mt-3 flex gap-2">
        <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} aria-label="Data indisponível" className="h-10" />
        <Button type="button" size="sm" variant="outline" icon={Plus} className="h-10 shrink-0" onClick={() => {
          if (newDate && !m.availability.unavailableDates.includes(newDate)) setM({ ...m, availability: { ...m.availability, unavailableDates: [...m.availability.unavailableDates, newDate].sort() } });
          setNewDate('');
        }}>Indisponível</Button>
      </div>
      {m.availability.unavailableDates.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {m.availability.unavailableDates.map((d) => (
            <button key={d} type="button" onClick={() => setM({ ...m, availability: { ...m.availability, unavailableDates: m.availability.unavailableDates.filter((x) => x !== d) } })}
              className="rounded-full border border-danger/30 bg-danger/5 px-2.5 py-1 text-xs text-danger" title="Remover">{fmt(d, 'dd/MM/yyyy')} ×</button>
          ))}
        </div>
      )}
    </Modal>
  );
}

function MemberProfile({ member, onClose, onEdit }: { member: Member; onClose: () => void; onEdit: () => void }) {
  const { schedules, roles, can } = useStore();
  const detail = useScheduleDetail();
  const today = toISODate(new Date());
  const mine = schedules
    .flatMap((s) => s.slots.filter((x) => x.memberId === member.id).map((sl) => ({ s, sl })))
    .sort((a, b) => a.s.date.localeCompare(b.s.date));
  const future = mine.filter((x) => x.s.date >= today);
  const past = mine.filter((x) => x.s.date < today).reverse();
  const Row = ({ s, sl }: (typeof mine)[number]) => (
    <button onClick={() => { onClose(); detail.open(s.id); }} className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm hover:bg-white/5">
      <span className="min-w-0"><span className="block truncate">{s.title}</span><span className="text-xs text-ink-muted">{fmt(s.date, 'dd/MM')} · {roles.find((r) => r.id === sl.roleId)?.name}</span></span>
      <Badge tone={sl.status === 'confirmado' ? 'neon' : sl.status === 'pendente' ? 'warn' : 'danger'}>{sl.status === 'confirmado' ? 'Confirmado' : sl.status === 'pendente' ? 'Pendente' : sl.status === 'recusado' ? 'Recusou' : 'Substituição'}</Badge>
    </button>
  );
  return (
    <Modal open onOpenChange={(o) => !o && onClose()} title={member.name} description={`Na equipe desde ${fmt(member.joinedAt, 'MMMM yyyy')}`} size="md"
      footer={<Button icon={Pencil} onClick={onEdit}>Editar</Button>}>
      <div className="flex items-center gap-4">
        <Avatar name={member.name} photo={member.photo} size={64} />
        <div className="space-y-1 text-sm">
          {can('view:contacts') ? (
            <>
              <p className="flex items-center gap-2 text-ink-muted"><Mail className="h-4 w-4" />{member.email || '—'}</p>
              <p className="flex items-center gap-2 text-ink-muted"><Phone className="h-4 w-4" />{member.phone || '—'}</p>
            </>
          ) : <p className="flex items-center gap-2 text-ink-muted"><Lock className="h-4 w-4" />Contato protegido</p>}
        </div>
      </div>
      <p className="label mt-6">Escalas futuras ({future.length})</p>
      {future.length ? <div className="-mx-3">{future.map((x) => <Row key={x.sl.id} {...x} />)}</div> : <p className="text-sm text-ink-muted">Nenhuma escala futura.</p>}
      <p className="label mt-6">Histórico de participações ({past.length})</p>
      {past.length ? <div className="-mx-3 max-h-56 overflow-y-auto">{past.map((x) => <Row key={x.sl.id} {...x} />)}</div> : <p className="text-sm text-ink-muted">Sem participações registradas.</p>}
    </Modal>
  );
}

function InviteModal({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const store = useStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [err, setErr] = useState('');
  const submit = async () => {
    if (name.trim().length < 3) return setErr('Informe o nome.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setErr('Informe um e-mail válido.');
    store.saveMember({ ...newMember(), name: name.trim(), email: email.trim(), status: 'convidado' });
    let link = '';
    if (store.mode === 'remote') {
      try {
        link = ` Crie sua conta com este e-mail (${email.trim()}) pelo link: ${location.origin}/?convite=${await getInviteCode()}`;
      } catch (e) {
        toast.error((e as Error).message);
      }
    }
    const text = `Olá, ${name.split(' ')[0]}! Você foi convidado(a) para a ${store.parish.pascomName} no MídiaFlow.${link}`;
    navigator.clipboard?.writeText(text).catch(() => {});
    toast.success('Convite registrado', {
      description: store.mode === 'remote'
        ? 'Mensagem com o link copiada: cole no WhatsApp ou no e-mail da pessoa. Ao criar a conta com esse e-mail, ela já entra vinculada.'
        : 'Texto do convite copiado. O envio automático por e-mail depende da integração (ver README).',
    });
    setName(''); setEmail(''); setErr(''); onOpenChange(false);
  };
  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Convidar para a equipe" size="sm" description="A pessoa entra como “convidado” até aceitar."
      footer={<><Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button><Button variant="primary" icon={Send} onClick={submit}>Registrar convite</Button></>}>
      <div className="space-y-4">
        <Field label="Nome"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="E-mail" error={err}><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
      </div>
    </Modal>
  );
}
