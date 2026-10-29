import { Link2, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button, Card, ConfirmDialog, Field, Input, Modal, PageHeader, ROLE_ICONS, RoleIcon, Textarea } from '@/components/ui';
import { useStore } from '@/lib/store';
import type { Role } from '@/lib/types';
import { cn, uid } from '@/lib/utils';

const COLORS = ['#5BFF9A', '#55B8FF', '#B98BFF', '#FF8BD1', '#FFC857', '#7CF5FF', '#FF6B7A', '#A6FF5B', '#F5F7FA'];

export default function Roles() {
  const { roles, members, schedules, can, deleteRole } = useStore();
  const [editing, setEditing] = useState<Role | null>(null);
  const [toDelete, setToDelete] = useState<Role | null>(null);
  const manage = can('manage:schedules');

  return (
    <div>
      <PageHeader title="Funções" subtitle="As funções que a PASCOM cobre em cada celebração" actions={manage && (
        <Button variant="primary" icon={Plus} onClick={() => setEditing({ id: uid('r'), name: '', color: COLORS[1], icon: 'Sparkles', description: '', compatibleWith: [] })}>Nova função</Button>
      )} />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {roles.map((r) => {
          const people = members.filter((m) => m.status === 'ativo' && m.roleIds.includes(r.id)).length;
          const uses = schedules.reduce((a, s) => a + s.slots.filter((x) => x.roleId === r.id).length, 0);
          return (
            <Card key={r.id} hover className="relative overflow-hidden p-5">
              <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-20 blur-3xl" style={{ background: r.color }} />
              <div className="relative flex items-start justify-between">
                <RoleIcon icon={r.icon} color={r.color} size={20} boxed />
                {manage && (
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-9 w-9" aria-label={`Editar ${r.name}`} onClick={() => setEditing(r)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" className="h-9 w-9" aria-label={`Excluir ${r.name}`} onClick={() => setToDelete(r)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                )}
              </div>
              <p className="relative mt-4 font-semibold">{r.name}</p>
              <p className="relative mt-1 text-sm text-ink-muted">{r.description || 'Sem descrição.'}</p>
              {r.compatibleWith.length > 0 && (
                <p className="relative mt-3 flex items-center gap-1.5 text-xs text-ink-muted"><Link2 className="h-3.5 w-3.5" />Acumula com: {r.compatibleWith.map((c) => roles.find((x) => x.id === c)?.name).filter(Boolean).join(', ')}</p>
              )}
              <div className="relative mt-4 flex gap-4 border-t border-line/60 pt-3 text-xs text-ink-muted">
                <span><span className="text-ink">{people}</span> integrantes</span>
                <span><span className="text-ink">{uses}</span> vagas em escalas</span>
              </div>
            </Card>
          );
        })}
      </div>
      {editing && <RoleEditor role={editing} onClose={() => setEditing(null)} />}
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Excluir função?"
        body={`A função “${toDelete?.name}” será removida dos perfis dos integrantes.`}
        onConfirm={() => {
          if (!toDelete) return;
          if (deleteRole(toDelete.id)) toast.success('Função removida.');
          else toast.error('Esta função está em uso em escalas.', { description: 'Remova-a das escalas antes de excluir.' });
        }}
      />
    </div>
  );
}

function RoleEditor({ role, onClose }: { role: Role; onClose: () => void }) {
  const { roles, saveRole } = useStore();
  const [r, setR] = useState(role);
  const [err, setErr] = useState('');
  const isNew = !roles.some((x) => x.id === role.id);
  const save = () => {
    if (r.name.trim().length < 2) return setErr('Informe o nome da função.');
    if (roles.some((x) => x.id !== r.id && x.name.toLowerCase() === r.name.trim().toLowerCase())) return setErr('Já existe uma função com esse nome.');
    saveRole({ ...r, name: r.name.trim() });
    toast.success(isNew ? 'Função criada.' : 'Função atualizada.');
    onClose();
  };
  return (
    <Modal open onOpenChange={(o) => !o && onClose()} title={isNew ? 'Nova função' : `Editar ${role.name}`}
      footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button variant="primary" onClick={save}>Salvar</Button></>}>
      <div className="space-y-4">
        <Field label="Nome" error={err}><Input autoFocus value={r.name} onChange={(e) => setR({ ...r, name: e.target.value })} placeholder="Ex.: Drone" /></Field>
        <Field label="Descrição"><Textarea placeholder="O que essa função faz na celebração" value={r.description} onChange={(e) => setR({ ...r, description: e.target.value })} /></Field>
        <div>
          <span className="label">Cor</span>
          <div className="flex flex-wrap gap-2">
            {COLORS.map((c) => <button key={c} type="button" aria-label={`Cor ${c}`} aria-pressed={r.color === c} onClick={() => setR({ ...r, color: c })} className={cn('h-8 w-8 rounded-full border-2 transition-transform', r.color === c ? 'scale-110 border-ink' : 'border-transparent')} style={{ background: c }} />)}
          </div>
        </div>
        <div>
          <span className="label">Ícone</span>
          <div className="flex flex-wrap gap-2">
            {Object.keys(ROLE_ICONS).map((i) => (
              <button key={i} type="button" aria-label={i} aria-pressed={r.icon === i} onClick={() => setR({ ...r, icon: i })} className={cn('rounded-xl border p-2 transition-colors', r.icon === i ? 'border-neon/50 bg-neon/10' : 'border-line hover:border-ink-muted/40')}>
                <RoleIcon icon={i} color={r.icon === i ? r.color : '#96A3B5'} size={18} />
              </button>
            ))}
          </div>
        </div>
        <div>
          <span className="label">Pode acumular com (mesma celebração)</span>
          <p className="mb-2 text-xs text-ink-muted">Combinações fora desta lista geram alerta ao escalar a mesma pessoa.</p>
          <div className="flex flex-wrap gap-2">
            {roles.filter((x) => x.id !== r.id).map((x) => {
              const on = r.compatibleWith.includes(x.id);
              return (
                <button key={x.id} type="button" aria-pressed={on} onClick={() => setR({ ...r, compatibleWith: on ? r.compatibleWith.filter((c) => c !== x.id) : [...r.compatibleWith, x.id] })}
                  className={cn('rounded-full border px-3 py-1.5 text-xs', on ? 'border-neon/50 bg-neon/10' : 'border-line text-ink-muted')}>{x.name}</button>
              );
            })}
          </div>
        </div>
      </div>
    </Modal>
  );
}
