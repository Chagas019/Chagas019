"use client";

import { cn } from "@/lib/utils";

export function ChipGroup<T extends string>({
  options,
  value,
  onChange,
  max,
  label,
}: {
  options: readonly { slug: T; label: string }[];
  value: T[];
  onChange: (v: T[]) => void;
  max?: number;
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = value.includes(o.slug);
        return (
          <button
            key={o.slug}
            type="button"
            aria-pressed={active}
            onClick={() => {
              if (active) onChange(value.filter((v) => v !== o.slug));
              else if (!max || value.length < max) onChange([...value, o.slug]);
            }}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-sm transition-all duration-200",
              active ? "bg-paper text-ink-950" : "bg-ink-800 text-fog-300 ring-1 ring-inset ring-ink-700 hover:text-paper hover:ring-ink-600",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
