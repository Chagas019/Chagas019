import {
  closestCorners, DndContext, DragOverlay, KeyboardSensor, PointerSensor, TouchSensor, useDroppable, useSensor, useSensors,
  type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import { ArrowDown, ArrowUp, CalendarClock, CheckSquare, Columns3, Lock, Plus, Trash2, UserRound } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Avatar, Button, ConfirmDialog, EmptyState, Field, Input, Modal, PageHeader, Select, Textarea } from '@/components/ui';
import { useStore } from '@/lib/store';
import type { BoardCard, BoardColumn } from '@/lib/types';
import { cn, fmt, toISODate, uid } from '@/lib/utils';

const newCard = (columnId: string): BoardCard => ({
  id: uid('bc'), columnId, title: '', description: '', assigneeIds: [], labelIds: [], checklist: [], createdAt: new Date().toISOString(),
});

function dueTone(due?: string) {
  if (!due) return null;
  const d = differenceInCalendarDays(parseISO(due), new Date());
  if (d < 0) return { text: `Atrasada · ${fmt(due, 'dd/MM')}`, cls: 'border-danger/40 bg-danger/10 text-danger' };
  if (d === 0) return { text: 'Hoje', cls: 'border-warn/40 bg-warn/10 text-warn' };
  if (d === 1) return { text: 'Amanhã', cls: 'border-warn/40 bg-warn/10 text-warn' };
  return { text: fmt(due, 'dd/MM'), cls: 'border-white/10 bg-white/[0.04] text-ink-muted' };
}

export default function BoardPage() {
  const store = useStore();
  const { board, me, can } = store;
  const staff = can('manage:board');
  const [onlyMine, setOnlyMine] = useState(!staff);
  const [editing, setEditing] = useState<BoardCard | null>(null);
  const [cols, setCols] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const visible = useMemo(() => (onlyMine ? board.cards.filter((c) => c.assigneeIds.includes(me.id)) : board.cards), [board.cards, onlyMine, me.id]);
  const mineOpen = board.cards.filter((c) => c.assigneeIds.includes(me.id) && c.columnId !== board.columns[board.columns.length - 1]?.id).length;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates, keyboardCodes: { start: ['Space'], cancel: ['Escape'], end: ['Space'] } }),
  );

  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));
  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const card = board.cards.find((c) => c.id === active.id);
    if (!card) return;
    const overCard = board.cards.find((c) => c.id === over.id);
    const columnId = overCard ? overCard.columnId : String(over.id).replace(/^drop:/, '');
    if (!board.columns.some((c) => c.id === columnId)) return;
    if (overCard?.id === card.id) return;
    // posição entre todos os cartões da coluna (vale também com o filtro "só as minhas")
    const inCol = board.cards.filter((c) => c.columnId === columnId && c.id !== card.id);
    let index = overCard ? inCol.indexOf(overCard) : inCol.length;
    if (overCard && card.columnId === columnId) {
      const all = board.cards.filter((c) => c.columnId === columnId);
      if (all.indexOf(card) < all.indexOf(overCard)) index += 1; // descendo: entra depois do cartão de destino
    }
    store.moveCard(card.id, columnId, index);
  };

  const active = activeId ? board.cards.find((c) => c.id === activeId) : null;

  return (
    <div className="min-w-0 space-y-5">
      <PageHeader title="Quadro de tarefas" subtitle={staff ? 'Artes, fotos, vídeos e posts da PASCOM. Arraste os cartões entre as colunas.' : `Você tem ${mineOpen} ${mineOpen === 1 ? 'tarefa aberta' : 'tarefas abertas'}. Arraste o seu cartão quando avançar.`}
        actions={<>
          <Button size="sm" variant={onlyMine ? 'outline' : 'secondary'} icon={UserRound} aria-pressed={onlyMine} onClick={() => setOnlyMine((v) => !v)}>Só as minhas</Button>
          {staff && <Button size="sm" icon={Columns3} onClick={() => setCols(true)}>Colunas</Button>}
          {staff && <Button variant="primary" icon={Plus} onClick={() => setEditing(newCard(board.columns[0].id))}>Nova tarefa</Button>}
        </>} />

      {board.cards.length === 0 ? (
        <EmptyState icon={CheckSquare} title="Nenhuma tarefa ainda"
          body={staff ? 'Crie cartões para as artes, edições, posts e transmissões. Cada servo vê e move os cartões dele.' : 'Quando a coordenação passar uma tarefa para você, ela aparece aqui.'}
          action={staff && <Button variant="primary" icon={Plus} onClick={() => setEditing(newCard(board.columns[0].id))}>Criar a primeira tarefa</Button>} />
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setActiveId(null)}>
          <div className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-4 sm:mx-0 sm:scroll-px-0 sm:px-0 lg:snap-none" role="list" aria-label="Colunas do quadro">
            {board.columns.map((col) => (
              <Column key={col.id} col={col} cards={visible.filter((c) => c.columnId === col.id)} staff={staff}
                onAdd={() => setEditing(newCard(col.id))} onOpen={setEditing} />
            ))}
          </div>
          <DragOverlay>{active ? <CardView card={active} dragging /> : null}</DragOverlay>
        </DndContext>
      )}

      {editing && <CardEditor card={board.cards.find((c) => c.id === editing.id) ?? editing} onClose={() => setEditing(null)} />}
      {cols && <ColumnsEditor onClose={() => setCols(false)} />}
    </div>
  );
}

function Column({ col, cards, staff, onAdd, onOpen }: { col: BoardColumn; cards: BoardCard[]; staff: boolean; onAdd: () => void; onOpen: (c: BoardCard) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: `drop:${col.id}` });
  return (
    <section role="listitem" aria-label={col.title} className={cn('card flex w-[82vw] max-w-[320px] shrink-0 snap-start flex-col p-3 sm:w-72 xl:w-auto xl:max-w-none xl:min-w-[240px] xl:flex-1', isOver && 'ring-1 ring-neon/40')}>
      <header className="mb-2 flex items-center justify-between gap-2 px-1">
        <h2 className="truncate text-sm font-semibold">{col.title} <span className="ml-1 text-xs font-normal text-ink-muted">{cards.length}</span></h2>
        {staff && <button onClick={onAdd} aria-label={`Nova tarefa em ${col.title}`} className="rounded-full p-1.5 text-ink-muted hover:bg-white/5 hover:text-neon"><Plus className="h-4 w-4" /></button>}
      </header>
      <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
        <ul ref={setNodeRef} className="flex min-h-[64px] flex-1 flex-col gap-2">
          {cards.map((c) => <SortableCard key={c.id} card={c} onOpen={() => onOpen(c)} />)}
          {cards.length === 0 && <li className="rounded-2xl border border-dashed border-white/10 px-3 py-5 text-center text-xs text-ink-muted">Solte um cartão aqui</li>}
        </ul>
      </SortableContext>
    </section>
  );
}

function SortableCard({ card, onOpen }: { card: BoardCard; onOpen: () => void }) {
  const { canWorkOn } = useStore();
  const can = canWorkOn(card);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id, disabled: !can });
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={cn(isDragging && 'opacity-30')}>
      <CardView card={card} onOpen={onOpen} handle={can ? { ...attributes, ...listeners } : undefined} />
    </li>
  );
}

function CardView({ card, onOpen, handle, dragging }: { card: BoardCard; onOpen?: () => void; handle?: Record<string, unknown>; dragging?: boolean }) {
  const { board, members, canWorkOn } = useStore();
  const labels = card.labelIds.map((id) => board.labels.find((l) => l.id === id)).filter(Boolean) as typeof board.labels;
  const people = card.assigneeIds.map((id) => members.find((m) => m.id === id)).filter(Boolean) as typeof members;
  const done = card.checklist.filter((k) => k.done).length;
  const due = dueTone(card.due);
  return (
    <div
      {...handle}
      role="button"
      tabIndex={0}
      aria-label={`${card.title}${handle ? ' (arraste ou use espaço e as setas para mover)' : ''}`}
      onClick={onOpen}
      onKeyDown={(e) => {
        (handle?.onKeyDown as ((ev: React.KeyboardEvent) => void) | undefined)?.(e);
        if (e.key === 'Enter') onOpen?.();
      }}
      className={cn(
        'group cursor-pointer touch-manipulation select-none rounded-2xl border border-white/[0.07] bg-white/[0.04] p-3 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition-colors hover:border-white/15 hover:bg-white/[0.06]',
        dragging && 'rotate-2 cursor-grabbing border-neon/40 bg-card shadow-glow',
      )}
    >
      {labels.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {labels.map((l) => <span key={l.id} className="rounded-full px-2 py-0.5 text-[10.5px] font-medium" style={{ background: `${l.color}22`, color: l.color }}>{l.name}</span>)}
        </div>
      )}
      <p className="break-words text-[14px] leading-snug">{card.title}</p>
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[11px]">
        {due && <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5', due.cls)}><CalendarClock className="h-3 w-3" />{due.text}</span>}
        {card.checklist.length > 0 && (
          <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5', done === card.checklist.length ? 'border-neon/40 bg-neon/10 text-neon' : 'border-white/10 text-ink-muted')}>
            <CheckSquare className="h-3 w-3" />{done}/{card.checklist.length}
          </span>
        )}
        {!canWorkOn(card) && <Lock className="h-3 w-3 text-ink-muted" aria-label="Só a coordenação ou o responsável movem" />}
        <span className="ml-auto flex -space-x-1.5">{people.slice(0, 3).map((m) => <Avatar key={m.id} name={m.name} photo={m.photo} size={22} />)}</span>
      </div>
    </div>
  );
}

function CardEditor({ card, onClose }: { card: BoardCard; onClose: () => void }) {
  const store = useStore();
  const { board, members, schedules, events, can, canWorkOn } = store;
  const staff = can('manage:board');
  const isNew = !board.cards.some((c) => c.id === card.id);
  const [c, setC] = useState<BoardCard>(card);
  const [item, setItem] = useState('');
  const [err, setErr] = useState('');
  const [del, setDel] = useState(false);
  const today = toISODate(new Date());
  const toggle = (arr: string[], v: string) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  const active = members.filter((m) => m.status !== 'inativo');
  const upcoming = schedules.filter((s) => s.date >= today).sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start)).slice(0, 30);

  if (!staff) {
    // Servo: vê tudo, move a própria tarefa e marca o checklist
    const mine = canWorkOn(card);
    const live = board.cards.find((x) => x.id === card.id) ?? card;
    return (
      <Modal open onOpenChange={(o) => !o && onClose()} title={live.title} size="md">
        {live.description && <p className="whitespace-pre-wrap text-sm text-ink-muted">{live.description}</p>}
        <p className="label mt-5">Etapa</p>
        <Select disabled={!mine} value={live.columnId} onChange={(e) => { store.moveCard(live.id, e.target.value, Infinity); toast.success('Tarefa movida.'); }}>
          {board.columns.map((col) => <option key={col.id} value={col.id}>{col.title}</option>)}
        </Select>
        {live.checklist.length > 0 && (
          <>
            <p className="label mt-5">Checklist</p>
            <ul className="space-y-1.5">
              {live.checklist.map((k) => (
                <li key={k.id}>
                  <label className={cn('flex items-center gap-3 rounded-xl border border-line px-3 py-2 text-sm', mine && 'cursor-pointer hover:bg-white/5')}>
                    <input type="checkbox" className="h-4 w-4 accent-[#5BFF9A]" disabled={!mine} checked={k.done} onChange={() => store.toggleCardItem(live.id, k.id)} />
                    <span className={cn(k.done && 'text-ink-muted line-through')}>{k.label}</span>
                  </label>
                </li>
              ))}
            </ul>
          </>
        )}
        <p className="mt-5 text-sm text-ink-muted">Responsáveis: {live.assigneeIds.map((id) => members.find((m) => m.id === id)?.name).filter(Boolean).join(', ') || 'ninguém ainda'}{live.due ? ` · Prazo ${fmt(live.due, 'dd/MM')}` : ''}</p>
        {!mine && <p className="mt-2 flex items-center gap-2 text-xs text-ink-muted"><Lock className="h-3.5 w-3.5" />Só os responsáveis e a coordenação mexem nesta tarefa.</p>}
      </Modal>
    );
  }

  const save = () => {
    if (!c.title.trim()) return setErr('Dê um título para a tarefa.');
    store.saveCard({ ...c, title: c.title.trim(), description: c.description.trim() });
    toast.success(isNew ? 'Tarefa criada.' : 'Tarefa salva.');
    onClose();
  };
  const addItem = () => { if (item.trim()) { setC({ ...c, checklist: [...c.checklist, { id: uid('k'), label: item.trim(), done: false }] }); setItem(''); } };

  return (
    <Modal open onOpenChange={(o) => !o && onClose()} title={isNew ? 'Nova tarefa' : 'Editar tarefa'} size="lg"
      footer={<>
        {!isNew && <Button variant="danger" icon={Trash2} className="mr-auto" onClick={() => setDel(true)}>Excluir</Button>}
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button variant="primary" onClick={save}>{isNew ? 'Criar tarefa' : 'Salvar'}</Button>
      </>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Título" error={err} className="sm:col-span-2">
          <Input autoFocus placeholder="Ex.: Arte da Festa do Padroeiro" value={c.title} invalid={!!err} onChange={(e) => { setC({ ...c, title: e.target.value }); setErr(''); }} />
        </Field>
        <Field label="Detalhes" className="sm:col-span-2">
          <Textarea placeholder="O que precisa ser feito, formato, referências (opcional)" value={c.description} onChange={(e) => setC({ ...c, description: e.target.value })} />
        </Field>
        <Field label="Etapa">
          <Select value={c.columnId} onChange={(e) => setC({ ...c, columnId: e.target.value })}>
            {board.columns.map((col) => <option key={col.id} value={col.id}>{col.title}</option>)}
          </Select>
        </Field>
        <Field label="Prazo">
          <Input type="date" value={c.due ?? ''} onChange={(e) => setC({ ...c, due: e.target.value || undefined })} />
        </Field>
        <Field label="Ligada a uma escala (opcional)" className="sm:col-span-2">
          <Select value={c.scheduleId ? `s:${c.scheduleId}` : c.eventId ? `e:${c.eventId}` : ''}
            onChange={(e) => { const v = e.target.value; setC({ ...c, scheduleId: v.startsWith('s:') ? v.slice(2) : undefined, eventId: v.startsWith('e:') ? v.slice(2) : undefined }); }}>
            <option value="">Nenhuma</option>
            {upcoming.length > 0 && <optgroup label="Escalas">{upcoming.map((s) => <option key={s.id} value={`s:${s.id}`}>{s.title} · {fmt(s.date, 'dd/MM')}</option>)}</optgroup>}
            {events.length > 0 && <optgroup label="Eventos">{events.filter((e) => e.date >= today).map((e) => <option key={e.id} value={`e:${e.id}`}>{e.title} · {fmt(e.date, 'dd/MM')}</option>)}</optgroup>}
          </Select>
        </Field>
      </div>

      <p className="label mt-6">Responsáveis</p>
      {active.length ? (
        <div className="flex flex-wrap gap-1.5">
          {active.map((m) => (
            <button key={m.id} type="button" aria-pressed={c.assigneeIds.includes(m.id)} onClick={() => setC({ ...c, assigneeIds: toggle(c.assigneeIds, m.id) })}
              className={cn('inline-flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-sm', c.assigneeIds.includes(m.id) ? 'border-neon/50 bg-neon/10 text-neon' : 'border-line text-ink-muted')}>
              <Avatar name={m.name} photo={m.photo} size={24} />{m.name.split(' ')[0]}
            </button>
          ))}
        </div>
      ) : <p className="text-sm text-ink-muted">Cadastre a equipe para passar tarefas.</p>}

      <p className="label mt-6">Etiquetas</p>
      <div className="flex flex-wrap gap-1.5">
        {board.labels.map((l) => {
          const on = c.labelIds.includes(l.id);
          return (
            <button key={l.id} type="button" aria-pressed={on} onClick={() => setC({ ...c, labelIds: toggle(c.labelIds, l.id) })}
              className="rounded-full border px-3 py-1 text-sm" style={on ? { background: `${l.color}22`, color: l.color, borderColor: `${l.color}66` } : { borderColor: '#252F3C', color: '#96A3B5' }}>
              {l.name}
            </button>
          );
        })}
      </div>

      <p className="label mt-6">Checklist</p>
      <ul className="space-y-1.5">
        {c.checklist.map((k) => (
          <li key={k.id} className="flex items-center gap-3 rounded-xl border border-line px-3 py-2 text-sm">
            <input type="checkbox" aria-label={k.label} className="h-4 w-4 accent-[#5BFF9A]" checked={k.done} onChange={() => setC({ ...c, checklist: c.checklist.map((x) => (x.id === k.id ? { ...x, done: !x.done } : x)) })} />
            <span className={cn('flex-1', k.done && 'text-ink-muted line-through')}>{k.label}</span>
            <button type="button" aria-label={`Remover ${k.label}`} className="text-ink-muted hover:text-danger" onClick={() => setC({ ...c, checklist: c.checklist.filter((x) => x.id !== k.id) })}><Trash2 className="h-4 w-4" /></button>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex gap-2">
        <Input className="h-10" placeholder="Novo item (ex.: Aprovação do pároco)" value={item} onChange={(e) => setItem(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addItem(); } }} />
        <Button type="button" size="sm" variant="outline" icon={Plus} className="h-10 shrink-0" onClick={addItem}>Adicionar</Button>
      </div>

      <ConfirmDialog open={del} onOpenChange={setDel} title="Excluir tarefa?" body={`“${card.title}” sai do quadro.`} confirmLabel="Excluir"
        onConfirm={() => { store.deleteCard(card.id); toast.success('Tarefa excluída.'); onClose(); }} />
    </Modal>
  );
}

function ColumnsEditor({ onClose }: { onClose: () => void }) {
  const store = useStore();
  const [cols, setCols] = useState<BoardColumn[]>(store.board.columns);
  const count = (id: string) => store.board.cards.filter((c) => c.columnId === id).length;
  const move = (i: number, d: number) => { const n = [...cols]; [n[i], n[i + d]] = [n[i + d], n[i]]; setCols(n); };
  return (
    <Modal open onOpenChange={(o) => !o && onClose()} title="Colunas do quadro" size="sm" description="As tarefas de uma coluna removida vão para a primeira."
      footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button variant="primary" onClick={() => {
        const clean = cols.map((c) => ({ ...c, title: c.title.trim() })).filter((c) => c.title);
        if (!clean.length) return toast.error('O quadro precisa de pelo menos uma coluna.');
        store.saveColumns(clean);
        toast.success('Colunas salvas.');
        onClose();
      }}>Salvar</Button></>}>
      <ul className="space-y-2">
        {cols.map((c, i) => (
          <li key={c.id} className="flex items-center gap-1.5">
            <Input aria-label={`Nome da coluna ${i + 1}`} placeholder="Nome da coluna" value={c.title} onChange={(e) => setCols(cols.map((x) => (x.id === c.id ? { ...x, title: e.target.value } : x)))} />
            <Button size="icon" variant="ghost" className="h-10 w-10 shrink-0" aria-label="Subir" disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp className="h-4 w-4" /></Button>
            <Button size="icon" variant="ghost" className="h-10 w-10 shrink-0" aria-label="Descer" disabled={i === cols.length - 1} onClick={() => move(i, 1)}><ArrowDown className="h-4 w-4" /></Button>
            <Button size="icon" variant="ghost" className="h-10 w-10 shrink-0 hover:text-danger" aria-label={`Remover ${c.title || 'coluna'}${count(c.id) ? ` (${count(c.id)} tarefas)` : ''}`} disabled={cols.length === 1}
              onClick={() => setCols(cols.filter((x) => x.id !== c.id))}><Trash2 className="h-4 w-4" /></Button>
          </li>
        ))}
      </ul>
      <Button className="mt-3" size="sm" variant="outline" icon={Plus} onClick={() => setCols([...cols, { id: uid('col'), title: '' }])}>Adicionar coluna</Button>
    </Modal>
  );
}
