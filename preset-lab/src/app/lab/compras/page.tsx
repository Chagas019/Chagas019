import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CHECKOUT_ERRORS, EmptyState, LabSectionTitle, Notice, PurchaseStatusBadge } from "@/components/lab/lab-ui";
import { Badge } from "@/components/ui/badge";
import { requireUser } from "@/lib/auth";
import { repo } from "@/lib/repo";
import { formatBRL, formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Compras" };

const KIND_LABEL = { product: "Preset", collection: "Coleção", subscription: "Assinatura" } as const;

export default async function PurchasesPage({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const sp = await searchParams;
  const user = await requireUser("/lab/compras");
  const purchases = await repo().listPurchases(user.id);
  const error = sp.erro ? (CHECKOUT_ERRORS[sp.erro] ?? "Não foi possível concluir o pagamento.") : null;

  return (
    <div className="space-y-8">
      {error && <Notice tone="danger">{error}</Notice>}
      {purchases.length === 0 ? (
        <EmptyState number="R$" title={<>Nenhuma <span className="serif-accent text-signal">compra</span></>} text="Presets premium comprados avulso ficam na sua biblioteca para sempre. Pagamento em reais, com PIX ou cartão." href="/presets" cta="Ver presets premium" />
      ) : (
        <section>
          <LabSectionTitle kicker={`${purchases.length} ${purchases.length === 1 ? "pedido" : "pedidos"}`} title="Compras" />
          <ol className="mt-8 border-t hairline">
            {purchases.map((p) => (
              <li key={p.id} className="grid gap-4 border-b hairline py-6 md:grid-cols-12 md:items-start md:gap-6" data-testid="purchase-row">
                <div className="md:col-span-3">
                  <time dateTime={p.created_at} className="lab-label text-smoke">
                    {formatDateTime(p.created_at)}
                  </time>
                  <p className="mt-1 font-mono text-[11px] text-smoke/80">#{p.id.slice(0, 8)}</p>
                </div>
                <div className="min-w-0 md:col-span-5">
                  <ul className="space-y-1">
                    {p.items.map((it) => (
                      <li key={it.id} className="flex items-baseline justify-between gap-3">
                        <span className="min-w-0 truncate text-[17px] font-medium tracking-tight">{it.title}</span>
                        {p.items.length > 1 && <span className="shrink-0 font-mono text-xs text-ash">{formatBRL(it.unit_price_cents)}</span>}
                      </li>
                    ))}
                  </ul>
                  <p className="lab-label mt-2 text-smoke">{KIND_LABEL[p.kind]}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 md:col-span-4 md:flex-col md:items-end">
                  <p className="font-mono text-lg text-bone">{formatBRL(p.total_cents)}</p>
                  <div className="flex flex-wrap gap-2 md:justify-end">
                    <PurchaseStatusBadge status={p.status} />
                    {p.is_simulated && (
                      <Badge tone="danger" title="Pagamento simulado em ambiente de desenvolvimento — nenhum valor foi cobrado.">
                        Simulada
                      </Badge>
                    )}
                  </div>
                  {p.status === "pending" && p.provider === "dev" && (
                    <Link href={`/checkout/simulado/${p.id}`} className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-signal hover:text-signal-hover">
                      Concluir pagamento simulado <ArrowRight className="size-4" aria-hidden />
                    </Link>
                  )}
                  {p.status === "pending" && p.provider === "mercadopago" && (
                    <Link href={`/checkout/retorno?compra=${p.id}`} className="inline-flex min-h-11 items-center gap-1.5 text-sm text-ash hover:text-bone">
                      Ver status do pagamento <ArrowRight className="size-4" aria-hidden />
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-6 max-w-xl text-sm text-smoke">Pedidos aparecem como pagos somente depois da confirmação do provedor de pagamento. Pedidos marcados como “Simulada” foram feitos no ambiente de desenvolvimento e não envolveram dinheiro.</p>
        </section>
      )}
    </div>
  );
}
