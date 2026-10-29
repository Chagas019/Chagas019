"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChipGroup } from "@/components/ui/chips";
import { Field, Input } from "@/components/ui/field";
import { completeOnboardingAction } from "@/server/actions/profile";
import { CATEGORIES, SPECIALTIES, type CategorySlug } from "@/lib/taxonomy";

const specialtyOptions = SPECIALTIES.map((s) => ({ slug: s, label: s }));

export function OnboardingForm({ defaults }: { defaults: { handle: string; displayName: string } }) {
  const router = useRouter();
  const [interests, setInterests] = useState<CategorySlug[]>([]);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();

  return (
    <form
      className="space-y-10"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(async () => {
          const r = await completeOnboardingAction({
            handle: String(fd.get("handle")),
            displayName: String(fd.get("displayName")),
            interests,
            specialties,
          });
          if (!r.ok) return setErrors({ ...(r.fields ?? {}), form: r.error });
          router.push("/onboarding/primeiros-passos");
          router.refresh();
        });
      }}
    >
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-fog-400">1 · Quem é você</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nome de exibição" id="displayName" error={errors.displayName}>
            <Input id="displayName" name="displayName" defaultValue={defaults.displayName} required />
          </Field>
          <Field label="Identificador" id="handle" error={errors.handle} hint="Seu endereço: frame/u/identificador">
            <Input id="handle" name="handle" defaultValue={defaults.handle} autoCapitalize="none" spellCheck={false} required />
          </Field>
        </div>
      </section>
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-fog-400">2 · O que inspira você</h2>
        <p className="text-sm text-fog-500">Escolha pelo menos um. Usamos isso para montar seu feed — você pode mudar quando quiser.</p>
        <ChipGroup label="Interesses" options={CATEGORIES} value={interests} onChange={setInterests} />
        {errors.interests ? <p className="text-sm text-danger-400">{errors.interests}</p> : null}
      </section>
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-fog-400">3 · O que você faz</h2>
        <p className="text-sm text-fog-500">Opcional. Ajuda outras pessoas a encontrar você para colaborações.</p>
        <ChipGroup label="Especialidades" options={specialtyOptions} value={specialties} onChange={setSpecialties} max={6} />
      </section>
      {errors.form ? <p role="alert" className="text-sm text-danger-400">{errors.form}</p> : null}
      <Button type="submit" size="lg" loading={pending} disabled={interests.length === 0}>
        Continuar <ArrowRight className="size-4" aria-hidden />
      </Button>
    </form>
  );
}
