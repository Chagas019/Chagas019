"use client";

import { useActionState, useState } from "react";
import { createOpportunityAction } from "../actions";
import { idleState } from "@/lib/action-state";
import { ChoiceGroup, Field, Input, Select, Textarea } from "@/components/ui/field";
import { FormMessage, prev, prevList, SubmitButton } from "@/components/ui/form";
import { Alert } from "@/components/ui/alert";
import { availabilityValues, opportunityModeValues } from "@/schemas/common";
import type { Messages } from "@/i18n/types";

interface Option { code: string; name: string }
interface SkillGroup { category: string; skills: Array<{ id: number; name: string }> }

export function OpportunityForm({ m, communityId, slug, verified, countries, languages, skillGroups, defaultCountry }: {
  m: Messages; communityId: string; slug: string; verified: boolean; countries: Option[]; languages: Option[]; skillGroups: SkillGroup[]; defaultCountry: string;
}) {
  const [state, action] = useActionState(createOpportunityAction, idleState);
  const [mode, setMode] = useState(prev(state, "mode", "onsite"));
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} className="flex flex-col gap-6" noValidate>
      <FormMessage state={state} />
      <input type="hidden" name="communityId" value={communityId} />
      <input type="hidden" name="slug" value={slug} />
      <Field label={m.opportunities.formTitle} error={fe.title} required>
        {({ id, describedBy, invalid }) => <Input id={id} name="title" required minLength={5} maxLength={140} defaultValue={prev(state, "title")} aria-describedby={describedBy} invalid={invalid} />}
      </Field>
      <Field label={m.opportunities.formDescription} error={fe.description} required>
        {({ id, describedBy, invalid }) => <Textarea id={id} name="description" required rows={6} minLength={20} maxLength={5000} defaultValue={prev(state, "description")} aria-describedby={describedBy} invalid={invalid} />}
      </Field>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-semibold">{m.opportunities.mode}<span aria-hidden className="ml-0.5 text-danger">*</span></legend>
        <div className="flex flex-wrap gap-2">
          {opportunityModeValues.map((v) => (
            <label key={v} className="relative cursor-pointer">
              <input type="radio" name="mode" value={v} checked={mode === v} onChange={() => setMode(v)} className="peer absolute inset-0 opacity-0" />
              <span className="inline-flex min-h-10 items-center rounded-full border border-border px-4 text-sm peer-checked:border-graphite-500 peer-checked:bg-graphite-600 peer-checked:text-white peer-focus-visible:outline-3 peer-focus-visible:outline-neon-400">{m.enums.opportunityMode[v]}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={m.opportunities.country} error={fe.country} required={mode !== "remote"} optionalLabel={m.common.optional}>
          {({ id, describedBy, invalid }) => (
            <Select id={id} name="country" defaultValue={prev(state, "country", defaultCountry)} aria-describedby={describedBy} invalid={invalid}>
              <option value="">—</option>
              {countries.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
            </Select>
          )}
        </Field>
        <Field label={m.opportunities.formCity} error={fe.city} optionalLabel={m.common.optional}>
          {({ id, describedBy, invalid }) => <Input id={id} name="city" maxLength={80} defaultValue={prev(state, "city")} aria-describedby={describedBy} invalid={invalid} />}
        </Field>
        <Field label={m.opportunities.formStartsAt} error={fe.startsAt} optionalLabel={m.common.optional}>
          {({ id, describedBy, invalid }) => <Input id={id} name="startsAt" type="date" defaultValue={prev(state, "startsAt")} aria-describedby={describedBy} invalid={invalid} />}
        </Field>
        <Field label={m.opportunities.formEndsAt} error={fe.endsAt} optionalLabel={m.common.optional}>
          {({ id, describedBy, invalid }) => <Input id={id} name="endsAt" type="date" defaultValue={prev(state, "endsAt")} aria-describedby={describedBy} invalid={invalid} />}
        </Field>
        <Field label={m.opportunities.slots} error={fe.slots} optionalLabel={m.common.optional}>
          {({ id, describedBy, invalid }) => <Input id={id} name="slots" type="number" min={1} max={10000} inputMode="numeric" defaultValue={prev(state, "slots")} aria-describedby={describedBy} invalid={invalid} />}
        </Field>
      </div>
      <ChoiceGroup legend={m.opportunities.languages} name="languages" options={languages.map((l) => ({ value: l.code, label: l.name }))} defaultValue={prevList(state, "languages")} />
      <ChoiceGroup legend={m.opportunities.availability} name="availability" options={availabilityValues.map((v) => ({ value: v, label: m.enums.availability[v] }))} defaultValue={prevList(state, "availability")} />
      <details className="rounded-lg border border-border bg-surface-muted p-4">
        <summary className="cursor-pointer text-sm font-semibold">{m.opportunities.skills}</summary>
        <div className="mt-4 flex flex-col gap-5">
          {skillGroups.map((g) => <ChoiceGroup key={g.category} legend={g.category} name="skills" options={g.skills.map((s) => ({ value: String(s.id), label: s.name }))} defaultValue={prevList(state, "skills")} />)}
        </div>
      </details>
      {!verified ? <Alert tone="warning">{m.errors.communityNotVerified}</Alert> : null}
      <ChoiceGroup legend={m.opportunities.formStatus} name="publish" type="radio"
        options={[...(verified ? [{ value: "open", label: m.opportunities.publishNow }] : []), { value: "draft", label: m.opportunities.saveDraft }]}
        defaultValue={[prev(state, "publish", verified ? "open" : "draft")]} />
      <SubmitButton pendingLabel={m.common.saving} size="lg" className="self-start">{m.opportunities.submit}</SubmitButton>
    </form>
  );
}
