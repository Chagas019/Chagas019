import { useEffect, useId, useState, type FormEvent } from 'react';
import { RotateCcw, Search, SlidersHorizontal } from 'lucide-react';
import type { Purpose } from '@/types/property';
import { EMPTY_FILTERS, type Filters } from '@/lib/filters';
import { formatCompactBRL, TYPE_LABEL } from '@/lib/format';

const SALE = [300_000, 600_000, 1_000_000, 1_500_000, 2_500_000, 4_000_000, 6_000_000];
const RENT = [2_000, 3_500, 5_000, 8_000, 12_000, 20_000];

interface Props {
  value: Filters;
  onApply: (f: Filters) => void;
  onClear: () => void;
  locations: string[];
  variant?: 'hero' | 'panel';
}

/** Busca com filtros combinados. Os valores só valem ao aplicar (ou Enter), e vão para a URL. */
export function SearchPanel({ value, onApply, onClear, locations, variant = 'panel' }: Props) {
  const [f, setF] = useState<Filters>(value);
  const [more, setMore] = useState(variant === 'panel');
  const id = useId();
  useEffect(() => setF(value), [value]);
  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => setF((s) => ({ ...s, [k]: v }));
  const num = (v: string) => (v === '' ? undefined : Number(v));
  const prices = f.finalidade === 'aluguel' ? RENT : f.finalidade === 'venda' ? SALE : [...RENT.slice(0, 3), ...SALE];
  const priceErr = f.precoMin !== undefined && f.precoMax !== undefined && f.precoMin > f.precoMax;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (priceErr) return;
    onApply({ ...f, q: f.q.trim(), local: f.local.trim() });
  };

  return (
    <form onSubmit={submit} role="search" aria-label="Buscar imóveis" className="surface p-4 md:p-5">
      <div className="grid gap-3 md:grid-cols-12">
        <div className="md:col-span-4">
          <label htmlFor={`${id}-local`} className="field-label">Cidade ou bairro</label>
          <input id={`${id}-local`} className="field" list={`${id}-locs`} placeholder="Ex.: Vale Aurora" value={f.local} onChange={(e) => set('local', e.target.value)} autoComplete="off" />
          <datalist id={`${id}-locs`}>{locations.map((l) => <option key={l} value={l} />)}</datalist>
        </div>
        <div className="md:col-span-3">
          <label htmlFor={`${id}-tipo`} className="field-label">Tipo de imóvel</label>
          <select id={`${id}-tipo`} className="field" value={f.tipo} onChange={(e) => set('tipo', e.target.value as Filters['tipo'])}>
            <option value="">Todos</option>
            {Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <fieldset className="md:col-span-3">
          <legend className="field-label">Comprar ou alugar</legend>
          <div className="grid h-[44px] grid-cols-3 rounded border p-1 hairline">
            {([['', 'Todos'], ['venda', 'Comprar'], ['aluguel', 'Alugar']] as [Purpose | '', string][]).map(([v, l]) => (
              <label key={l} className={`flex cursor-pointer items-center justify-center rounded-sm text-[13px] transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-signal ${f.finalidade === v ? 'bg-fg text-bg' : 'text-muted hover:text-fg'}`}>
                <input type="radio" name={`${id}-fin`} className="sr-only" checked={f.finalidade === v} onChange={() => setF((s) => ({ ...s, finalidade: v, precoMin: undefined, precoMax: undefined }))} />
                {l}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="flex items-end gap-2 md:col-span-2">
          <button type="submit" className="btn-primary w-full" disabled={priceErr}><Search size={16} /> Buscar</button>
        </div>
      </div>

      {variant === 'hero' && (
        <button type="button" onClick={() => setMore((v) => !v)} aria-expanded={more} className="mt-3 inline-flex min-h-[40px] items-center gap-2 text-[13px] text-muted hover:text-fg">
          <SlidersHorizontal size={14} /> {more ? 'Menos filtros' : 'Mais filtros: preço, quartos, área e vagas'}
        </button>
      )}

      {more && (
        <div className="mt-3 grid gap-3 border-t pt-4 hairline sm:grid-cols-2 md:grid-cols-12">
          <div className="md:col-span-6">
            <label htmlFor={`${id}-pmin`} className="field-label">Preço mínimo</label>
            <select id={`${id}-pmin`} className="field" value={f.precoMin ?? ''} onChange={(e) => set('precoMin', num(e.target.value))} aria-invalid={priceErr}>
              <option value="">Sem mínimo</option>
              {prices.map((p) => <option key={p} value={p}>{formatCompactBRL(p)}</option>)}
            </select>
          </div>
          <div className="md:col-span-6">
            <label htmlFor={`${id}-pmax`} className="field-label">Preço máximo</label>
            <select id={`${id}-pmax`} className="field" value={f.precoMax ?? ''} onChange={(e) => set('precoMax', num(e.target.value))} aria-invalid={priceErr} aria-describedby={priceErr ? `${id}-perr` : undefined}>
              <option value="">Sem máximo</option>
              {prices.map((p) => <option key={p} value={p}>{formatCompactBRL(p)}</option>)}
            </select>
            {priceErr && <p id={`${id}-perr`} className="field-error">O máximo precisa ser maior que o mínimo.</p>}
          </div>
          <Choice label="Quartos" value={f.quartos} options={[1, 2, 3, 4]} onChange={(v) => set('quartos', v)} className="md:col-span-4" />
          <Choice label="Vagas" value={f.vagas} options={[1, 2, 3]} onChange={(v) => set('vagas', v)} className="md:col-span-4" />
          <div className="sm:col-span-2 md:col-span-4">
            <label htmlFor={`${id}-area`} className="field-label">Área mínima (m²)</label>
            <input id={`${id}-area`} className="field" type="number" inputMode="numeric" min={0} step={10} placeholder="Ex.: 120" value={f.areaMin ?? ''} onChange={(e) => set('areaMin', num(e.target.value))} />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 sm:col-span-2 md:col-span-12">
            <label className="flex min-h-[44px] cursor-pointer items-center gap-2.5 text-sm">
              <input type="checkbox" className="h-4 w-4 accent-signal" checked={f.tour3d} onChange={(e) => set('tour3d', e.target.checked)} />
              Somente com tour 3D
            </label>
            <button type="button" onClick={() => { setF(EMPTY_FILTERS); onClear(); }} className="btn-ghost"><RotateCcw size={15} /> Limpar filtros</button>
          </div>
        </div>
      )}
    </form>
  );
}

function Choice({ label, value, options, onChange, className }: { label: string; value?: number; options: number[]; onChange: (v?: number) => void; className?: string }) {
  return (
    <fieldset className={className}>
      <legend className="field-label">{label}</legend>
      <div className="flex h-[44px] gap-1 rounded border p-1 hairline">
        {[undefined, ...options].map((o) => (
          <button key={String(o)} type="button" aria-pressed={value === o} onClick={() => onChange(o)} className={`flex-1 rounded-sm text-[13px] transition ${value === o ? 'bg-fg text-bg' : 'text-muted hover:text-fg'}`}>
            {o === undefined ? 'Qualquer' : `${o}+`}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
