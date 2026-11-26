"use client";
import { startTransition, useActionState, useEffect, useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import type { ActionState } from "@/components/forms/form-message";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Action = (state: ActionState, form: FormData) => Promise<ActionState>;

/**
 * Botão de ação rápida (publicar, destacar, excluir...). Com `confirm`, exige um
 * segundo clique em "Confirmar" antes de executar.
 */
export function InlineAction({
  action,
  fields,
  children,
  confirm,
  confirmText,
  variant = "outline",
  size = "sm",
  className,
  showMessage,
}: {
  action: Action;
  fields: Record<string, string>;
  children: ReactNode;
  confirm?: string;
  confirmText?: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
  showMessage?: boolean;
}) {
  const [state, dispatch, pending] = useActionState(action, undefined);
  const [asking, setAsking] = useState(false);
  useEffect(() => {
    if (state) setAsking(false);
  }, [state]);

  const run = () => {
    const fd = new FormData();
    for (const [k, v] of Object.entries(fields)) fd.set(k, v);
    startTransition(() => dispatch(fd));
  };

  return (
    <div className={cn("inline-flex flex-col items-start gap-1", className)}>
      {asking ? (
        <div role="group" aria-label="Confirmação" className="flex flex-wrap items-center gap-2 rounded-2xl border border-danger/40 bg-danger/5 p-2">
          {confirmText && <span className="px-1 text-xs text-ash">{confirmText}</span>}
          <Button type="button" variant="danger" size={size} onClick={run} disabled={pending} aria-busy={pending}>
            {pending && <Loader2 className="animate-spin" aria-hidden />}
            {confirm}
          </Button>
          <Button type="button" variant="ghost" size={size} onClick={() => setAsking(false)} disabled={pending}>
            Cancelar
          </Button>
        </div>
      ) : (
        <Button type="button" variant={variant} size={size} onClick={() => (confirm ? setAsking(true) : run())} disabled={pending} aria-busy={pending}>
          {pending && <Loader2 className="animate-spin" aria-hidden />}
          {children}
        </Button>
      )}
      {state?.error && (
        <p role="alert" className="max-w-xs text-xs text-danger">
          {state.error}
        </p>
      )}
      {showMessage && state?.message && !state.error && (
        <p role="status" className="max-w-xs text-xs text-ok">
          {state.message}
        </p>
      )}
    </div>
  );
}
