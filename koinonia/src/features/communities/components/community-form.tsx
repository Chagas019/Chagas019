"use client";

import { useActionState, useState } from "react";
import { createCommunityAction, updateCommunityAction } from "../actions";
import { idleState } from "@/lib/action-state";
import { ChoiceGroup, Field, Input, Select, Textarea } from "@/components/ui/field";
import { FormMessage, prev, prevList, SubmitButton } from "@/components/ui/form";
import { communityKindValues } from "@/schemas/common";
import { slugify } from "@/lib/utils";
import type { Messages } from "@/i18n/types";
import type { Community } from "@/types/database";

interface Option { code: string; name: string }

export function CommunityForm({ m, countries, languages, community }: { m: Messages; countries: Option[]; languages: Option[]; community?: Community }) {
  const [state, action] = useActionState(community ? updateCommunityAction : createCommunityAction, idleState);
  const [slug, setSlug] = useState(prev(state, "slug", community?.slug ?? ""));
  const [slugTouched, setSlugTouched] = useState(Boolean(community));
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} className="flex flex-col gap-6" noValidate>
      <FormMessage state={state} />
      {community ? <><input type="hidden" name="id" value={community.id} /><input type="hidden" name="currentSlug" value={community.slug} /></> : null}
      <Field label={m.communities.name} error={fe.name} required>
        {({ id, describedBy, invalid }) => (
          <Input id={id} name="name" required maxLength={120} defaultValue={prev(state, "name", community?.name ?? "")} aria-describedby={describedBy} invalid={invalid}
            onChange={(e) => { if (!slugTouched) setSlug(slugify(e.target.value)); }} />
        )}
      </Field>
      <Field label={m.communities.slug} hint={`koinonia/comunidades/${slug || "…"} — ${m.communities.slugHint}`} error={fe.slug} required>
        {({ id, describedBy, invalid }) => (
          <Input id={id} name="slug" required maxLength={60} value={slug} aria-describedby={describedBy} invalid={invalid}
            onChange={(e) => { setSlugTouched(true); setSlug(e.target.value.toLowerCase()); }} />
        )}
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={m.communities.kind} error={fe.kind} required>
          {({ id, describedBy, invalid }) => (
            <Select id={id} name="kind" required defaultValue={prev(state, "kind", community?.kind ?? "parish")} aria-describedby={describedBy} invalid={invalid}>
              {communityKindValues.map((k) => <option key={k} value={k}>{m.enums.communityKind[k]}</option>)}
            </Select>
          )}
        </Field>
        <Field label={m.communities.diocese} error={fe.diocese} optionalLabel={m.common.optional}>
          {({ id, describedBy, invalid }) => <Input id={id} name="diocese" maxLength={120} defaultValue={prev(state, "diocese", community?.diocese ?? "")} aria-describedby={describedBy} invalid={invalid} />}
        </Field>
        <Field label={m.onboarding.country} error={fe.country} required>
          {({ id, describedBy, invalid }) => (
            <Select id={id} name="country" required defaultValue={prev(state, "country", community?.country_code ?? "")} aria-describedby={describedBy} invalid={invalid}>
              <option value="">—</option>
              {countries.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
            </Select>
          )}
        </Field>
        <Field label={m.onboarding.city} error={fe.city} required>
          {({ id, describedBy, invalid }) => <Input id={id} name="city" required maxLength={80} defaultValue={prev(state, "city", community?.city ?? "")} aria-describedby={describedBy} invalid={invalid} />}
        </Field>
      </div>
      <Field label={m.communities.description} error={fe.description} optionalLabel={m.common.optional}>
        {({ id, describedBy, invalid }) => <Textarea id={id} name="description" rows={5} maxLength={3000} defaultValue={prev(state, "description", community?.description ?? "")} aria-describedby={describedBy} invalid={invalid} />}
      </Field>
      <Field label={m.communities.website} error={fe.website} optionalLabel={m.common.optional}>
        {({ id, describedBy, invalid }) => <Input id={id} name="website" type="url" placeholder="https://" defaultValue={prev(state, "website", community?.website ?? "")} aria-describedby={describedBy} invalid={invalid} />}
      </Field>
      <ChoiceGroup legend={m.communities.languages} name="languages" error={fe.languages}
        options={languages.map((l) => ({ value: l.code, label: l.name }))} defaultValue={prevList(state, "languages", community?.languages ?? [])} />
      <SubmitButton pendingLabel={m.common.saving} size="lg" className="self-start">{community ? m.common.save : m.communities.submit}</SubmitButton>
    </form>
  );
}
