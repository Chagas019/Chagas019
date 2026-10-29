"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";

export type CreditDraft = { name: string; role: string; handle?: string };

/** Quem participou do projeto: fotógrafo, editor, modelo, designer, direção… Marcar o @ avisa a pessoa. */
export function CreditsEditor({ value, onChange, error }: { value: CreditDraft[]; onChange: (v: CreditDraft[]) => void; error?: string }) {
  const set = (i: number, patch: Partial<CreditDraft>) => onChange(value.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  return (
    <div className="space-y-2">
      <div>
        <p className="text-sm font-medium text-fog-200">Créditos e colaboradores</p>
        <p className="text-xs text-fog-500">Marque perfis do FRAME com @usuário — a pessoa recebe um aviso e o crédito vira link.</p>
      </div>
      {value.map((c, i) => (
        <div key={i} className="flex flex-col gap-2 rounded-[var(--radius-sm)] bg-ink-850 p-2 sm:flex-row sm:bg-transparent sm:p-0">
          <Input aria-label={`Nome do crédito ${i + 1}`} placeholder="Nome" value={c.name} maxLength={80} onChange={(e) => set(i, { name: e.target.value })} />
          <Input aria-label={`Função do crédito ${i + 1}`} placeholder="Função (edição, modelo…)" value={c.role} maxLength={60} onChange={(e) => set(i, { role: e.target.value })} />
          <Input aria-label={`Perfil no FRAME do crédito ${i + 1}`} placeholder="@usuario (opcional)" value={c.handle ? `@${c.handle}` : ""} maxLength={31} onChange={(e) => set(i, { handle: e.target.value.replace(/^@/, "").toLowerCase().trim() })} />
          <Button type="button" variant="ghost" size="icon" aria-label={`Remover crédito ${i + 1}`} onClick={() => onChange(value.filter((_, j) => j !== i))} className="self-end sm:self-auto">
            <Trash2 className="size-4" />
          </Button>
        </div>
      ))}
      {error ? <p role="alert" className="text-sm text-danger-400">{error}</p> : null}
      {value.length < 20 ? (
        <Button type="button" variant="outline" size="sm" onClick={() => onChange([...value, { name: "", role: "" }])}>
          <Plus className="size-4" aria-hidden /> Adicionar colaborador
        </Button>
      ) : null}
    </div>
  );
}

export function cleanCredits(v: CreditDraft[]) {
  return v.filter((c) => c.name.trim() && c.role.trim()).map((c) => ({ name: c.name.trim(), role: c.role.trim(), handle: c.handle || "" }));
}
