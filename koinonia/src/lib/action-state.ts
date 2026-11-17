export type FieldErrors = Record<string, string>;

/** Estado retornado por Server Actions para formulários (mensagens já traduzidas). */
export interface ActionState {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: FieldErrors;
  /** valores enviados, para repopular o formulário após erro (nunca inclui senhas) */
  values?: Record<string, string | string[]>;
}

export const idleState: ActionState = { status: "idle" };
