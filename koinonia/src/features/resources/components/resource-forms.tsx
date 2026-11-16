"use client";

import { useActionState } from "react";
import { createResourceAction, requestResourceAction } from "../actions";
import { idleState } from "@/lib/action-state";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import { FormMessage, prev, SubmitButton } from "@/components/ui/form";
import { resourceKindValues } from "@/schemas/resource";
import type { Messages } from "@/i18n/types";

interface Option { code: string; name: string }

export function ResourceForm({ m, communityId, back, countries, defaultCountry, defaultCity }: {
  m: Messages; communityId: string; back: string; countries: Option[]; defaultCountry: string; defaultCity: string;
}) {
  const [state, action] = useActionState(createResourceAction, idleState);
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} className="grid gap-5 sm:grid-cols-2" noValidate key={state.status === "success" ? state.message : "form"}>
      <div className="sm:col-span-2"><FormMessage state={state} /></div>
      <input type="hidden" name="communityId" value={communityId} />
      <input type="hidden" name="back" value={back} />
      <Field label={m.resources.formTitle} error={fe.title} required>
        {({ id, describedBy, invalid }) => <Input id={id} name="title" required maxLength={120} defaultValue={prev(state, "title")} aria-describedby={describedBy} invalid={invalid} />}
      </Field>
      <Field label={m.resources.kind} error={fe.kind} required>
        {({ id, describedBy, invalid }) => (
          <Select id={id} name="kind" defaultValue={prev(state, "kind", "equipment")} aria-describedby={describedBy} invalid={invalid}>
            {resourceKindValues.map((k) => <option key={k} value={k}>{m.resources.kinds[k]}</option>)}
          </Select>
        )}
      </Field>
      <Field label={m.onboarding.country} error={fe.country} required>
        {({ id, describedBy, invalid }) => (
          <Select id={id} name="country" defaultValue={prev(state, "country", defaultCountry)} aria-describedby={describedBy} invalid={invalid}>
            {countries.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
          </Select>
        )}
      </Field>
      <Field label={m.onboarding.city} error={fe.city} required>
        {({ id, describedBy, invalid }) => <Input id={id} name="city" required maxLength={80} defaultValue={prev(state, "city", defaultCity)} aria-describedby={describedBy} invalid={invalid} />}
      </Field>
      <Field label={m.resources.formDescription} error={fe.description} className="sm:col-span-2" optionalLabel={m.common.optional}>
        {({ id, describedBy, invalid }) => <Textarea id={id} name="description" rows={3} maxLength={3000} defaultValue={prev(state, "description")} aria-describedby={describedBy} invalid={invalid} />}
      </Field>
      <div className="sm:col-span-2"><Checkbox name="shipsRemotely" label={m.resources.shipsRemotely} /></div>
      <SubmitButton pendingLabel={m.common.saving} variant="outline" className="justify-self-start">{m.resources.submit}</SubmitButton>
    </form>
  );
}

export function ResourceRequestForm({ m, resourceId, communities }: { m: Messages; resourceId: string; communities: Array<{ id: string; name: string }> }) {
  const [state, action] = useActionState(requestResourceAction, idleState);
  if (state.status === "success") return <FormMessage state={state} />;
  const fe = state.fieldErrors ?? {};
  const today = new Date().toISOString().slice(0, 10);
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <FormMessage state={state} />
      <input type="hidden" name="resourceId" value={resourceId} />
      <Field label={m.resources.requestMessage} error={fe.message} required>
        {({ id, describedBy, invalid }) => <Textarea id={id} name="message" rows={3} minLength={10} maxLength={2000} required defaultValue={prev(state, "message")} aria-describedby={describedBy} invalid={invalid} />}
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={m.resources.startsOn} error={fe.startsOn} required>
          {({ id, describedBy, invalid }) => <Input id={id} name="startsOn" type="date" min={today} required defaultValue={prev(state, "startsOn")} aria-describedby={describedBy} invalid={invalid} />}
        </Field>
        <Field label={m.resources.endsOn} error={fe.endsOn} required>
          {({ id, describedBy, invalid }) => <Input id={id} name="endsOn" type="date" min={today} required defaultValue={prev(state, "endsOn")} aria-describedby={describedBy} invalid={invalid} />}
        </Field>
      </div>
      {communities.length ? (
        <Field label={m.resources.requesterCommunity}>
          {({ id }) => (
            <Select id={id} name="requesterCommunity" defaultValue="">
              <option value="">—</option>
              {communities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          )}
        </Field>
      ) : <input type="hidden" name="requesterCommunity" value="" />}
      <SubmitButton pendingLabel={m.common.loading} variant="gold">{m.resources.requestSubmit}</SubmitButton>
    </form>
  );
}
