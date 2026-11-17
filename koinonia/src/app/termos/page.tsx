import type { Metadata } from "next";
import { getI18n } from "@/i18n/server";
import { LegalPage } from "@/components/layout/legal-page";
import { terms } from "@/content/legal";

export async function generateMetadata(): Promise<Metadata> {
  const { m } = await getI18n();
  return { title: m.legal.termsTitle };
}

export default async function Page() {
  const { m, locale } = await getI18n();
  const doc = terms[locale];
  return (
    <LegalPage title={m.legal.termsTitle} notice={m.legal.draftNotice} updated="v2026-11">
      <p>{doc.intro}</p>
      {doc.sections.map((s) => (
        <section key={s.title}>
          <h2>{s.title}</h2>
          {s.body ? <p>{s.body}</p> : null}
          {s.items ? <ul>{s.items.map((i) => <li key={i}>{i}</li>)}</ul> : null}
        </section>
      ))}
    </LegalPage>
  );
}
