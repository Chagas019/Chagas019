import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getI18n } from "@/i18n/server";
import { requireSession } from "@/features/auth/session";
import { OnboardingForm } from "@/features/profiles/components/onboarding-form";
import { Container } from "@/components/layout/page-header";
import { sortedCountries, sortedLanguages } from "@/lib/geo";
import { BackendUnavailable } from "@/components/features/backend-unavailable";

export async function generateMetadata(): Promise<Metadata> {
  const { m } = await getI18n();
  return { title: m.onboarding.title };
}

export default async function OnboardingPage() {
  const { m, locale } = await getI18n();
  const session = await requireSession("/onboarding", { onboarded: false });
  if (!session.profile) return <Container className="py-16"><BackendUnavailable m={m} headingLevel={1} /></Container>;
  if (session.profile.onboarded_at) redirect("/painel");
  return (
    <Container size="sm" className="py-12">
      <h1 className="font-display text-3xl font-semibold">{m.onboarding.title}</h1>
      <p className="mt-2 mb-8 text-ink-muted">{m.onboarding.subtitle}</p>
      <OnboardingForm m={m} profile={session.profile} countries={sortedCountries(locale)} languages={sortedLanguages(locale)} />
    </Container>
  );
}
