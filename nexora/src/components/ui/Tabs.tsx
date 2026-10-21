import { useRef, type KeyboardEvent } from 'react';

export interface TabDef { id: string; label: string; disabled?: boolean; badge?: string }

/** Abas acessíveis (setas, Home/End). O conteúdo de cada painel é renderizado por quem usa. */
export function Tabs({ tabs, active, onChange, label, idPrefix }: { tabs: TabDef[]; active: string; onChange: (id: string) => void; label: string; idPrefix: string }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const enabled = tabs.filter((t) => !t.disabled);
  const onKey = (e: KeyboardEvent) => {
    const i = enabled.findIndex((t) => t.id === active);
    let next = -1;
    if (e.key === 'ArrowRight') next = (i + 1) % enabled.length;
    if (e.key === 'ArrowLeft') next = (i - 1 + enabled.length) % enabled.length;
    if (e.key === 'Home') next = 0;
    if (e.key === 'End') next = enabled.length - 1;
    if (next < 0) return;
    e.preventDefault();
    onChange(enabled[next].id);
    refs.current[tabs.indexOf(enabled[next])]?.focus();
  };
  return (
    <div role="tablist" aria-label={label} onKeyDown={onKey} className="no-scrollbar -mx-5 flex gap-1 overflow-x-auto px-5 md:mx-0 md:px-0">
      {tabs.map((t, i) => {
        const sel = t.id === active;
        return (
          <button
            key={t.id}
            ref={(el) => { refs.current[i] = el; }}
            role="tab"
            type="button"
            id={`${idPrefix}-tab-${t.id}`}
            aria-selected={sel}
            aria-controls={`${idPrefix}-panel-${t.id}`}
            tabIndex={sel ? 0 : -1}
            disabled={t.disabled}
            onClick={() => onChange(t.id)}
            className={`relative min-h-[44px] shrink-0 whitespace-nowrap px-4 text-sm transition disabled:opacity-40 ${sel ? 'text-fg' : 'text-muted hover:text-fg'}`}
          >
            {t.label}
            {t.badge && <span className="ml-1.5 rounded-sm bg-fg/10 px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider">{t.badge}</span>}
            <span className={`absolute inset-x-3 -bottom-px h-px transition ${sel ? 'bg-signal' : 'bg-transparent'}`} />
          </button>
        );
      })}
    </div>
  );
}
