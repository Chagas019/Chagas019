"use client";
import Link from "next/link";
import { useActionState } from "react";
import { ArrowRight } from "lucide-react";
import { requestResetAction, signInAction, signUpAction, updatePasswordAction } from "@/app/actions/auth";
import { FormMessage, type ActionState } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";
import { TextField } from "./text-field";

type Action = (prev: ActionState, form: FormData) => Promise<ActionState>;
type WithValues = (NonNullable<ActionState> & { values?: Record<string, string> }) | undefined;

/**
 * useActionState que lembra os valores digitados (exceto senhas): o React 19 reseta o
 * formulário após a action, e sem isso o usuário perderia o que digitou ao ver um erro.
 */
function useFormAction(fn: Action, keep: string[]) {
  return useActionState<WithValues, FormData>(async (prev, form) => {
    const res = await fn(prev, form);
    return { ...res, values: Object.fromEntries(keep.map((k) => [k, String(form.get(k) ?? "")])) };
  }, undefined);
}

export function SignInForm({ next }: { next: string }) {
  const [state, action] = useFormAction(signInAction, ["email"]);
  const fe = state?.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-5" noValidate>
      <input type="hidden" name="next" value={next} />
      <FormMessage state={state} />
      <TextField name="email" label="E-mail" defaultValue={state?.values?.email} type="email" autoComplete="email" inputMode="email" required error={fe.email} />
      <div>
        <TextField name="password" label="Senha" type="password" autoComplete="current-password" required error={fe.password} />
        <div className="mt-3 text-right">
          <Link href="/recuperar-senha" className="link-underline inline-flex min-h-11 items-center text-sm text-ash hover:text-bone">
            Esqueci minha senha
          </Link>
        </div>
      </div>
      <SubmitButton size="lg" className="w-full" pendingLabel="Entrando…">
        Entrar <ArrowRight />
      </SubmitButton>
    </form>
  );
}

export function SignUpForm() {
  const [state, action] = useFormAction(signUpAction, ["displayName", "email"]);
  const fe = state?.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-5" noValidate>
      <FormMessage state={state} />
      <TextField name="displayName" label="Nome" defaultValue={state?.values?.displayName} autoComplete="name" required maxLength={80} error={fe.displayName} />
      <TextField name="email" label="E-mail" defaultValue={state?.values?.email} type="email" autoComplete="email" inputMode="email" required error={fe.email} />
      <TextField name="password" label="Senha" type="password" autoComplete="new-password" required minLength={8} error={fe.password} hint="Mínimo de 8 caracteres, com pelo menos uma letra e um número." />
      <SubmitButton size="lg" className="w-full" pendingLabel="Criando conta…">
        Criar conta <ArrowRight />
      </SubmitButton>
      <p className="text-xs leading-relaxed text-smoke">Vamos enviar um link de confirmação para o seu e-mail. Você só consegue entrar depois de confirmar.</p>
    </form>
  );
}

export function ResetRequestForm() {
  const [state, action] = useFormAction(requestResetAction, ["email"]);
  const fe = state?.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-5" noValidate>
      <FormMessage state={state} />
      <TextField name="email" label="E-mail da conta" defaultValue={state?.values?.email} type="email" autoComplete="email" inputMode="email" required error={fe.email} />
      <SubmitButton size="lg" className="w-full" pendingLabel="Enviando…">
        Enviar link de recuperação
      </SubmitButton>
    </form>
  );
}

export function UpdatePasswordForm() {
  const [state, action] = useFormAction(updatePasswordAction, []);
  const fe = state?.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-5" noValidate>
      <FormMessage state={state} />
      <TextField name="password" label="Nova senha" type="password" autoComplete="new-password" required minLength={8} error={fe.password} hint="Mínimo de 8 caracteres, com pelo menos uma letra e um número." />
      <TextField name="confirm" label="Repita a nova senha" type="password" autoComplete="new-password" required error={fe.confirm} />
      <SubmitButton size="lg" className="w-full" pendingLabel="Salvando…">
        Salvar nova senha
      </SubmitButton>
    </form>
  );
}
