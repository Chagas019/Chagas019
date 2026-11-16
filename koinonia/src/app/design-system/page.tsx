import type { Metadata } from "next";
import { getI18n } from "@/i18n/server";
import { palette, textPairs } from "@/design-system/tokens";
import { contrastRatio } from "@/design-system/contrast";
import { Container, PageHeader } from "@/components/layout/page-header";
import { Alert, Avatar, Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Skeleton, Spinner, StatePanel, Tooltip } from "@/components/ui";
import { Modal } from "@/components/ui/modal";

export const metadata: Metadata = { title: "Design System", robots: { index: false } };

export default async function DesignSystemPage() {
  const { m } = await getI18n();
  return (
    <Container className="py-12">
      <PageHeader eyebrow="KOINONIA" title={m.ds.title} subtitle={m.ds.subtitle} />
      <section aria-labelledby="ds-colors" className="mb-14">
        <h2 id="ds-colors" className="mb-5 font-display text-2xl font-semibold">{m.ds.colors}</h2>
        {(["night", "gold", "navy"] as const).map((group) => (
          <div key={group} className="mb-5">
            <h3 className="mb-2 text-sm font-semibold capitalize">{group}</h3>
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-10">
              {Object.entries(palette[group]).map(([step, hex]) => (
                <li key={step} className="overflow-hidden rounded-lg border border-border">
                  <span className="block h-14" style={{ background: hex }} />
                  <span className="block px-2 py-1 font-mono text-[0.68rem]">{step}<br />{hex}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <h3 className="mt-8 mb-2 text-sm font-semibold">{m.ds.contrast}</h3>
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {textPairs.map(([fg, bg, use]) => (
            <li key={use} className="flex items-center justify-between rounded-lg px-4 py-3 text-sm" style={{ color: fg, background: bg }}>
              <span className="sr-only">{use}</span><span aria-hidden>Aa</span><span className="font-mono font-semibold">{contrastRatio(fg, bg).toFixed(2)}:1</span>
            </li>
          ))}
        </ul>
      </section>
      <section aria-labelledby="ds-type" className="mb-14">
        <h2 id="ds-type" className="mb-5 font-display text-2xl font-semibold">{m.ds.typography}</h2>
        <p className="font-display text-5xl">EB Garamond — {m.brand.slogan}</p>
        <p className="mt-3 text-lg">Inter — {m.ds.sample}</p>
      </section>
      <section aria-labelledby="ds-components" className="mb-14 space-y-8">
        <h2 id="ds-components" className="font-display text-2xl font-semibold">{m.ds.components}</h2>
        <div className="flex flex-wrap items-center gap-3">
          <Button>{m.common.save}</Button><Button variant="gold">{m.common.search}</Button><Button variant="outline">{m.common.cancel}</Button>
          <Button variant="ghost">{m.common.back}</Button><Button variant="danger">{m.common.remove}</Button><Button loading loadingLabel={m.common.loading}>{m.common.loading}</Button><Button disabled>{m.common.edit}</Button>
          <Modal trigger={m.ds.openModal} title={m.ds.title} closeLabel={m.common.close}><p className="text-sm text-ink-muted">{m.ds.modalBody}</p></Modal>
          <Tooltip content={m.ds.tooltip}><Badge tone="gold">?</Badge></Tooltip>
        </div>
        <div className="flex flex-wrap gap-2">
          {(["neutral", "brand", "gold", "success", "danger", "warning", "info"] as const).map((tone) => <Badge key={tone} tone={tone}>{tone}</Badge>)}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Card interactive><CardHeader><CardTitle>Card</CardTitle><CardDescription>{m.ds.sample}</CardDescription></CardHeader><CardContent><div className="flex items-center gap-3"><Avatar name="Maria Clara" /><Spinner label={m.common.loading} /><Skeleton className="h-4 w-32" /></div></CardContent></Card>
          <Card><CardContent className="space-y-3"><label htmlFor="ds-input" className="text-sm font-semibold">{m.auth.email}</label><Input id="ds-input" placeholder="nome@exemplo.org" /><Input aria-label={m.validation.email} invalid defaultValue="@" /></CardContent></Card>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Alert tone="info" title={m.ds.tooltip}>{m.states.loginRequired}</Alert>
          <Alert tone="success">{m.common.saved}</Alert>
          <Alert tone="warning">{m.errors.rateLimited}</Alert>
          <Alert tone="danger">{m.errors.generic}</Alert>
        </div>
      </section>
      <section aria-labelledby="ds-states">
        <h2 id="ds-states" className="mb-5 font-display text-2xl font-semibold">{m.ds.states}</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <StatePanel variant="empty" title={m.states.emptyTitle} headingLevel={3} />
          <StatePanel variant="error" title={m.states.errorTitle} headingLevel={3} />
          <StatePanel variant="success" title={m.common.saved} headingLevel={3} />
          <StatePanel variant="forbidden" title={m.states.forbiddenTitle} headingLevel={3} />
          <StatePanel variant="unconfigured" title={m.states.backendTitle} headingLevel={3} />
        </div>
      </section>
    </Container>
  );
}
