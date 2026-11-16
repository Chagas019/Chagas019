"use client";

import { useActionState } from "react";
import { addPortfolioItemAction, removePortfolioItemAction, updateProfileAction, updateSkillsAction } from "../actions";
import { idleState } from "@/lib/action-state";
import { ChoiceGroup, Field, Input, Textarea } from "@/components/ui/field";
import { FormMessage, prev, SubmitButton } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileFields, type Option } from "./profile-fields";
import type { Messages } from "@/i18n/types";
import type { PortfolioItem, Profile, ProfilePrivate } from "@/types/database";

export interface SkillGroup { category: string; skills: Array<{ id: number; name: string }> }

export function ProfileEditor({ m, profile, priv, countries, languages, skillGroups, mySkills, portfolio }: {
  m: Messages; profile: Profile; priv: ProfilePrivate | null; countries: Option[]; languages: Option[];
  skillGroups: SkillGroup[]; mySkills: number[]; portfolio: PortfolioItem[];
}) {
  const [state, action] = useActionState(updateProfileAction, idleState);
  const [skillsState, skillsAction] = useActionState(updateSkillsAction, idleState);
  const [pfState, pfAction] = useActionState(addPortfolioItemAction, idleState);
  const fe = state.fieldErrors ?? {};

  return (
    <div className="flex flex-col gap-8">
      <Card>
        <CardHeader><CardTitle as="h2">{m.profile.sectionBasics}</CardTitle></CardHeader>
        <CardContent>
          <form action={action} className="flex flex-col gap-6" noValidate>
            <FormMessage state={state} />
            <Field label={m.profile.username} hint={m.profile.usernameHint} error={fe.username} optionalLabel={m.common.optional}>
              {({ id, describedBy, invalid }) => <Input id={id} name="username" maxLength={30} autoComplete="username" defaultValue={prev(state, "username", profile.username ?? "")} aria-describedby={describedBy} invalid={invalid} />}
            </Field>
            <ProfileFields m={m} state={state} profile={profile} countries={countries} languages={languages} />
            <fieldset className="flex flex-col gap-5 rounded-lg border border-border bg-surface-muted p-5">
              <legend className="px-1 text-sm font-semibold">{m.profile.sectionPrivacy}</legend>
              <p className="text-xs text-ink-muted">{m.profile.contactHint}</p>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label={m.profile.phone} error={fe.phone} optionalLabel={m.common.optional}>
                  {({ id, describedBy, invalid }) => <Input id={id} name="phone" type="tel" autoComplete="tel" maxLength={30} defaultValue={prev(state, "phone", priv?.phone ?? "")} aria-describedby={describedBy} invalid={invalid} />}
                </Field>
                <Field label={m.profile.contactEmail} error={fe.contactEmail} optionalLabel={m.common.optional}>
                  {({ id, describedBy, invalid }) => <Input id={id} name="contactEmail" type="email" autoComplete="email" defaultValue={prev(state, "contactEmail", priv?.contact_email ?? "")} aria-describedby={describedBy} invalid={invalid} />}
                </Field>
              </div>
            </fieldset>
            <SubmitButton pendingLabel={m.common.saving} className="self-start">{m.common.save}</SubmitButton>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle as="h2">{m.profile.sectionSkills}</CardTitle>
          <CardDescription>{m.profile.skillsHint}</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={skillsAction} className="flex flex-col gap-6">
            <FormMessage state={skillsState} />
            {skillGroups.map((g) => (
              <ChoiceGroup key={g.category} legend={g.category} name="skills" options={g.skills.map((s) => ({ value: String(s.id), label: s.name }))} defaultValue={mySkills.map(String)} />
            ))}
            <SubmitButton pendingLabel={m.common.saving} className="self-start">{m.common.save}</SubmitButton>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle as="h2">{m.profile.sectionPortfolio}</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-6">
          {portfolio.length === 0 ? <p className="text-sm text-ink-muted">{m.profile.portfolioEmpty}</p> : (
            <ul className="divide-y divide-border rounded-lg border border-border">
              {portfolio.map((p) => (
                <li key={p.id} className="flex flex-wrap items-start justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="font-semibold">{p.url ? <a href={p.url} target="_blank" rel="noopener noreferrer nofollow" className="underline-offset-4 hover:underline">{p.title}</a> : p.title}</p>
                    {p.description ? <p className="mt-1 text-sm text-ink-muted">{p.description}</p> : null}
                  </div>
                  <form action={removePortfolioItemAction}>
                    <input type="hidden" name="id" value={p.id} />
                    <Button type="submit" variant="ghost" size="sm" aria-label={`${m.common.remove}: ${p.title}`}>{m.common.remove}</Button>
                  </form>
                </li>
              ))}
            </ul>
          )}
          <form action={pfAction} className="grid gap-5 rounded-lg bg-surface-muted p-5 sm:grid-cols-2" noValidate>
            <div className="sm:col-span-2"><FormMessage state={pfState} /></div>
            <Field label={m.profile.portfolioTitle} error={pfState.fieldErrors?.title} required>
              {({ id, describedBy, invalid }) => <Input id={id} name="title" maxLength={120} required aria-describedby={describedBy} invalid={invalid} />}
            </Field>
            <Field label={m.profile.portfolioUrl} error={pfState.fieldErrors?.url}>
              {({ id, describedBy, invalid }) => <Input id={id} name="url" type="url" placeholder="https://" aria-describedby={describedBy} invalid={invalid} />}
            </Field>
            <Field label={m.profile.portfolioDescription} error={pfState.fieldErrors?.description} className="sm:col-span-2" optionalLabel={m.common.optional}>
              {({ id, describedBy, invalid }) => <Textarea id={id} name="description" rows={3} maxLength={1000} aria-describedby={describedBy} invalid={invalid} />}
            </Field>
            <SubmitButton pendingLabel={m.common.saving} variant="outline" className="justify-self-start">{m.profile.portfolioAdd}</SubmitButton>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
