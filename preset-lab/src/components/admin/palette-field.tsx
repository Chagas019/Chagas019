"use client";
import { useState } from "react";
import { Plus, X } from "lucide-react";
import { FieldError, Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { useField } from "./admin-form";

const HEX = /^#[0-9a-fA-F]{6}$/;

/** Paleta de até 6 cores (#RRGGBB): seletor de cor + campo de texto. */
export function PaletteField({ name, label, defaultValue }: { name: string; label: string; defaultValue: string[] }) {
  const field = useField(name);
  const [colors, setColors] = useState(() => defaultValue.slice(0, 6).map((c, i) => ({ key: i, value: c })));
  const [next, setNext] = useState(defaultValue.length);
  const set = (key: number, value: string) => setColors((l) => l.map((c) => (c.key === key ? { ...c, value } : c)));
  return (
    <fieldset aria-describedby={field.error ? field.errorId : undefined}>
      <legend className="lab-label mb-2 text-ash">{label}</legend>
      <div className="flex flex-wrap gap-3">
        {colors.map((c, i) => (
          <div key={c.key} className="flex items-center gap-2 rounded-xl border hairline bg-graphite p-1.5 pr-2">
            <input
              type="color"
              aria-label={`Cor ${i + 1}`}
              value={HEX.test(c.value) ? c.value.toLowerCase() : "#000000"}
              onChange={(e) => set(c.key, e.target.value.toUpperCase())}
              className="size-9 cursor-pointer rounded-lg border-0 bg-transparent p-0"
            />
            <Input name={name} value={c.value} onChange={(e) => set(c.key, e.target.value)} aria-label={`Código da cor ${i + 1}`} aria-invalid={!HEX.test(c.value)} className="h-9 w-28 rounded-lg px-2 font-mono text-sm uppercase" maxLength={7} />
            <button type="button" onClick={() => setColors((l) => l.filter((x) => x.key !== c.key))} aria-label={`Remover cor ${i + 1}`} className="grid size-7 place-items-center rounded-full text-smoke hover:bg-bone/10 hover:text-bone">
              <X className="size-3.5" />
            </button>
          </div>
        ))}
        {colors.length < 6 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-12 rounded-xl"
            onClick={() => {
              setColors((l) => [...l, { key: next, value: "#FF5A1F" }]);
              setNext((n) => n + 1);
            }}
          >
            <Plus aria-hidden /> Cor
          </Button>
        )}
      </div>
      <p className="mt-1.5 text-xs text-smoke">Até 6 cores no formato #RRGGBB.</p>
      <FieldError id={field.errorId}>{field.error}</FieldError>
    </fieldset>
  );
}
