import type { Metadata } from "next";
import { getI18n } from "@/i18n/server";
import { palette, textPairs } from "@/design-system/tokens";
import { contrastRatio } from "@/design-system/contrast";
import { Container, PageHeader } from "@/components/layout/page-header";
import { Alert, Avatar, Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Skeleton, Spinner, StatePanel } from "@/components/ui";

export const metadata: Metadata = { title: "Design System", robots: { index: false } };

export default async function DesignSystemPage() {
  const { m } = await getI18n();
  return (
    <Container className="py-12">
      <PageHeader eyebrow="KOINONIA" title="Design System" subtitle="Tokens, componentes e estados usados em toda a plataforma. Todos os pares de cor de texto atendem WCAG 2.2 AA." />
      <section aria-labelledby="ds-colors" className="mb-14">
        <h2 id="ds-colors" className="mb-5 font-display text-2xl font-semibold">Cores</h2>
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
        <h3 className="mt-8 mb-2 text-sm font-semibold">Contraste dos pares de texto</h3>
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {textPairs.map(([fg, bg, use]) => (
            <li key={use} className="flex items-center justify-between rounded-lg px-4 py-3 text-sm" style={{ color: fg, background: bg }}>
              <span>{use}</span><span className="font-mono font-semibold">{contrastRatio(fg, bg).toFixed(2)}:1</span>
            </li>
          ))}
        </ul>
      </section>
      <section aria-labelledby="ds-type" className="mb-14">
        <h2 id="ds-type" className="mb-5 font-display text-2xl font-semibold">Tipografia</h2>
        <p className="font-display text-5xl">EB Garamond — Talentos unidos.</p>
        <p className="mt-3 text-lg">Inter — texto de interface com leitura confortável em qualquer tela.</p>
      </section>
      <section aria-labelledby="ds-components" className="mb-14 space-y-8">
        <h2 id="ds-components" className="font-display text-2xl font-semibold">Componentes</h2>
        <div className="flex flex-wrap items-center gap-3">
          <Button>Primário</Button><Button variant="gold">Dourado</Button><Button variant="outline">Contorno</Button>
          <Button variant="ghost">Fantasma</Button><Button variant="danger">Perigo</Button><Button loading loadingLabel={m.common.loading}>Carregando</Button><Button disabled>Desativado</Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {(["neutral", "brand", "gold", "success", "danger", "warning", "info"] as const).map((tone) => <Badge key={tone} tone={tone}>{tone}</Badge>)}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Card><CardHeader><CardTitle>Card</CardTitle><CardDescription>Bordas suaves, sombra discreta e realce dourado ao interagir.</CardDescription></CardHeader><CardContent><div className="flex items-center gap-3"><Avatar name="Maria Clara" /><Spinner label={m.common.loading} /><Skeleton className="h-4 w-32" /></div></CardContent></Card>
          <Card><CardContent className="space-y-3"><label htmlFor="ds-input" className="text-sm font-semibold">Campo de texto</label><Input id="ds-input" placeholder="Digite aqui" /><Input aria-label="Campo inválido" invalid defaultValue="Valor inválido" /></CardContent></Card>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Alert tone="info" title="Informação">Mensagens contextuais com ícone e cor semântica.</Alert>
          <Alert tone="success" title="Sucesso">Ação concluída.</Alert>
          <Alert tone="warning" title="Aviso">Atenção necessária.</Alert>
          <Alert tone="danger" title="Erro">Algo falhou.</Alert>
        </div>
      </section>
      <section aria-labelledby="ds-states">
        <h2 id="ds-states" className="mb-5 font-display text-2xl font-semibold">Estados de página</h2>
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
