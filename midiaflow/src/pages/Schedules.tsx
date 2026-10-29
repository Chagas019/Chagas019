import { Copy, LayoutGrid, List, MoreHorizontal, Pencil, Plus, Search, SlidersHorizontal, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ScheduleCard, ScheduleStatusBadge } from '@/components/schedule/parts';
import { useScheduleDetail } from '@/components/schedule/ScheduleDetail';
import { EVENT_TYPES, useScheduleEditor } from '@/components/schedule/ScheduleEditor';
import { Avatar, Bar, Button, Card, ConfirmDialog, EmptyState, Input, PageHeader, Segmented, Select } from '@/components/ui';
import { coverage, isOpenSlot, scheduleStatus } from '@/lib/domain';
import { useStore } from '@/lib/store';
import type { Schedule, ScheduleStatus } from '@/lib/types';
import { capitalize, cn, fmt, toISODate } from '@/lib/utils';

type When = 'futuras' | 'passadas' | 'todas';

export default function Schedules() {
  const store = useStore();
  const { schedules, roles, members, can } = store;
  const editor = useScheduleEditor();
  const detail = useScheduleDetail();
  const [params, setParams] = useSearchParams();
  const [view, setView] = useState<'cards' | 'tabela'>(() => (typeof window !== 'undefined' && window.innerWidth < 1024 ? 'cards' : 'tabela'));
  const [showFilters, setShowFilters] = useState(false);
  const [toDelete, setToDelete] = useState<Schedule | null>(null);
  const [menu, setMenu] = useState<string | null>(null);

  const q = params.get('q') ?? '';
  const status = (params.get('status') ?? '') as ScheduleStatus | '';
  const type = params.get('tipo') ?? '';
  const role = params.get('funcao') ?? '';
  const when = (params.get('quando') ?? 'futuras') as When;
  const from = params.get('de') ?? '';
  const to = params.get('ate') ?? '';
  const setParam = (k: string, v: string) => {
    const p = new URLSearchParams(params);
    if (v) p.set(k, v); else p.delete(k);
    setParams(p, { replace: true });
  };
  const today = toISODate(new Date());

  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return schedules
      .filter((s) => (when === 'futuras' ? s.date >= today : when === 'passadas' ? s.date < today : true))
      .filter((s) => !from || s.date >= from)
      .filter((s) => !to || s.date <= to)
      .filter((s) => !type || s.eventType === type)
      .filter((s) => !role || s.slots.some((x) => x.roleId === role))
      .filter((s) => !status || scheduleStatus(s) === status)
      .filter((s) => !t || s.title.toLowerCase().includes(t) || s.location.toLowerCase().includes(t) || s.slots.some((x) => members.find((m) => m.id === x.memberId)?.name.toLowerCase().includes(t)))
      .sort((a, b) => (when === 'passadas' ? -1 : 1) * (a.date + a.start).localeCompare(b.date + b.start));
  }, [schedules, q, status, type, role, when, from, to, today, members]);

  const activeFilters = [status, type, role, from, to].filter(Boolean).length;
  const openCount = list.reduce((a, s) => a + coverage(s).open, 0);

  return (
    <div>
      <PageHeader
        title="Escalas"
        subtitle={`${list.length} escala(s) · ${openCount} vaga(s) em aberto`}
        actions={can('manage:schedules') && <Button variant="primary" icon={Plus} onClick={() => editor.open()}>Criar escala</Button>}
      />

      <Card className="mb-5 p-3 sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
            <Input value={q} onChange={(e) => setParam('q', e.target.value)} placeholder="Pesquisar por celebração, local ou integrante" className="pl-10" aria-label="Pesquisar escalas" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Segmented value={when} onChange={(v) => setParam('quando', v === 'futuras' ? '' : v)} options={[{ value: 'futuras', label: 'Futuras' }, { value: 'passadas', label: 'Passadas' }, { value: 'todas', label: 'Todas' }]} />
            <Button size="sm" variant={activeFilters ? 'outline' : 'secondary'} icon={SlidersHorizontal} className="h-10" onClick={() => setShowFilters((s) => !s)} aria-expanded={showFilters}>
              Filtros{activeFilters ? ` (${activeFilters})` : ''}
            </Button>
            <Segmented value={view} onChange={setView} options={[{ value: 'tabela', label: 'Tabela', icon: List }, { value: 'cards', label: 'Cards', icon: LayoutGrid }]} />
          </div>
        </div>
        {showFilters && (
          <div className="mt-3 grid gap-3 border-t border-line/60 pt-3 sm:grid-cols-2 lg:grid-cols-5">
            <Select aria-label="Status" value={status} onChange={(e) => setParam('status', e.target.value)}>
              <option value="">Todos os status</option>
              <option value="completa">Escala completa</option>
              <option value="aguardando">Aguardando confirmação</option>
              <option value="precisa">Precisa de voluntário</option>
            </Select>
            <Select aria-label="Tipo de evento" value={type} onChange={(e) => setParam('tipo', e.target.value)}>
              <option value="">Todos os eventos</option>
              {EVENT_TYPES.map((t) => <option key={t}>{t}</option>)}
            </Select>
            <Select aria-label="Função" value={role} onChange={(e) => setParam('funcao', e.target.value)}>
              <option value="">Todas as funções</option>
              {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </Select>
            <Input type="date" aria-label="De" value={from} onChange={(e) => setParam('de', e.target.value)} />
            <Input type="date" aria-label="Até" value={to} onChange={(e) => setParam('ate', e.target.value)} />
            {activeFilters > 0 && (
              <button className="text-left text-xs text-neon hover:underline" onClick={() => { const p = new URLSearchParams(); if (q) p.set('q', q); setParams(p); }}>Limpar filtros</button>
            )}
          </div>
        )}
      </Card>

      {list.length === 0 ? (
        <EmptyState
          icon={Search}
          title="Nenhuma escala encontrada"
          body="Ajuste a busca ou os filtros. Você também pode criar uma nova escala."
          action={can('manage:schedules') && <Button variant="primary" icon={Plus} onClick={() => editor.open()}>Criar escala</Button>}
        />
      ) : view === 'cards' ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((s, i) => <ScheduleCard key={s.id} s={s} index={i} onClick={() => detail.open(s.id)} />)}
        </div>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b border-line/60 text-left text-xs uppercase tracking-wider text-ink-muted">
                <th className="px-5 py-3.5 font-medium">Celebração</th>
                <th className="px-3 py-3.5 font-medium">Data</th>
                <th className="px-3 py-3.5 font-medium">Equipe</th>
                <th className="px-3 py-3.5 font-medium">Vagas</th>
                <th className="px-3 py-3.5 font-medium">Status</th>
                <th className="px-5 py-3.5" />
              </tr>
            </thead>
            <tbody>
              {list.map((s) => {
                const c = coverage(s);
                return (
                  <tr key={s.id} className="group border-b border-line/40 transition-colors last:border-0 hover:bg-white/[0.02]">
                    <td className="cursor-pointer px-5 py-3.5" onClick={() => detail.open(s.id)}>
                      <p className="font-medium group-hover:text-neon">{s.title}</p>
                      <p className="text-xs text-ink-muted">{s.eventType} · {s.location}</p>
                    </td>
                    <td className="px-3 py-3.5">
                      <p>{capitalize(fmt(s.date, 'EEE, dd/MM'))}</p>
                      <p className="text-xs text-ink-muted">{s.start}–{s.end}</p>
                    </td>
                    <td className="px-3 py-3.5">
                      <div className="flex -space-x-2">
                        {s.slots.filter((x) => !isOpenSlot(x)).slice(0, 5).map((x) => {
                          const m = members.find((mm) => mm.id === x.memberId);
                          return m ? <Avatar key={x.id} name={m.name} size={28} ring /> : null;
                        })}
                        {s.slots.filter((x) => !isOpenSlot(x)).length > 5 && <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface text-[10px] ring-2 ring-bg">+{s.slots.filter((x) => !isOpenSlot(x)).length - 5}</span>}
                      </div>
                    </td>
                    <td className="w-40 px-3 py-3.5">
                      <div className="flex items-center gap-2">
                        <Bar value={c.pct} />
                        <span className={cn('text-xs', c.open ? 'text-danger' : 'text-ink-muted')}>{c.filled}/{c.total}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3.5"><ScheduleStatusBadge status={scheduleStatus(s)} /></td>
                    <td className="relative px-5 py-3.5 text-right">
                      {can('manage:schedules') && (
                        <>
                          <Button size="icon" variant="ghost" aria-label={`Ações de ${s.title}`} className="h-9 w-9" onClick={() => setMenu(menu === s.id ? null : s.id)}><MoreHorizontal className="h-4 w-4" /></Button>
                          {menu === s.id && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setMenu(null)} />
                              <div className="absolute right-5 top-12 z-20 w-44 rounded-2xl border border-line bg-card p-1.5 text-left shadow-2xl">
                                <MenuItem icon={Pencil} onClick={() => { setMenu(null); editor.open({ schedule: s }); }}>Editar</MenuItem>
                                <MenuItem icon={Copy} onClick={() => { setMenu(null); store.duplicateSchedule(s.id); toast.success('Escala duplicada.'); }}>Duplicar</MenuItem>
                                <MenuItem icon={Trash2} danger onClick={() => { setMenu(null); setToDelete(s); }}>Excluir</MenuItem>
                              </div>
                            </>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Excluir escala?"
        body={`“${toDelete?.title}” e todas as designações serão removidas. Essa ação não pode ser desfeita.`}
        onConfirm={() => { if (toDelete) { store.deleteSchedule(toDelete.id); toast.success('Escala excluída.'); } }}
      />
    </div>
  );
}

function MenuItem({ icon: Icon, children, onClick, danger }: { icon: typeof Pencil; children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick} className={cn('flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm hover:bg-white/5', danger && 'text-danger')}>
      <Icon className="h-4 w-4" />{children}
    </button>
  );
}
