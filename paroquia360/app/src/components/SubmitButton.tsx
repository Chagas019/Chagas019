'use client';
import { useFormStatus } from 'react-dom';

/** Botão de envio que trava enquanto o formulário está sendo enviado (evita clique duplo). */
export function SubmitButton({ children, pending, className = 'btn primary block' }: { children: React.ReactNode; pending: string; className?: string }) {
  const { pending: busy } = useFormStatus();
  return <button className={className} type="submit" disabled={busy} aria-disabled={busy}>{busy ? pending : children}</button>;
}
