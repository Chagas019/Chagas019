import * as React from "react";
import { FieldError, Input, Label, Textarea } from "@/components/ui/field";

type Common = { name: string; label: string; error?: string; hint?: React.ReactNode };

/** Campo de texto com rótulo, dica e erro acessíveis (aria-invalid + aria-describedby). */
export function TextField({ name, label, error, hint, id, ...props }: Common & React.InputHTMLAttributes<HTMLInputElement>) {
  const fid = id ?? `f-${name}`;
  const describedBy = [hint ? `${fid}-hint` : null, error ? `${fid}-err` : null].filter(Boolean).join(" ") || undefined;
  return (
    <div>
      <Label htmlFor={fid}>{label}</Label>
      <Input id={fid} name={name} aria-invalid={error ? true : undefined} aria-describedby={describedBy} {...props} />
      {hint && (
        <p id={`${fid}-hint`} className="mt-2 text-xs leading-relaxed text-smoke">
          {hint}
        </p>
      )}
      <FieldError id={`${fid}-err`}>{error}</FieldError>
    </div>
  );
}

export function TextAreaField({ name, label, error, hint, id, ...props }: Common & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const fid = id ?? `f-${name}`;
  const describedBy = [hint ? `${fid}-hint` : null, error ? `${fid}-err` : null].filter(Boolean).join(" ") || undefined;
  return (
    <div>
      <Label htmlFor={fid}>{label}</Label>
      <Textarea id={fid} name={name} aria-invalid={error ? true : undefined} aria-describedby={describedBy} {...props} />
      {hint && (
        <p id={`${fid}-hint`} className="mt-2 text-xs leading-relaxed text-smoke">
          {hint}
        </p>
      )}
      <FieldError id={`${fid}-err`}>{error}</FieldError>
    </div>
  );
}
