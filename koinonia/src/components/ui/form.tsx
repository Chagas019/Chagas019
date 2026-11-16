"use client";

import { useFormStatus } from "react-dom";
import type { ActionState } from "@/lib/action-state";
import { Alert } from "./alert";
import { Button, type ButtonProps } from "./button";

/** Botão de envio que reflete o estado pendente do formulário (Server Action). */
export function SubmitButton({ children, pendingLabel, ...props }: ButtonProps & { pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending} loadingLabel={pendingLabel} {...props}>
      {pending ? pendingLabel : children}
    </Button>
  );
}

/** Mensagem geral do formulário, anunciada para leitores de tela. */
export function FormMessage({ state }: { state: ActionState }) {
  if (state.status === "idle" || !state.message) return null;
  return (
    <Alert tone={state.status === "success" ? "success" : "danger"} live={state.status === "error" ? "assertive" : "polite"}>
      {state.message}
    </Alert>
  );
}

/** Lê um valor previamente enviado (para repopular após erro). */
export function prev(state: ActionState, key: string, fallback = ""): string {
  const v = state.values?.[key];
  return typeof v === "string" ? v : fallback;
}

export function prevList(state: ActionState, key: string, fallback: readonly string[] = []): readonly string[] {
  const v = state.values?.[key];
  return Array.isArray(v) ? v : fallback;
}
