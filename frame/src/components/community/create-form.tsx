"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ChipGroup } from "@/components/ui/chips";
import { Field, Input, Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { createCommunityAction } from "@/server/actions/community";
import { CATEGORIES, type CategorySlug } from "@/lib/taxonomy";
import { cn } from "@/lib/utils";

export function CreateCommunityForm() {
  const router = useRouter();
  const toast = useToast();
  const [access, setAccess] = useState<"public" | "private" | "invite">("public");
  const [categories, setCategories] = useState<CategorySlug[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(async () => {
          const r = await createCommunityAction({ name: fd.get("name"), description: fd.get("description"), rules: fd.get("rules"), categories, access });
          if (!r.ok) {
            setErrors(r.fields ?? {});
            return toast.show(r.error, "error");
          }
          toast.show(r.message ?? "Criada.");
          router.push(`/comunidades/${r.data.slug}`);
        });
      }}
    >
      <Field label="Nome" id="name" error={errors.name}>
        <Input id="name" name="name" maxLength={80} required />
      </Field>
      <Field label="Descrição" id="description" optional>
        <Textarea id="description" name="description" maxLength={1000} rows={3} />
      </Field>
      <Field label="Regras" id="rules" optional hint="Uma por linha. Ex.: Dê crédito a quem participou. Críticas com respeito.">
        <Textarea id="rules" name="rules" maxLength={3000} rows={5} />
      </Field>
      <div className="space-y-2">
        <p className="text-sm font-medium text-fog-200">Temas</p>
        <ChipGroup label="Temas" options={CATEGORIES} value={categories} onChange={setCategories} max={5} />
      </div>
      <div role="radiogroup" aria-label="Acesso" className="grid gap-2 sm:grid-cols-3">
        {(
          [
            { v: "public", t: "Pública", d: "Qualquer pessoa vê e entra" },
            { v: "private", t: "Privada", d: "Aparece na busca; a administração aprova a entrada" },
            { v: "invite", t: "Por convite", d: "Oculta; só entra quem tem o link" },
          ] as const
        ).map((o) => (
          <button key={o.v} type="button" role="radio" aria-checked={access === o.v} onClick={() => setAccess(o.v)} className={cn("rounded-[var(--radius-md)] p-3 text-left ring-1 ring-inset", access === o.v ? "bg-volt-500/10 ring-volt-500" : "bg-ink-850 ring-ink-700")}>
            <span className="block text-sm font-medium">{o.t}</span>
            <span className="text-xs text-fog-500">{o.d}</span>
          </button>
        ))}
      </div>
      <Button type="submit" size="lg" loading={pending}>
        Criar comunidade
      </Button>
    </form>
  );
}
