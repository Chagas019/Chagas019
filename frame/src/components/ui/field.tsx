import { forwardRef, useId, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const control =
  "w-full rounded-[var(--radius-sm)] bg-ink-850 px-3.5 text-[15px] text-paper placeholder:text-fog-500 ring-1 ring-inset ring-ink-700 transition-shadow hover:ring-ink-600 focus:outline-none focus:ring-2 focus:ring-volt-500 aria-[invalid=true]:ring-danger-500";

export function Field({
  label,
  hint,
  error,
  children,
  id,
  optional,
}: {
  label: string;
  hint?: string;
  error?: string;
  id: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="flex items-baseline justify-between text-sm font-medium text-fog-200">
        {label}
        {optional ? <span className="text-xs font-normal text-fog-500">opcional</span> : null}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-sm text-danger-400">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-fog-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(function Input(
  { className, invalid, ...rest },
  ref,
) {
  return <input ref={ref} aria-invalid={invalid || undefined} className={cn(control, "h-11", className)} {...rest} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }>(function Textarea(
  { className, invalid, ...rest },
  ref,
) {
  return <textarea ref={ref} aria-invalid={invalid || undefined} className={cn(control, "min-h-24 py-2.5 leading-relaxed", className)} {...rest} />;
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, ...rest }, ref) {
  return <select ref={ref} className={cn(control, "h-11 appearance-none pr-8", className)} {...rest} />;
});

export function useFieldId(prefix: string) {
  return `${prefix}-${useId().replace(/:/g, "")}`;
}

export function Switch({
  checked,
  onChange,
  label,
  description,
  name,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
  name?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 py-2">
      <span>
        <span className="block text-sm font-medium text-fog-200">{label}</span>
        {description ? <span className="mt-0.5 block text-xs text-fog-500">{description}</span> : null}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        name={name}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 h-6 w-10 shrink-0 rounded-full transition-colors",
          checked ? "bg-volt-500" : "bg-ink-600",
        )}
      >
        <span className={cn("absolute top-0.5 size-5 rounded-full bg-white transition-transform", checked ? "translate-x-[18px]" : "translate-x-0.5")} />
      </button>
    </label>
  );
}
