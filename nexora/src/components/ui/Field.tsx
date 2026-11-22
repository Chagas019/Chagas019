import { useId, type ReactNode } from 'react';

/** Label + controle + mensagem de erro ligados por id (aria-describedby / aria-invalid). */
export function Field({ label, error, hint, children, className = '' }: { label: string; error?: string; hint?: string; className?: string; children: (props: { id: string; 'aria-invalid': boolean; 'aria-describedby'?: string }) => ReactNode }) {
  const id = useId();
  const desc = error ? `${id}-e` : hint ? `${id}-h` : undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className="field-label">{label}</label>
      {children({ id, 'aria-invalid': !!error, 'aria-describedby': desc })}
      {error ? <p id={`${id}-e`} className="field-error">{error}</p> : hint ? <p id={`${id}-h`} className="mt-1.5 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}
