import { Scale, X } from 'lucide-react';
import type { Property } from '@/types/property';
import { EmptyState, LoadingGrid } from '@/components/ui/States';
import { TLink } from '@/components/ui/TLink';
import { Picture } from '@/components/ui/Picture';
import { useProperties } from '@/hooks/useData';
import { COMPARE_MAX, useCollections } from '@/hooks/useCollections';
import { useSeo } from '@/hooks/useSeo';
import { formatArea, formatBRL, formatPrice, location, PURPOSE_LABEL, TYPE_LABEL } from '@/lib/format';

const NA = <span className="text-muted">Não informado</span>;

/** Linhas da comparação. Valor ausente aparece como "Não informado" ou "Não se aplica" — nunca inventado. */
const ROWS: { label: string; get: (p: Property) => React.ReactNode; best?: (ps: Property[]) => string | undefined }[] = [
  { label: 'Preço', get: (p) => formatPrice(p) },
  { label: 'Finalidade', get: (p) => PURPOSE_LABEL[p.purpose] },
  { label: 'Tipo', get: (p) => TYPE_LABEL[p.type] },
  { label: 'Localização', get: (p) => location(p) },
  { label: 'Área construída', get: (p) => (p.builtArea ? formatArea(p.builtArea) : p.type === 'terreno' ? <span className="text-muted">Não se aplica</span> : NA) },
  { label: 'Área do terreno', get: (p) => (p.landArea ? formatArea(p.landArea) : <span className="text-muted">Não se aplica</span>) },
  { label: 'Preço por m²', get: (p) => { const a = p.builtArea ?? p.landArea; return a && p.purpose === 'venda' ? formatBRL(Math.round(p.price / a)) : <span className="text-muted">—</span>; } },
  { label: 'Quartos', get: (p) => (p.type === 'studio' ? 'Integrado' : p.bedrooms) },
  { label: 'Suítes', get: (p) => p.suites },
  { label: 'Banheiros', get: (p) => p.bathrooms },
  { label: 'Vagas', get: (p) => p.parking },
  { label: 'Condomínio', get: (p) => (p.condoFee !== undefined ? `${formatBRL(p.condoFee)}/mês` : NA) },
  { label: 'IPTU', get: (p) => (p.iptu !== undefined ? `${formatBRL(p.iptu)}/ano` : NA) },
  { label: 'Planta', get: (p) => (p.floorPlan ? (p.floorPlan.kind === 'vetorial' ? 'Interativa' : 'Imagem') : 'Não disponível') },
  { label: 'Tour 3D', get: (p) => (p.model3d ? (p.model3d.demonstrative ? 'Sim (demonstrativo)' : 'Sim') : 'Não') },
  { label: 'Ano de construção', get: (p) => p.yearBuilt ?? NA },
];

export default function ComparePage() {
  const { data, loading } = useProperties();
  const { compare, toggleCompare, clearCompare } = useCollections();
  useSeo({ title: 'Comparar imóveis | NEXORA Real Estate', description: 'Compare até três imóveis lado a lado.', path: '/comparar', noindex: true });
  const items = compare.map((id) => data?.find((p) => p.id === id)).filter(Boolean) as Property[];

  return (
    <div className="theme-light min-h-screen bg-bg pb-section pt-[calc(var(--header-h)+2.5rem)] text-fg">
      <div className="container">
        <header className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow mb-3">Lado a lado</p>
            <h1 className="text-display-lg font-medium">Comparar imóveis</h1>
          </div>
          {items.length > 0 && <button type="button" className="btn-ghost" onClick={clearCompare}>Limpar comparação</button>}
        </header>
        {loading ? <LoadingGrid n={3} /> : items.length === 0 ? (
          <EmptyState icon={<Scale size={20} />} title="Nenhum imóvel para comparar" text={`Use o botão de comparar nos cards para escolher até ${COMPARE_MAX} imóveis.`} action={<TLink to="/imoveis" className="btn-primary">Escolher imóveis</TLink>} />
        ) : (
          <div className="-mx-5 overflow-x-auto px-5 md:mx-0 md:px-0">
            <table className="w-full min-w-[640px] border-collapse text-left text-[14.5px]">
              <caption className="sr-only">Comparação entre {items.length} imóveis</caption>
              <thead>
                <tr>
                  <th scope="col" className="w-44 align-bottom pb-4 text-xs font-normal text-muted">{items.length}/{COMPARE_MAX} selecionados</th>
                  {items.map((p) => (
                    <th key={p.id} scope="col" className="px-3 pb-4 align-top font-normal">
                      <div className="relative">
                        <TLink to={`/imovel/${p.slug}`} className="block"><Picture media={p.cover} className="aspect-[4/3] rounded-lg" sizes="33vw" /></TLink>
                        <button type="button" onClick={() => toggleCompare(p.id)} className="btn-icon absolute right-2 top-2 h-9 w-9 border-white/20 bg-ink/60 text-paper" aria-label={`Remover ${p.name}`}><X size={15} /></button>
                      </div>
                      <TLink to={`/imovel/${p.slug}`} className="mt-3 block text-lg font-medium tracking-tight hover:text-signal">{p.name}</TLink>
                    </th>
                  ))}
                  {Array.from({ length: COMPARE_MAX - items.length }, (_, i) => (
                    <th key={`v${i}`} className="px-3 pb-4 align-top font-normal">
                      <TLink to="/imoveis" className="flex aspect-[4/3] items-center justify-center rounded-lg border border-dashed text-sm text-muted hairline hover:text-fg">+ Adicionar imóvel</TLink>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROWS.map((r) => (
                  <tr key={r.label} className="border-t hairline">
                    <th scope="row" className="py-3 pr-3 text-xs font-normal uppercase tracking-wider text-muted">{r.label}</th>
                    {items.map((p) => <td key={p.id} className="px-3 py-3 tabular-nums">{r.get(p)}</td>)}
                    {Array.from({ length: COMPARE_MAX - items.length }, (_, i) => <td key={i} />)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
