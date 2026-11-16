import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const controlBase =
  "w-full rounded-xl border bg-surface-muted px-3.5 text-[0.95rem] text-ink transition-colors placeholder:text-ink-subtle hover:border-border-strong focus-visible:border-gold-400 focus-visible:outline-3 focus-visible:outline-offset-1 focus-visible:outline-gold-400/70 disabled:cursor-not-allowed disabled:bg-surface-muted";

export function controlClass(invalid?: boolean, extra?: string) {
  return cn(controlBase, invalid ? "border-danger" : "border-border", extra);
}

interface FieldShellProps {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  optionalLabel?: string;
  children: (ids: { id: string; describedBy?: string; invalid: boolean }) => ReactNode;
  className?: string;
}

/** Envolve um controle com rótulo, dica e erro conectados via aria-describedby. */
export function Field({ label, hint, error, required, optionalLabel, children, className }: FieldShellProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-semibold text-ink">
        {label}
        {required ? <span aria-hidden className="ml-0.5 text-danger">*</span> : null}
        {!required && optionalLabel ? <span className="ml-1.5 text-xs font-normal text-ink-subtle">({optionalLabel})</span> : null}
      </label>
      {children({ id, describedBy, invalid: Boolean(error) })}
      {hint ? <p id={hintId} className="text-xs leading-relaxed text-ink-muted">{hint}</p> : null}
      {error ? <p id={errorId} className="text-xs font-semibold text-danger">{error}</p> : null}
    </div>
  );
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean };
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ className, invalid, ...props }, ref) {
  return <input ref={ref} aria-invalid={invalid || undefined} className={controlClass(invalid, cn("h-11", className))} {...props} />;
});

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean };
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea({ className, invalid, rows = 4, ...props }, ref) {
  return <textarea ref={ref} rows={rows} aria-invalid={invalid || undefined} className={controlClass(invalid, cn("py-2.5 leading-relaxed", className))} {...props} />;
});

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean };
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select({ className, invalid, children, ...props }, ref) {
  return (
    <select ref={ref} aria-invalid={invalid || undefined} className={controlClass(invalid, cn("select-chevron h-11 appearance-none pr-10", className))} {...props}>
      {children}
    </select>
  );
});

interface ChoiceGroupProps {
  legend: string;
  name: string;
  type?: "checkbox" | "radio";
  options: ReadonlyArray<{ value: string; label: string }>;
  defaultValue?: readonly string[];
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
}

/** Grupo de opções em "chips" acessíveis (inputs nativos visíveis ao teclado e leitor de tela). */
export function ChoiceGroup({ legend, name, type = "checkbox", options, defaultValue = [], error, hint, required, className }: ChoiceGroupProps) {
  const id = useId();
  const describedBy = [hint ? `${id}-hint` : "", error ? `${id}-error` : ""].filter(Boolean).join(" ") || undefined;
  return (
    <fieldset className={cn("flex flex-col gap-2", className)} aria-describedby={describedBy} aria-invalid={error ? true : undefined}>
      <legend className="mb-1 text-sm font-semibold text-ink">
        {legend}
        {required ? <span aria-hidden className="ml-0.5 text-danger">*</span> : null}
      </legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <label key={o.value} className="group relative cursor-pointer">
            <input
              type={type}
              name={name}
              value={o.value}
              defaultChecked={defaultValue.includes(o.value)}
              className="peer absolute inset-0 cursor-pointer opacity-0"
            />
            <span className="inline-flex min-h-10 items-center rounded-full border border-border bg-surface px-4 text-sm text-ink transition-colors group-hover:border-navy-400 peer-checked:border-navy-500 peer-checked:bg-navy-600 peer-checked:text-white peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-gold-400">
              {o.label}
            </span>
          </label>
        ))}
      </div>
      {hint ? <p id={`${id}-hint`} className="text-xs text-ink-muted">{hint}</p> : null}
      {error ? <p id={`${id}-error`} className="text-xs font-semibold text-danger">{error}</p> : null}
    </fieldset>
  );
}

export function Checkbox({ name, label, defaultChecked, error, required }: { name: string; label: ReactNode; defaultChecked?: boolean; error?: string; required?: boolean }) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-start gap-3">
        <input
          id={id}
          type="checkbox"
          name={name}
          defaultChecked={defaultChecked}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className="mt-0.5 size-5 shrink-0 cursor-pointer rounded border-border accent-gold-400"
        />
        <label htmlFor={id} className="text-sm leading-relaxed text-ink">{label}</label>
      </div>
      {error ? <p id={`${id}-error`} className="pl-8 text-xs font-semibold text-danger">{error}</p> : null}
    </div>
  );
}
