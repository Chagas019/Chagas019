import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { CalendarCheck, Mail, MessageSquare, Phone } from 'lucide-react';
import type { Lead } from '@/types/property';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States';
import { TLink } from '@/components/ui/TLink';
import { useAllProperties, useLeads } from '@/hooks/useData';
import { useToast } from '@/hooks/useToast';
import { updateLead } from '@/services/leads';
import { formatDateTime } from '@/lib/format';

const STATUS: Record<Lead['status'], string> = { novo: 'Novo', 'em-atendimento': 'Em atendimento', 'visita-agendada': 'Visita agendada', concluido: 'Concluído', descartado: 'Descartado' };
const KIND: Record<Lead['kind'], string> = { informacoes: 'Informações', visita: 'Visita', contato: 'Contato geral' };

export default function AdminLeads() {
  const { data, loading, error, retry } = useLeads();
  const { data: props } = useAllProperties();
  const [sp, setSp] = useSearchParams();
  const status = sp.get('status') ?? '';
  const tipo = sp.get('tipo') ?? '';
  const [openId, setOpenId] = useState<string>();
  const toast = useToast();
  const list = useMemo(() => (data ?? []).filter((l) => (!status || l.status === status) && (!tipo || l.kind === tipo)), [data, status, tipo]);
  const filter = (k: string, v: string) => { const n = new URLSearchParams(sp); if (v) n.set(k, v); else n.delete(k); setSp(n); };

  const update = async (l: Lead, patch: Pick<Partial<Lead>, 'status' | 'notes'>) => {
    try { await updateLead(l.id, patch); toast.show('Contato atualizado', { tone: 'success' }); } catch (e) { toast.show((e as Error).message, { tone: 'error' }); }
  };

  return (
    <div>
      <h1 className="mb-6 text-display-sm font-medium">Contatos e visitas</h1>
      <div className="mb-5 flex flex-wrap gap-3">
        <label className="flex items-center gap-2 text-sm text-mist">Status
          <select className="field w-auto" value={status} onChange={(e) => filter('status', e.target.value)}><option value="">Todos</option>{Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        </label>
        <label className="flex items-center gap-2 text-sm text-mist">Tipo
          <select className="field w-auto" value={tipo} onChange={(e) => filter('tipo', e.target.value)}><option value="">Todos</option>{Object.entries(KIND).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        </label>
      </div>
      {loading ? <Skeleton className="h-64 w-full" /> : error ? <ErrorState text={error.message} onRetry={retry} /> : list.length === 0 ? (
        <EmptyState icon={<MessageSquare size={20} />} title="Nenhuma solicitação" text="As mensagens enviadas pelos formulários do site aparecem aqui." />
      ) : (
        <ul className="space-y-2">
          {list.map((l) => {
            const prop = props?.find((p) => p.id === l.propertyId);
            const open = openId === l.id;
            return (
              <li key={l.id} className="surface">
                <button type="button" aria-expanded={open} onClick={() => setOpenId(open ? undefined : l.id)} className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 p-4 text-left">
                  <span className={`chip ${l.status === 'novo' ? 'border-signal/50 text-signal-soft' : 'text-mist'}`}>{STATUS[l.status]}</span>
                  <span className="font-medium">{l.name}</span>
                  <span className="text-sm text-mist">{KIND[l.kind]}{l.propertyName ? ` · ${l.propertyName}` : ''}</span>
                  {l.visitAt && <span className="flex items-center gap-1.5 text-sm text-paper/80"><CalendarCheck size={14} /> {formatDateTime(l.visitAt)} ({l.visitMode === 'video' ? 'vídeo' : 'presencial'})</span>}
                  <span className="ml-auto font-mono text-xs text-mist">{formatDateTime(l.createdAt)}</span>
                </button>
                {open && (
                  <div className="grid gap-5 border-t border-white/10 p-4 md:grid-cols-2">
                    <div className="space-y-2 text-sm">
                      <p className="flex items-center gap-2"><Mail size={14} className="text-mist" /><a href={`mailto:${l.email}`} className="hover:underline">{l.email}</a></p>
                      {l.phone && <p className="flex items-center gap-2"><Phone size={14} className="text-mist" /><a href={`tel:${l.phone.replace(/[^\d+]/g, '')}`} className="hover:underline">{l.phone}</a></p>}
                      {l.message && <p className="whitespace-pre-wrap rounded border border-white/10 p-3 text-paper/85">{l.message}</p>}
                      <p className="text-xs text-mist">Origem: {l.source} · Consentimento LGPD: {l.consent ? 'sim' : 'não'}</p>
                      {prop && <p className="text-xs">Imóvel: <TLink to={`/admin/imoveis/${prop.id}`} className="text-signal-soft hover:underline">{prop.name}</TLink></p>}
                    </div>
                    <div className="space-y-3">
                      <label className="block"><span className="field-label">Status do atendimento</span>
                        <select className="field" value={l.status} onChange={(e) => update(l, { status: e.target.value as Lead['status'] })}>{Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
                      </label>
                      <NotesField lead={l} onSave={(notes) => update(l, { notes })} />
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function NotesField({ lead, onSave }: { lead: Lead; onSave: (n: string) => void }) {
  const [v, setV] = useState(lead.notes ?? '');
  return (
    <label className="block"><span className="field-label">Anotações internas</span>
      <textarea className="field" rows={3} value={v} onChange={(e) => setV(e.target.value)} onBlur={() => v !== (lead.notes ?? '') && onSave(v)} />
      <span className="mt-1 block text-xs text-mist">Salva ao sair do campo. Visível só para a equipe.</span>
    </label>
  );
}
