import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CheckCircle2, Clock, RefreshCw, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { repo } from "@/lib/repo";
import type { Purchase } from "@/lib/types";
import { uuidSchema } from "@/lib/validation/schemas";
import { formatBRL } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Status do pagamento", robots: { index: false, follow: false } };

/** Para onde mandar o usuário que quer tentar de novo. */
async function retryHref(p: Purchase) {
  const it = p.items[0];
  if (p.kind === "subscription") return "/lab/assinatura";
  if (it?.product_id) {
    const prod = await repo().getProductById(it.product_id);
    if (prod) return `/presets/${prod.slug}`;
  }
  if (it?.collection_id) {
    const c = await repo().getCollectionById(it.collection_id);
    if (c && c.status === "published") return `/colecoes/${c.slug}`;
  }
  return "/presets";
}

/**
 * Retorno do pagamento. Esta página SÓ EXIBE o status — nunca libera nada.
 * A liberação acontece exclusivamente no servidor (webhook do Mercado Pago ou checkout simulado).
 */
export default async function CheckoutReturnPage({ searchParams }: { searchParams: Promise<{ compra?: string }> }) {
  const { compra } = await searchParams;
  const id = typeof compra === "string" ? compra : "";
  const user = await requireUser(`/checkout/retorno?compra=${encodeURIComponent(id)}`);
  if (!uuidSchema.safeParse(id).success) notFound();
  const p = await repo().getPurchase(id);
  if (!p || p.user_id !== user.id) notFound();

  const self = `/checkout/retorno?compra=${p.id}`;
  const summary = (
    <div className="mt-10 rounded-[22px] border hairline bg-graphite p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="lab-label text-smoke">Pedido #{p.id.slice(0, 8)}</p>
        {p.is_simulated && <Badge tone="danger">Simulada</Badge>}
      </div>
      <ul className="mt-4 space-y-1">
        {p.items.map((it) => (
          <li key={it.id} className="text-[17px] font-medium tracking-tight">
            {it.title}
          </li>
        ))}
      </ul>
      <p className="mt-3 font-mono text-ash">{formatBRL(p.total_cents)}</p>
    </div>
  );

  let content: React.ReactNode;
  if (p.status === "paid") {
    content = (
      <>
        <CheckCircle2 className="size-10 text-ok" aria-hidden />
        <h1 className="display mt-6 text-[clamp(3rem,9vw,7rem)]" data-testid="payment-status">
          Pagamento <span className="serif-accent text-ok">confirmado</span>
        </h1>
        <p className="mt-6 text-[17px] leading-relaxed text-ash">{p.kind === "subscription" ? "Seu Premium Club está ativo. Os presets do Club já aparecem na sua biblioteca." : "Tudo certo. Seus presets já estão na sua biblioteca, prontos para baixar."}</p>
        <Button asChild size="lg" className="mt-8">
          <Link href="/lab">
            Ir para a biblioteca <ArrowRight />
          </Link>
        </Button>
      </>
    );
  } else if (p.status === "pending") {
    content = (
      <>
        <Clock className="size-10 text-signal" aria-hidden />
        <h1 className="display mt-6 text-[clamp(3rem,9vw,7rem)]" data-testid="payment-status">
          Aguardando <span className="serif-accent text-signal">confirmação</span>
        </h1>
        <p className="mt-6 text-[17px] leading-relaxed text-ash">Aguardando confirmação do Mercado Pago (PIX pode levar alguns minutos). Assim que o pagamento for confirmado, o item é liberado automaticamente na sua biblioteca.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href={self} prefetch={false}>
              <RefreshCw /> Atualizar
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/lab/compras">Minhas compras</Link>
          </Button>
        </div>
      </>
    );
  } else {
    const retry = await retryHref(p);
    content = (
      <>
        <XCircle className="size-10 text-danger" aria-hidden />
        <h1 className="display mt-6 text-[clamp(3rem,9vw,7rem)]" data-testid="payment-status">
          Pagamento <span className="serif-accent text-danger">{p.status === "failed" ? "não aprovado" : p.status === "refunded" ? "reembolsado" : "cancelado"}</span>
        </h1>
        <p className="mt-6 text-[17px] leading-relaxed text-ash">{p.status === "failed" ? "O pagamento foi recusado e nada foi cobrado. Você pode tentar de novo com outro meio de pagamento." : "Este pedido não está ativo. Se quiser, faça um novo pedido."}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href={retry}>
              Tentar de novo <ArrowRight />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/lab/compras">Minhas compras</Link>
          </Button>
        </div>
      </>
    );
  }

  return (
    <div className="container-lab py-14 md:py-20">
      <div className="mx-auto max-w-2xl">
        <p className="lab-label text-smoke">Checkout · Retorno</p>
        <div className="mt-6">{content}</div>
        {summary}
      </div>
    </div>
  );
}
