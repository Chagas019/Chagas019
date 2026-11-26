"use client";
import { createContext, startTransition, useActionState, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { FormMessage, type ActionState } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";
import { FieldError, Input, Label, Select, Textarea } from "@/components/ui/field";
import type { ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Action = (state: ActionState, form: FormData) => Promise<ActionState>;

const Ctx = createContext<{ state: ActionState; pending: boolean; formId: string }>({ state: undefined, pending: false, formId: "" });
export const useAdminForm = () => useContext(Ctx);

/**
 * Formulário do Admin Studio: useActionState + envio sem o reset automático do React 19
 * (para não perder o que foi digitado quando a validação no servidor falha).
 */
export function AdminForm({ action, children, className, id, resetOnSuccess }: { action: Action; children: ReactNode; className?: string; id: string; resetOnSuccess?: boolean }) {
  const [state, dispatch, pending] = useActionState(action, undefined);
  const ref = useRef<HTMLFormElement>(null);
  const [resetKey, setResetKey] = useState(0);
  useEffect(() => {
    if (state?.ok && resetOnSuccess) {
      ref.current?.reset();
      setResetKey((k) => k + 1);
    }
  }, [state, resetOnSuccess]);
  return (
    <Ctx.Provider value={{ state, pending, formId: id }}>
      <form
        ref={ref}
        id={id}
        noValidate
        className={className}
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          startTransition(() => dispatch(fd));
        }}
      >
        <div key={resetKey} className="contents">
          {children}
        </div>
      </form>
    </Ctx.Provider>
  );
}

export function AdminFormMessage({ className }: { className?: string }) {
  const { state } = useAdminForm();
  return <FormMessage state={state} className={className} />;
}

export function AdminSubmit({ children, pendingLabel = "Salvando…", ...props }: ButtonProps & { pendingLabel?: string }) {
  const { pending } = useAdminForm();
  return (
    <SubmitButton disabled={pending} aria-busy={pending} {...props}>
      {pending ? pendingLabel : children}
    </SubmitButton>
  );
}

/** ids e atributos de acessibilidade de um campo. */
export function useField(name: string) {
  const { state, formId } = useAdminForm();
  const id = `${formId}-${name}`;
  const error = state?.fieldErrors?.[name];
  return { id, error, errorId: `${id}-erro`, hintId: `${id}-dica` };
}

function Shell({ name, label, hint, className, children }: { name: string; label: string; hint?: string; className?: string; children: (a: { id: string; describedBy?: string; invalid: boolean }) => ReactNode }) {
  const { id, error, errorId, hintId } = useField(name);
  const describedBy = [hint ? hintId : "", error ? errorId : ""].filter(Boolean).join(" ") || undefined;
  return (
    <div className={className}>
      <Label htmlFor={id}>{label}</Label>
      {children({ id, describedBy, invalid: !!error })}
      {hint && (
        <p id={hintId} className="mt-1.5 text-xs text-smoke">
          {hint}
        </p>
      )}
      <FieldError id={errorId}>{error}</FieldError>
    </div>
  );
}

type Common = { name: string; label: string; hint?: string; className?: string };

export function TextField({ name, label, hint, className, ...rest }: Common & Omit<React.InputHTMLAttributes<HTMLInputElement>, "name">) {
  return (
    <Shell name={name} label={label} hint={hint} className={className}>
      {(a) => <Input id={a.id} name={name} aria-invalid={a.invalid} aria-describedby={a.describedBy} {...rest} />}
    </Shell>
  );
}

export function TextAreaField({ name, label, hint, className, ...rest }: Common & Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "name">) {
  return (
    <Shell name={name} label={label} hint={hint} className={className}>
      {(a) => <Textarea id={a.id} name={name} aria-invalid={a.invalid} aria-describedby={a.describedBy} {...rest} />}
    </Shell>
  );
}

export function SelectField({ name, label, hint, className, options, ...rest }: Common & { options: { value: string; label: string }[] } & Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "name">) {
  return (
    <Shell name={name} label={label} hint={hint} className={className}>
      {(a) => (
        <Select id={a.id} name={name} aria-invalid={a.invalid} aria-describedby={a.describedBy} {...rest}>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      )}
    </Shell>
  );
}

export function CheckboxField({ name, label, hint, className, defaultChecked, value }: Common & { defaultChecked?: boolean; value?: string }) {
  const { id, error, errorId, hintId } = useField(name);
  return (
    <div className={className}>
      <label htmlFor={id} className="flex cursor-pointer items-start gap-3 rounded-xl border hairline bg-graphite px-4 py-3 transition hover:border-bone/30">
        <input id={id} type="checkbox" name={name} value={value} defaultChecked={defaultChecked} aria-describedby={hint ? hintId : undefined} className="mt-0.5 size-4 accent-[var(--color-signal)]" />
        <span>
          <span className="block text-sm text-bone">{label}</span>
          {hint && (
            <span id={hintId} className="mt-0.5 block text-xs text-smoke">
              {hint}
            </span>
          )}
        </span>
      </label>
      <FieldError id={errorId}>{error}</FieldError>
    </div>
  );
}

/** Grupo de checkboxes com o mesmo nome (tags, produtos de uma coleção...). */
export function CheckboxGroup({ name, legend, options, defaultValues, className, hint }: { name: string; legend: string; options: { value: string; label: string; meta?: string }[]; defaultValues: string[]; className?: string; hint?: string }) {
  const { id, error, errorId } = useField(name);
  const chosen = new Set(defaultValues);
  return (
    <fieldset className={className} aria-describedby={error ? errorId : undefined}>
      <legend className="lab-label mb-2 text-ash">{legend}</legend>
      {hint && <p className="-mt-1 mb-2 text-xs text-smoke">{hint}</p>}
      {options.length === 0 ? (
        <p className="text-sm text-smoke">Nada cadastrado ainda.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {options.map((o, i) => (
            <label key={o.value} htmlFor={`${id}-${i}`} className="flex cursor-pointer items-center gap-2 rounded-full border hairline px-3 py-1.5 text-sm text-ash transition hover:border-bone/40 has-[:checked]:border-signal has-[:checked]:text-bone">
              <input id={`${id}-${i}`} type="checkbox" name={name} value={o.value} defaultChecked={chosen.has(o.value)} className="size-3.5 accent-[var(--color-signal)]" />
              {o.label}
              {o.meta && <span className="lab-label text-smoke">{o.meta}</span>}
            </label>
          ))}
        </div>
      )}
      <FieldError id={errorId}>{error}</FieldError>
    </fieldset>
  );
}

export function FormSection({ title, description, children, className }: { title: string; description?: string; children: ReactNode; className?: string }) {
  return (
    <section className={cn("grid grid-cols-1 gap-6 border-t hairline py-8 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-10", className)}>
      <div>
        <h2 className="lab-label text-bone">{title}</h2>
        {description && <p className="mt-2 text-sm leading-relaxed text-smoke">{description}</p>}
      </div>
      <div className="grid grid-cols-1 min-w-0 gap-5">{children}</div>
    </section>
  );
}
