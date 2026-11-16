import type { ReactNode } from "react";
import { Alert } from "@/components/ui";
import { Container } from "./page-header";

export function LegalPage({ title, notice, updated, children }: { title: string; notice: string; updated: string; children: ReactNode }) {
  return (
    <Container size="md" className="py-12">
      <h1 className="font-display text-4xl font-semibold">{title}</h1>
      <p className="mt-2 text-sm text-ink-subtle">{updated}</p>
      <Alert tone="warning" className="my-6">{notice}</Alert>
      <div className="space-y-6 leading-relaxed [&_h2]:mt-10 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc">{children}</div>
    </Container>
  );
}
