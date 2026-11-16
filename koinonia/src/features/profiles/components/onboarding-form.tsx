"use client";

import { useActionState } from "react";
import { completeOnboardingAction } from "../actions";
import { idleState } from "@/lib/action-state";
import { FormMessage, SubmitButton } from "@/components/ui/form";
import { Alert } from "@/components/ui/alert";
import { ProfileFields, type Option } from "./profile-fields";
import type { Messages } from "@/i18n/types";
import type { Profile } from "@/types/database";

export function OnboardingForm({ m, profile, countries, languages }: { m: Messages; profile: Profile; countries: Option[]; languages: Option[] }) {
  const [state, action] = useActionState(completeOnboardingAction, idleState);
  return (
    <form action={action} className="flex flex-col gap-6" noValidate>
      <FormMessage state={state} />
      <ProfileFields m={m} state={state} profile={profile} countries={countries} languages={languages} />
      <Alert tone="info">{m.onboarding.privacyNote}</Alert>
      <SubmitButton pendingLabel={m.common.saving} size="lg">{m.onboarding.submit}</SubmitButton>
    </form>
  );
}
