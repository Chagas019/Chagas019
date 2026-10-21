import { useId, type ReactElement, cloneElement } from 'react';

/** Dica que aparece no hover E no foco do teclado (não esconde funções: o rótulo também está em aria-label). */
export function Tooltip({ label, children, side = 'top' }: { label: string; children: ReactElement<Record<string, unknown>>; side?: 'top' | 'bottom' }) {
  const id = useId();
  return (
    <span className="group/tt relative inline-flex">
      {cloneElement(children, { 'aria-describedby': id })}
      <span
        id={id}
        role="tooltip"
        className={`pointer-events-none absolute left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-sm border border-white/10 bg-ink px-2 py-1 font-mono text-[10.5px] uppercase tracking-wider text-paper opacity-0 transition group-focus-within/tt:opacity-100 group-hover/tt:opacity-100 ${side === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'}`}
      >
        {label}
      </span>
    </span>
  );
}
