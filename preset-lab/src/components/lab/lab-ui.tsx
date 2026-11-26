import Link from "next/link";
import { AlertCircle, ArrowRight, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { PurchaseStatus, SubscriptionStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Título de seção dentro do My Lab. */
export function LabSectionTitle({ kicker, title, aside }: { kicker: string; title: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="lab-label text-smoke">{kicker}</p>
        <h2 className="display mt-3 text-[clamp(2.4rem,6vw,4.5rem)]">{title}</h2>
      </div>
      {aside}
    </div>
  );
}

export function Notice({ tone = "ok", children, className }: { tone?: "ok" | "danger" | "signal"; children: React.ReactNode; className?: string }) {
  const Icon = tone === "danger" ? AlertCircle : CheckCircle2;
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-3 rounded-[18px] border px-4 py-3.5 text-sm leading-relaxed",
        tone === "ok" && "border-ok/40 bg-ok/10 text-ok",
        tone === "danger" && "border-danger/40 bg-danger/10 text-danger",
        tone === "signal" && "border-signal/40 bg-signal/10 text-bone",
        className
      )}
    >
      <Icon className={cn("mt-0.5 size-4 shrink-0", tone === "signal" && "text-signal")} aria-hidden />
      <div>{children}</div>
    </div>
  );
}

export function EmptyState({ number, title, text, href, cta }: { number: string; title: React.ReactNode; text: string; href: string; cta: string }) {
  return (
    <div className="relative overflow-hidden rounded-[28px] border hairline bg-graphite px-6 py-14 md:px-12 md:py-20">
      <span aria-hidden className="display pointer-events-none absolute -right-4 -top-6 select-none text-[clamp(8rem,22vw,16rem)] text-bone/[0.04]">
        {number}
      </span>
      <div className="relative max-w-lg">
        <h3 className="display text-[clamp(2.2rem,5vw,3.75rem)]">{title}</h3>
        <p className="mt-4 text-[16px] leading-relaxed text-ash">{text}</p>
        <Button asChild size="lg" className="mt-8">
          <Link href={href}>
            {cta} <ArrowRight />
          </Link>
        </Button>
      </div>
    </div>
  );
}

export const PURCHASE_STATUS: Record<PurchaseStatus, { label: string; tone: "ok" | "warn" | "danger" | "neutral" }> = {
  pending: { label: "Pendente", tone: "warn" },
  paid: { label: "Pago", tone: "ok" },
  failed: { label: "Recusado", tone: "danger" },
  refunded: { label: "Reembolsado", tone: "neutral" },
  cancelled: { label: "Cancelado", tone: "neutral" },
};

export function PurchaseStatusBadge({ status }: { status: PurchaseStatus }) {
  const s = PURCHASE_STATUS[status];
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

export const SUBSCRIPTION_STATUS: Record<SubscriptionStatus, { label: string; tone: "ok" | "warn" | "danger" | "neutral" }> = {
  pending: { label: "Aguardando pagamento", tone: "warn" },
  active: { label: "Ativa", tone: "ok" },
  past_due: { label: "Pagamento atrasado", tone: "danger" },
  cancelled: { label: "Cancelada", tone: "neutral" },
  expired: { label: "Expirada", tone: "neutral" },
};

export function SubscriptionStatusBadge({ status }: { status: SubscriptionStatus }) {
  const s = SUBSCRIPTION_STATUS[status];
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

export const CHECKOUT_ERRORS: Record<string, string> = {
  not_found: "Compra não encontrada.",
  not_for_sale: "Este item não está à venda.",
  already_owned: "Você já possui este item. Ele está na sua biblioteca.",
  already_subscribed: "Sua assinatura Premium Club já está ativa.",
  rate_limited: "Muitas tentativas. Aguarde um minuto e tente de novo.",
  provider: "O provedor de pagamento não respondeu. Tente novamente em instantes.",
  forbidden: "O checkout simulado não está disponível neste ambiente.",
};
