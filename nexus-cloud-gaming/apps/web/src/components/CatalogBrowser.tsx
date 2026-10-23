'use client';

import {
  AVAILABILITY_LABEL,
  EMPTY_FILTERS,
  GAMES,
  PLATFORMS,
  allGenres,
  filterGames,
  parseFilters,
  serializeFilters,
  type Availability,
  type CatalogFilters,
  type ControllerSupport,
  type PlatformId,
} from '@nexus/core';
import { Gamepad2, RotateCcw, Search, SlidersHorizontal } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { GameCard } from './GameCard';
import { EmptyState } from './Section';

const GENRES = allGenres(GAMES);
const CONTROLLER_OPTIONS: { value: ControllerSupport; label: string }[] = [
  { value: 'completo', label: 'Controle completo' },
  { value: 'parcial', label: 'Controle parcial' },
  { value: 'teclado-mouse', label: 'Teclado e mouse' },
];

/**
 * Pesquisa e filtros do catálogo. O estado vive na URL (dá para compartilhar
 * e o "voltar" funciona); a URL é validada por `parseFilters` antes do uso.
 */
export function CatalogBrowser() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const fromUrl = useMemo(() => parseFilters(new URLSearchParams(params.toString())), [params]);
  const [q, setQ] = useState(fromUrl.q);
  const [open, setOpen] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (params.get('foco') === 'busca') input.current?.focus();
  }, [params]);

  // Texto: aplica 250 ms depois da última tecla para não reescrever a URL a cada letra.
  useEffect(() => {
    if (q === fromUrl.q) return;
    const t = setTimeout(() => apply({ ...fromUrl, q }), 250);
    return () => clearTimeout(t);
  }, [q]);

  function apply(next: CatalogFilters) {
    const qs = serializeFilters(next);
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  const results = filterGames(GAMES, { ...fromUrl, q });
  const active = serializeFilters({ ...fromUrl, q: '' }) !== '';

  return (
    <div className="mx-auto mt-8 max-w-7xl px-4 sm:px-6">
      <form role="search" onSubmit={(e) => { e.preventDefault(); apply({ ...fromUrl, q }); }} className="flex gap-2">
        <label className="relative flex-1">
          <span className="sr-only">Pesquisar jogos</span>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-faint" aria-hidden="true" />
          <input
            ref={input}
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            maxLength={80}
            placeholder="Nome, gênero ou desenvolvedora"
            className="field h-12 pl-11"
            enterKeyHint="search"
            autoComplete="off"
          />
        </label>
        <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-controls="filtros" className="btn btn-ghost h-12 md:hidden">
          <SlidersHorizontal className="h-5 w-5" aria-hidden="true" />
          <span className="sr-only">Filtros</span>
        </button>
      </form>

      <div id="filtros" className={`${open ? 'grid' : 'hidden'} mt-4 gap-3 sm:grid-cols-2 md:grid md:grid-cols-5`}>
        <Select label="Plataforma" value={fromUrl.platform ?? ''} onChange={(v) => apply({ ...fromUrl, q, platform: (v || null) as PlatformId | null })}
          options={PLATFORMS.map((p) => ({ value: p.id, label: p.name }))} />
        <Select label="Gênero" value={fromUrl.genre ?? ''} onChange={(v) => apply({ ...fromUrl, q, genre: v || null })}
          options={GENRES.map((g) => ({ value: g, label: g }))} />
        <Select label="Disponibilidade" value={fromUrl.availability ?? ''} onChange={(v) => apply({ ...fromUrl, q, availability: (v || null) as Availability | null })}
          options={(Object.keys(AVAILABILITY_LABEL) as Availability[]).map((a) => ({ value: a, label: AVAILABILITY_LABEL[a] }))} />
        <Select label="Controle" value={fromUrl.controller ?? ''} onChange={(v) => apply({ ...fromUrl, q, controller: (v || null) as ControllerSupport | null })}
          options={CONTROLLER_OPTIONS} />
        <label className="flex min-h-11 cursor-pointer items-center gap-3 self-end rounded-xl border border-line-strong px-3.5 py-2.5 text-sm">
          <input type="checkbox" checked={fromUrl.touch} onChange={(e) => apply({ ...fromUrl, q, touch: e.target.checked })} className="h-5 w-5 accent-[var(--color-violet)]" />
          Controles de toque
        </label>
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        <p className="text-sm text-muted" role="status" aria-live="polite">
          {results.length} {results.length === 1 ? 'jogo encontrado' : 'jogos encontrados'}
        </p>
        {(active || q) && (
          <button type="button" onClick={() => { setQ(''); apply(EMPTY_FILTERS); }} className="flex min-h-11 items-center gap-1.5 text-sm font-semibold text-cyan">
            <RotateCcw className="h-4 w-4" aria-hidden="true" /> Limpar filtros
          </button>
        )}
      </div>

      {results.length > 0 ? (
        <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {results.map((g) => <li key={g.slug}><GameCard game={g} /></li>)}
        </ul>
      ) : (
        <div className="mt-4">
          {fromUrl.availability === 'operacional' ? (
            <EmptyState icon={<Gamepad2 className="h-6 w-6" aria-hidden="true" />} title="Nenhum jogo disponível para jogar ainda">
              <p>O streaming próprio entra em teste na Fase 4. Enquanto isso, prepare seu controle e veja como seu aparelho se sai.</p>
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <Link href="/controle" className="btn btn-primary">Testar controle</Link>
                <Link href="/sala-de-teste" className="btn btn-ghost">Sala de teste</Link>
              </div>
            </EmptyState>
          ) : (
            <EmptyState icon={<Search className="h-6 w-6" aria-hidden="true" />} title="Nenhum jogo com esses filtros">
              Tente outro termo ou remova algum filtro.
            </EmptyState>
          )}
        </div>
      )}
    </div>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <label className="block text-xs font-semibold text-muted">
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)} className="field mt-1.5 appearance-none bg-[length:1rem] text-sm">
        <option value="">Todos</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}
