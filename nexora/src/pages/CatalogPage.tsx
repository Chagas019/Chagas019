import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router';
import { Search, X } from 'lucide-react';
import { SearchPanel } from '@/components/property/SearchPanel';
import { PropertyCard } from '@/components/property/PropertyCard';
import { EmptyState, ErrorState, LoadingGrid } from '@/components/ui/States';
import { Reveal } from '@/components/motion/Reveal';
import { TLink } from '@/components/ui/TLink';
import { useContent, useProperties } from '@/hooks/useData';
import { useCollections } from '@/hooks/useCollections';
import { useSeo } from '@/hooks/useSeo';
import { activeFilterCount, applyFilters, locationOptions, parseFilters, toSearchParams, type Filters, type SortKey } from '@/lib/filters';
import { formatCompactBRL, TYPE_LABEL } from '@/lib/format';

const PAGE = 6;
const SORT_LABEL: Record<SortKey, string> = {
  relevancia: 'Relevância',
  'preco-asc': 'Menor preço',
  'preco-desc': 'Maior preço',
  recentes: 'Mais recentes',
  'area-desc': 'Maior área',
  'area-asc': 'Menor área',
};

export default function CatalogPage() {
  const [sp, setSp] = useSearchParams();
  const filters = useMemo(() => parseFilters(sp), [sp]);
  const { data: list, loading, error, retry } = useProperties();
  const { data: content } = useContent();
  const { recent } = useCollections();
  const [shown, setShown] = useState(PAGE);
  const [q, setQ] = useState(filters.q);
  useEffect(() => { setShown(PAGE); setQ(filters.q); }, [sp]); // eslint-disable-line react-hooks/exhaustive-deps

  const results = useMemo(() => (list ? applyFilters(list, filters) : []), [list, filters]);
  const category = content?.categories.find((c) => c.id === filters.estilo);
  const title = category ? category.label : filters.finalidade === 'aluguel' ? 'Imóveis para alugar' : filters.finalidade === 'venda' ? 'Imóveis à venda' : 'Todos os imóveis';
  useSeo({ title: `${title} | NEXORA Real Estate`, description: 'Busque imóveis por bairro, tipo, preço, quartos, área e vagas. Planta interativa e tour 3D quando disponíveis.', path: `/imoveis${sp.size ? `?${sp}` : ''}`, noindex: sp.size > 0 });

  const update = (f: Partial<Filters>) => setSp(toSearchParams({ ...filters, ...f }), { preventScrollReset: true });
  const chips = buildChips(filters, category?.label);
  const recentItems = recent.map((id) => list?.find((p) => p.id === id)).filter(Boolean).slice(0, 4);

  const submitText = (e: FormEvent) => { e.preventDefault(); update({ q: q.trim() }); };

  return (
    <div className="theme-light min-h-screen bg-bg pb-section pt-[calc(var(--header-h)+2.5rem)] text-fg">
      <div className="container">
        <header className="mb-8 grid gap-6 md:grid-cols-12 md:items-end">
          <div className="md:col-span-7">
            <p className="eyebrow mb-3">Catálogo</p>
            <h1 className="text-display-lg font-medium">{title}</h1>
            {category && <p className="mt-3 text-muted">{category.description}</p>}
          </div>
          <form onSubmit={submitText} role="search" className="relative md:col-span-5" aria-label="Buscar por texto">
            <label htmlFor="busca-texto" className="sr-only">Buscar por nome, bairro ou característica</label>
            <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <input id="busca-texto" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome, bairro ou característica" className="field pl-10 pr-24" />
            <button type="submit" className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded bg-fg px-3 py-1.5 text-xs font-medium text-bg">Buscar</button>
          </form>
        </header>

        <SearchPanel value={filters} locations={locationOptions(list ?? [])} onApply={(f) => setSp(toSearchParams({ ...f, q: filters.q, estilo: filters.estilo, ordem: filters.ordem }), { preventScrollReset: true })} onClear={() => setSp(toSearchParams({ ordem: filters.ordem }))} />

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-b pb-4 hairline">
          <div className="flex flex-wrap items-center gap-2" aria-live="polite">
            <p className="mr-2 text-sm">
              {loading ? 'Carregando…' : <><strong className="font-medium">{results.length}</strong> {results.length === 1 ? 'imóvel encontrado' : 'imóveis encontrados'}</>}
            </p>
            {chips.map((c) => (
              <button key={c.key} type="button" onClick={() => update(c.clear)} className="chip gap-1 normal-case tracking-normal hover:bg-fg/5" aria-label={`Remover filtro ${c.label}`}>
                {c.label} <X size={11} />
              </button>
            ))}
            {activeFilterCount(filters) > 1 && <button type="button" className="text-xs text-signal hover:underline" onClick={() => setSp(new URLSearchParams())}>Limpar tudo</button>}
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="ordem" className="text-sm text-muted">Ordenar por</label>
            <select id="ordem" className="field w-auto min-w-[11rem]" value={filters.ordem} onChange={(e) => update({ ordem: e.target.value as SortKey })}>
              {(Object.keys(SORT_LABEL) as SortKey[]).map((k) => <option key={k} value={k}>{SORT_LABEL[k]}</option>)}
            </select>
          </div>
        </div>

        <div className="mt-10">
          {loading ? <LoadingGrid /> : error ? <ErrorState text={error.message} onRetry={retry} /> : results.length === 0 ? (
            <EmptyState
              title="Nenhum imóvel com esses filtros"
              text="Tente ampliar a faixa de preço, reduzir o número de quartos ou buscar em outro bairro."
              action={<><button type="button" className="btn-primary" onClick={() => setSp(new URLSearchParams())}>Limpar filtros</button><TLink to="/contato" className="btn-ghost">Pedir ajuda a um consultor</TLink></>}
            />
          ) : (
            <>
              <ul className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
                {results.slice(0, shown).map((p, i) => (
                  <Reveal as="li" key={p.id} delay={(i % 3) * 0.07}><PropertyCard p={p} priority={i < 3} /></Reveal>
                ))}
              </ul>
              {shown < results.length && (
                <div className="mt-14 flex flex-col items-center gap-3">
                  <p className="text-xs text-muted">Mostrando {Math.min(shown, results.length)} de {results.length}</p>
                  <button type="button" className="btn-ghost px-8" onClick={() => setShown((n) => n + PAGE)}>Carregar mais imóveis</button>
                </div>
              )}
            </>
          )}
        </div>

        {recentItems.length > 0 && (
          <section aria-labelledby="vistos" className="mt-24 border-t pt-10 hairline">
            <h2 id="vistos" className="mb-6 text-xl font-medium tracking-tight">Vistos recentemente</h2>
            <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {recentItems.map((p) => <li key={p!.id}><PropertyCard p={p!} /></li>)}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}

function buildChips(f: Filters, styleLabel?: string) {
  const c: { key: string; label: string; clear: Partial<Filters> }[] = [];
  if (f.q) c.push({ key: 'q', label: `“${f.q}”`, clear: { q: '' } });
  if (f.local) c.push({ key: 'local', label: f.local, clear: { local: '' } });
  if (f.tipo) c.push({ key: 'tipo', label: TYPE_LABEL[f.tipo], clear: { tipo: '' } });
  if (f.finalidade) c.push({ key: 'fin', label: f.finalidade === 'venda' ? 'Comprar' : 'Alugar', clear: { finalidade: '' } });
  if (f.precoMin !== undefined) c.push({ key: 'pmin', label: `Desde ${formatCompactBRL(f.precoMin)}`, clear: { precoMin: undefined } });
  if (f.precoMax !== undefined) c.push({ key: 'pmax', label: `Até ${formatCompactBRL(f.precoMax)}`, clear: { precoMax: undefined } });
  if (f.quartos) c.push({ key: 'q2', label: `${f.quartos}+ quartos`, clear: { quartos: undefined } });
  if (f.vagas) c.push({ key: 'v', label: `${f.vagas}+ vagas`, clear: { vagas: undefined } });
  if (f.areaMin) c.push({ key: 'a', label: `≥ ${f.areaMin} m²`, clear: { areaMin: undefined } });
  if (f.estilo) c.push({ key: 'e', label: styleLabel ?? f.estilo, clear: { estilo: '' } });
  if (f.tour3d) c.push({ key: '3d', label: 'Com tour 3D', clear: { tour3d: false } });
  return c;
}


