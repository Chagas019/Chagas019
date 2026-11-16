"use client";

import { ChoiceGroup, Field, Input, Select, Textarea } from "@/components/ui/field";
import { prev, prevList } from "@/components/ui/form";
import { availabilityValues, messagePermissionValues, visibilityValues } from "@/schemas/common";
import type { ActionState } from "@/lib/action-state";
import type { Messages } from "@/i18n/types";
import type { Profile } from "@/types/database";

export interface Option { code: string; name: string }

/** Campos compartilhados entre onboarding e edição de perfil. */
export function ProfileFields({ m, state, profile, countries, languages }: {
  m: Messages; state: ActionState; profile: Profile; countries: Option[]; languages: Option[];
}) {
  const fe = state.fieldErrors ?? {};
  return (
    <>
      <Field label={m.auth.displayName} error={fe.displayName} required>
        {({ id, describedBy, invalid }) => <Input id={id} name="displayName" maxLength={80} required autoComplete="name" defaultValue={prev(state, "displayName", profile.display_name)} aria-describedby={describedBy} invalid={invalid} />}
      </Field>
      <Field label={m.onboarding.bio} error={fe.bio} optionalLabel={m.common.optional}>
        {({ id, describedBy, invalid }) => <Textarea id={id} name="bio" maxLength={1000} rows={4} defaultValue={prev(state, "bio", profile.bio)} aria-describedby={describedBy} invalid={invalid} />}
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={m.onboarding.country} error={fe.country} optionalLabel={m.common.optional}>
          {({ id, describedBy, invalid }) => (
            <Select id={id} name="country" defaultValue={prev(state, "country", profile.country_code ?? "")} aria-describedby={describedBy} invalid={invalid} autoComplete="country">
              <option value="">—</option>
              {countries.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
            </Select>
          )}
        </Field>
        <Field label={m.onboarding.city} error={fe.city} optionalLabel={m.common.optional}>
          {({ id, describedBy, invalid }) => <Input id={id} name="city" maxLength={80} autoComplete="address-level2" defaultValue={prev(state, "city", profile.city ?? "")} aria-describedby={describedBy} invalid={invalid} />}
        </Field>
      </div>
      <ChoiceGroup legend={m.onboarding.languages} name="languages" required error={fe.languages}
        options={languages.map((l) => ({ value: l.code, label: l.name }))}
        defaultValue={prevList(state, "languages", profile.languages)} />
      <ChoiceGroup legend={m.onboarding.availability} name="availability" error={fe.availability}
        options={availabilityValues.map((v) => ({ value: v, label: m.enums.availability[v] }))}
        defaultValue={prevList(state, "availability", profile.availability)} />
      <Field label={m.onboarding.hoursPerWeek} error={fe.hoursPerWeek} optionalLabel={m.common.optional} className="max-w-48">
        {({ id, describedBy, invalid }) => <Input id={id} name="hoursPerWeek" type="number" min={0} max={80} inputMode="numeric" defaultValue={prev(state, "hoursPerWeek", profile.hours_per_week?.toString() ?? "")} aria-describedby={describedBy} invalid={invalid} />}
      </Field>
      <ChoiceGroup legend={m.onboarding.visibility} name="visibility" type="radio" error={fe.visibility}
        options={visibilityValues.map((v) => ({ value: v, label: m.enums.visibility[v] }))}
        defaultValue={[prev(state, "visibility", profile.visibility)]} />
      <ChoiceGroup legend={m.onboarding.messagePermission} name="messagePermission" type="radio" error={fe.messagePermission}
        options={messagePermissionValues.map((v) => ({ value: v, label: m.enums.messagePermission[v] }))}
        defaultValue={[prev(state, "messagePermission", profile.message_permission)]} />
    </>
  );
}
