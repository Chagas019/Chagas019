"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ChipGroup } from "@/components/ui/chips";
import { Field, Input, Select, Switch, Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { createListingAction } from "@/server/actions/collab";
import { COLLAB_MODES, COLLAB_PROJECT_TYPES } from "@/lib/validation";
import { SPECIALTIES } from "@/lib/taxonomy";
import { cn } from "@/lib/utils";

const skillOptions = SPECIALTIES.filter((s) => s !== "Aprendendo").map((s) => ({ slug: s, label: s }));

export function ListingForm() {
  const router = useRouter();
  const toast = useToast();
  const [skills, setSkills] = useState<string[]>([]);
  const [volunteer, setVolunteer] = useState(false);
  const [mode, setMode] = useState<"remoto" | "presencial" | "hibrido">("remoto");
  const [access, setAccess] = useState<"public" | "private">("public");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();

  return (
    <form
      className="space-y-6"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(async () => {
          const r = await createListingAction({
            title: fd.get("title"),
            description: fd.get("description"),
            skills,
            projectType: fd.get("projectType"),
            compensation: volunteer ? "" : fd.get("compensation"),
            isVolunteer: volunteer,
            location: fd.get("location"),
            mode,
            deadline: fd.get("deadline") || null,
            access,
            contact: fd.get("contact"),
          });
          if (!r.ok) {
            setErrors(r.fields ?? {});
            return toast.show(r.error, "error");
          }
          toast.show(r.message ?? "Publicada.");
          router.push(`/collab/${r.data.id}${r.data.code ? `?codigo=${r.data.code}` : ""}`);
        });
      }}
    >
      <Field label="Título" id="title" error={errors.title} hint="Ex.: Videomaker procura editor para clipe">
        <Input id="title" name="title" maxLength={120} invalid={!!errors.title} />
      </Field>
      <Field label="Descrição" id="description" error={errors.description} hint="Projeto, referências, entregáveis, carga de trabalho.">
        <Textarea id="description" name="description" rows={6} maxLength={4000} invalid={!!errors.description} />
      </Field>
      <div className="space-y-2">
        <p className="text-sm font-medium text-fog-200">Habilidades procuradas</p>
        <ChipGroup label="Habilidades procuradas" options={skillOptions} value={skills} onChange={setSkills} max={6} />
        {errors.skills ? <p className="text-sm text-danger-400">{errors.skills}</p> : null}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tipo de projeto" id="projectType">
          <Select id="projectType" name="projectType" defaultValue="ensaio">
            {COLLAB_PROJECT_TYPES.map((t) => (
              <option key={t.slug} value={t.slug}>
                {t.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Prazo" id="deadline" optional error={errors.deadline}>
          <Input id="deadline" name="deadline" type="date" />
        </Field>
      </div>
      <div className="space-y-2">
        <Switch checked={volunteer} onChange={setVolunteer} label="Trabalho voluntário / permuta" description="Sem remuneração em dinheiro. Seja claro sobre o que cada parte ganha." />
        {!volunteer ? (
          <Field label="Remuneração" id="compensation" error={errors.compensation} hint="Ex.: R$ 800 pela diária, a combinar, cachê + transporte">
            <Input id="compensation" name="compensation" maxLength={120} invalid={!!errors.compensation} />
          </Field>
        ) : null}
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium text-fog-200">Modalidade</p>
        <div role="radiogroup" aria-label="Modalidade" className="flex flex-wrap gap-2">
          {COLLAB_MODES.map((m) => (
            <button key={m.slug} type="button" role="radio" aria-checked={mode === m.slug} onClick={() => setMode(m.slug)} className={cn("rounded-full px-4 py-2 text-sm ring-1 ring-inset", mode === m.slug ? "bg-paper text-ink-950 ring-paper" : "bg-ink-850 text-fog-300 ring-ink-700")}>
              {m.label}
            </button>
          ))}
        </div>
      </div>
      {mode !== "remoto" ? (
        <Field label="Cidade ou região" id="location" error={errors.location} hint="Nunca coloque endereço. O local exato se combina depois.">
          <Input id="location" name="location" maxLength={80} invalid={!!errors.location} />
        </Field>
      ) : null}
      <Field label="Contato" id="contact" error={errors.contact} hint="E-mail, WhatsApp ou outro. Só aparece para quem você aceitar.">
        <Input id="contact" name="contact" maxLength={300} invalid={!!errors.contact} />
      </Field>
      <div role="radiogroup" aria-label="Quem vê" className="grid gap-2 sm:grid-cols-2">
        {(
          [
            { v: "public", t: "Aberta", d: "Aparece na lista do Collab" },
            { v: "private", t: "Privada", d: "Só quem receber o link" },
          ] as const
        ).map((o) => (
          <button key={o.v} type="button" role="radio" aria-checked={access === o.v} onClick={() => setAccess(o.v)} className={cn("rounded-[var(--radius-md)] p-3 text-left ring-1 ring-inset", access === o.v ? "bg-volt-500/10 ring-volt-500" : "bg-ink-850 ring-ink-700")}>
            <span className="block text-sm font-medium">{o.t}</span>
            <span className="text-xs text-fog-500">{o.d}</span>
          </button>
        ))}
      </div>
      <Button type="submit" size="lg" loading={pending}>
        Publicar oportunidade
      </Button>
    </form>
  );
}
