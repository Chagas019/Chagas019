"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Switch, Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { createChallengeAction } from "@/server/actions/challenge";
import { CATEGORIES } from "@/lib/taxonomy";

const local = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

export function CreateChallengeForm() {
  const router = useRouter();
  const toast = useToast();
  const [voting, setVoting] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const now = new Date();
  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const toDate = (k: string) => (fd.get(k) ? new Date(String(fd.get(k))).toISOString() : null);
        start(async () => {
          const r = await createChallengeAction({
            title: fd.get("title"),
            theme: fd.get("theme"),
            briefing: fd.get("briefing"),
            rules: String(fd.get("rules") ?? "").split("\n").map((s) => s.trim()).filter(Boolean),
            category: fd.get("category"),
            level: fd.get("level"),
            cadence: fd.get("cadence"),
            palette: String(fd.get("palette") ?? "").split(",").map((s) => s.trim()).filter(Boolean),
            startsAt: toDate("startsAt"),
            submissionDeadline: toDate("submissionDeadline"),
            votingEnabled: voting,
            votingEndsAt: voting ? toDate("votingEndsAt") : null,
          });
          if (!r.ok) {
            setErrors(r.fields ?? {});
            return toast.show(r.error, "error");
          }
          router.push(`/desafios/${r.data.slug}`);
        });
      }}
    >
      <Field label="Título" id="title" error={errors.title}><Input id="title" name="title" required /></Field>
      <Field label="Tema (uma frase)" id="theme" error={errors.theme}><Input id="theme" name="theme" required /></Field>
      <Field label="Briefing" id="briefing" error={errors.briefing}><Textarea id="briefing" name="briefing" rows={5} required /></Field>
      <Field label="Regras (uma por linha)" id="rules" error={errors.rules}><Textarea id="rules" name="rules" rows={4} required /></Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Categoria" id="category">
          <Select id="category" name="category">{CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{c.label}</option>)}</Select>
        </Field>
        <Field label="Nível" id="level">
          <Select id="level" name="level"><option value="todos">Todos</option><option value="iniciante">Iniciantes</option><option value="profissional">Profissionais</option></Select>
        </Field>
        <Field label="Cadência" id="cadence">
          <Select id="cadence" name="cadence"><option value="semanal">Semanal</option><option value="mensal">Mensal</option></Select>
        </Field>
      </div>
      <Field label="Paleta (HEX separados por vírgula)" id="palette" optional error={errors.palette}><Input id="palette" name="palette" placeholder="#1b1b2f, #e43f5a" /></Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Início" id="startsAt" error={errors.startsAt}><Input id="startsAt" name="startsAt" type="datetime-local" defaultValue={local(now)} required /></Field>
        <Field label="Fim dos envios" id="submissionDeadline" error={errors.submissionDeadline}><Input id="submissionDeadline" name="submissionDeadline" type="datetime-local" defaultValue={local(new Date(now.getTime() + 7 * 864e5))} required /></Field>
        {voting ? <Field label="Fim da votação" id="votingEndsAt" error={errors.votingEndsAt}><Input id="votingEndsAt" name="votingEndsAt" type="datetime-local" defaultValue={local(new Date(now.getTime() + 10 * 864e5))} /></Field> : null}
      </div>
      <Switch checked={voting} onChange={setVoting} label="Votação da comunidade" description="Sem votação, o desafio é só para praticar e trocar feedback." />
      <Button type="submit" size="lg" loading={pending}>Publicar desafio</Button>
    </form>
  );
}
