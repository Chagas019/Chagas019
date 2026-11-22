import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { Archive, Eye, EyeOff, Pencil, Plus, Star } from 'lucide-react';
import type { Property, PublicationStatus } from '@/types/property';
import { TLink } from '@/components/ui/TLink';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States';
import { useAllProperties } from '@/hooks/useData';
import { useToast } from '@/hooks/useToast';
import { saveProperty, setStatus } from '@/services/properties';
import { formatDate, formatPrice, location, TYPE_LABEL } from '@/lib/format';
import { normalize } from '@/lib/filters';

const STATUS: Record<PublicationStatus, { label: string; cls: string }> = {
  publicado: { label: 'Publicado', cls: 'border-success/40 text-success' },
  rascunho: { label: 'Rascunho', cls: 'border-warning/40 text-warning' },
  arquivado: { label: 'Arquivado', cls: 'border-white/20 text-mist' },
};

export default function AdminProperties() {
  const { data, loading, error, retry } = useAllProperties();
  const [sp, setSp] = useSearchParams();
  const status = (sp.get('status') ?? '') as PublicationStatus | '';
  const [q, setQ] = useState('');
  const toast = useToast();
  const list = useMemo(() => (data ?? []).filter((p) => (!status || p.status === status) && (!q || normalize(`${p.name} ${p.neighborhood} ${p.city} ${p.slug}`).includes(normalize(q)))), [data, status, q]);

  const act = async (p: Property, fn: () => Promise<unknown>, msg: string) => {
    try { await fn(); toast.show(msg, { tone: 'success', description: p.name }); } catch (e) { toast.show((e as Error).message, { tone: 'error' }); }
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-display-sm font-medium">Imóveis</h1>
        <TLink to="/admin/imoveis/novo" className="btn-primary"><Plus size={16} /> Cadastrar imóvel</TLink>
      </div>
      <div className="mb-4 flex flex-wrap gap-3">
        <label className="sr-only" htmlFor="adm-q">Buscar</label>
        <input id="adm-q" className="field max-w-xs" placeholder="Buscar por nome, bairro ou slug" value={q} onChange={(e) => setQ(e.target.value)} />
        <div role="group" aria-label="Status" className="flex rounded border border-white/10 p-1">
          {(['', 'publicado', 'rascunho', 'arquivado'] as const).map((s) => (
            <button key={s} type="button" aria-pressed={status === s} onClick={() => setSp(s ? { status: s } : {})} className={`min-h-[36px] rounded-sm px-3 text-[13px] ${status === s ? 'bg-paper text-ink' : 'text-paper/70 hover:text-paper'}`}>{s ? STATUS[s].label : 'Todos'}</button>
          ))}
        </div>
      </div>
      {loading ? <Skeleton className="h-64 w-full" /> : error ? <ErrorState text={error.message} onRetry={retry} /> : list.length === 0 ? <EmptyState title="Nenhum imóvel" /> : (
        <div className="overflow-x-auto rounded-lg border border-white/10">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-white/[0.03] text-xs uppercase tracking-wider text-mist">
              <tr><th className="px-4 py-3 font-normal">Imóvel</th><th className="px-4 py-3 font-normal">Preço</th><th className="px-4 py-3 font-normal">Status</th><th className="px-4 py-3 font-normal">Recursos</th><th className="px-4 py-3 font-normal">Atualizado</th><th className="px-4 py-3 font-normal"><span className="sr-only">Ações</span></th></tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {list.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <img src={p.cover.thumb ?? p.cover.src} alt="" width={64} height={44} className="h-11 w-16 rounded object-cover" />
                      <div className="min-w-0"><p className="font-medium">{p.name}{p.featured && <Star size={12} className="ml-1.5 inline fill-signal text-signal" aria-label="Destaque" />}</p><p className="truncate text-xs text-mist">{TYPE_LABEL[p.type]} · {location(p)}</p></div>
                    </div>
                  </td>
                  <td className="px-4 py-3 tabular-nums">{formatPrice(p)}</td>
                  <td className="px-4 py-3"><span className={`chip ${STATUS[p.status].cls}`}>{STATUS[p.status].label}</span></td>
                  <td className="px-4 py-3 text-xs text-mist">{[p.floorPlan && 'Planta', p.model3d && '3D', p.panoramas?.length && '360°', `${p.gallery.length} fotos`].filter(Boolean).join(' · ')}</td>
                  <td className="px-4 py-3 text-xs text-mist">{formatDate(p.updatedAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <TLink to={`/admin/imoveis/${p.id}`} className="btn-icon h-9 w-9" aria-label={`Editar ${p.name}`} title="Editar"><Pencil size={14} /></TLink>
                      <button type="button" className="btn-icon h-9 w-9" title={p.featured ? 'Remover destaque' : 'Marcar como destaque'} aria-label={p.featured ? 'Remover destaque' : 'Marcar como destaque'} onClick={() => act(p, () => saveProperty({ ...p, featured: !p.featured }), p.featured ? 'Destaque removido' : 'Marcado como destaque')}><Star size={14} className={p.featured ? 'fill-signal text-signal' : ''} /></button>
                      {p.status === 'publicado'
                        ? <button type="button" className="btn-icon h-9 w-9" title="Despublicar" aria-label={`Despublicar ${p.name}`} onClick={() => act(p, () => setStatus(p, 'rascunho'), 'Despublicado')}><EyeOff size={14} /></button>
                        : <button type="button" className="btn-icon h-9 w-9" title="Publicar" aria-label={`Publicar ${p.name}`} onClick={() => act(p, () => setStatus(p, 'publicado'), 'Publicado')}><Eye size={14} /></button>}
                      {p.status !== 'arquivado' && <button type="button" className="btn-icon h-9 w-9" title="Arquivar" aria-label={`Arquivar ${p.name}`} onClick={() => act(p, () => setStatus(p, 'arquivado'), 'Arquivado')}><Archive size={14} /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
