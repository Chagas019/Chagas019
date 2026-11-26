import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CheckCircle2, FlaskConical } from "lucide-react";
import { simulatePaymentAction } from "@/app/actions/library";
import { SubmitButton } from "@/components/forms/submit-button";
import { PurchaseStatusBadge } from "@/components/lab/lab-ui";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { config } from "@/lib/config";
import { repo } from "@/lib/repo";
import { uuidSchema } from "@/lib/validation/schemas";
import { formatBRL, formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Checkout simulado", robots: { index: false, follow: false } };

export default async function SimulatedCheckoutPage({ params }: { params: Promise<{ purchaseId: string }> }) {
  const { purchaseId } = await params;
  if (config.payments !== "dev") notFound();
  const user = await requireUser(`/checkout/simulado/${purchaseId}`);
  if (!uuidSchema.safeParse(purchaseId).success) notFound();
  const purchase = await repo().getPurchase(purchaseId);
  if (!purchase || purchase.user_id !== user.id || purchase.provider !== "dev") notFound();

  return (
    <div className="pb-24">
      <div role="alert" className="border-y-2 border-signal bg-signal text-signal-ink">
        <div className="container-lab flex items-start gap-3 py-4 md:items-center">
          <FlaskConical className="mt-0.5 size-5 shrink-0 md:mt-0" aria-hidden />
          <p className="display text-[clamp(1.25rem,3.2vw,2rem)] leading-[0.95]" data-testid="dev-checkout-warning">
            Ambiente de desenvolvimento — nenhum pagamento real será feito
          </p>
        </div>
      </div>

      <div className="container-lab grid gap-10 pt-10 md:pt-14 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <p className="lab-label text-signal">Checkout simulado · pedido #{purchase.id.slice(0, 8)}</p>
          <h1 className="display mt-4 text-[clamp(3rem,9vw,7rem)]">
            Resumo do <span className="serif-accent text-signal">pedido</span>
          </h1>
          <p className="mt-6 max-w-lg text-[16px] leading-relaxed text-ash">
            Esta tela substitui o Mercado Pago enquanto o projeto roda em modo de desenvolvimento. Aprovar aqui usa exatamente o mesmo fluxo de confirmação do pagamento real — mas nenhum valor é cobrado e a compra fica marcada como <strong className="text-bone">simulada</strong>.
          </p>
        </div>

        <div className="lg:col-span-5">
          <div className="rounded-[28px] border hairline bg-graphite p-6 md:p-8">
            <div className="flex items-center justify-between gap-3">
              <p className="lab-label text-smoke">{formatDateTime(purchase.created_at)}</p>
              <PurchaseStatusBadge status={purchase.status} />
            </div>
            <ul className="mt-6 border-t hairline">
              {purchase.items.map((it) => (
                <li key={it.id} className="flex items-baseline justify-between gap-4 border-b hairline py-4">
                  <span className="min-w-0 text-[17px] font-medium tracking-tight">{it.title}</span>
                  <span className="shrink-0 font-mono text-sm text-ash">{formatBRL(it.unit_price_cents)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-5 flex items-baseline justify-between">
              <span className="lab-label text-smoke">Total</span>
              <span className="display text-5xl" data-testid="checkout-total">
                {formatBRL(purchase.total_cents)}
              </span>
            </div>

            {purchase.status === "pending" ? (
              <div className="mt-8 grid gap-3">
                <form action={simulatePaymentAction}>
                  <input type="hidden" name="purchaseId" value={purchase.id} />
                  <input type="hidden" name="outcome" value="approve" />
                  <SubmitButton size="lg" className="w-full" pendingLabel="Processando…" data-testid="simulate-approve">
                    Aprovar pagamento simulado
                  </SubmitButton>
                </form>
                <form action={simulatePaymentAction}>
                  <input type="hidden" name="purchaseId" value={purchase.id} />
                  <input type="hidden" name="outcome" value="reject" />
                  <SubmitButton size="lg" variant="danger" className="w-full" pendingLabel="Processando…" data-testid="simulate-reject">
                    Recusar
                  </SubmitButton>
                </form>
              </div>
            ) : purchase.status === "paid" ? (
              <div className="mt-8">
                <p className="flex items-center gap-2 text-ok">
                  <CheckCircle2 className="size-5" aria-hidden /> Pagamento simulado aprovado em {formatDateTime(purchase.paid_at)}.
                </p>
                <Button asChild size="lg" className="mt-5 w-full">
                  <Link href="/lab">
                    Ir para a biblioteca <ArrowRight />
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="mt-8">
                <p className="text-ash">Este pedido não está mais aguardando pagamento.</p>
                <Button asChild size="lg" variant="outline" className="mt-5 w-full">
                  <Link href="/lab/compras">Ver minhas compras</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
