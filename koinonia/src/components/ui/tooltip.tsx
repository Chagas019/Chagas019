import { useId, type ReactNode } from "react";

/** Dica acessível: aparece no hover e no foco do teclado, ligada por aria-describedby. */
export function Tooltip({ content, children }: { content: string; children: ReactNode }) {
  const id = useId();
  return (
    <span className="group/tt relative inline-flex">
      <span tabIndex={0} aria-describedby={id} className="inline-flex rounded-md">{children}</span>
      <span
        role="tooltip"
        id={id}
        className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 w-max max-w-56 -translate-x-1/2 translate-y-1 rounded-md border border-neon-400/30 bg-night-950 px-2.5 py-1.5 text-xs text-ink opacity-0 shadow-soft transition duration-150 group-hover/tt:translate-y-0 group-hover/tt:opacity-100 group-focus-within/tt:translate-y-0 group-focus-within/tt:opacity-100"
      >
        {content}
      </span>
    </span>
  );
}
